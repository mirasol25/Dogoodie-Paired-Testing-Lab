"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { appRoleSchema, inviteAccountSchema } from "@/lib/validation/account-schemas";
import { invitationMetadata } from "@/lib/auth/invitations";

const accountUpdateSchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string().trim().max(100).nullable(),
  accountStatus: z.enum(["pending", "active", "disabled"]),
  role: appRoleSchema,
});

export interface AccountUpdateResult {
  ok: boolean;
  message: string;
}

function getApplicationOrigin(requestHeaders: Headers): string {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredUrl) return new URL(configuredUrl).origin;

  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") || "http";
  if (!host) throw new Error("The application URL is not configured.");
  return new URL(`${protocol}://${host}`).origin;
}

export async function inviteAccountAction(input: unknown): Promise<AccountUpdateResult> {
  const identity = await requireRole("admin", "/paired-testing-demo/admin/accounts");
  const parsed = inviteAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "The invitation details are invalid." };
  }
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, message: "Add SUPABASE_SECRET_KEY to the server environment before sending invitations." };
  }

  const requestHeaders = await headers();
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: invitationMetadata(parsed.data.displayName),
    redirectTo: `${getApplicationOrigin(requestHeaders)}/auth/confirm`,
  });

  if (error || !data.user) {
    const duplicate = error?.message.toLowerCase().includes("already") || error?.message.toLowerCase().includes("registered");
    return { ok: false, message: duplicate ? "An account already exists for this email address." : "Supabase could not send the invitation." };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ display_name: parsed.data.displayName, account_status: "pending" })
    .eq("id", data.user.id)
    .select("id")
    .single();
  const { error: roleError } = await admin
    .from("user_roles")
    .update({ role: parsed.data.role, assigned_by: identity.user.id, assigned_at: new Date().toISOString() })
    .eq("user_id", data.user.id)
    .select("user_id")
    .single();

  if (profileError || roleError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { ok: false, message: "The invitation was cancelled because its internal profile could not be configured." };
  }

  revalidatePath("/paired-testing-demo/admin/accounts");
  return { ok: true, message: `Invitation sent to ${parsed.data.email}.` };
}

export async function resendAccountInvitationAction(input: unknown): Promise<AccountUpdateResult> {
  await requireRole("admin", "/paired-testing-demo/admin/accounts");
  const parsed = z.object({ userId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "The selected account is invalid." };
  if (!isSupabaseAdminConfigured()) return { ok: false, message: "Secure invitations are not configured." };

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("email,display_name,account_status")
    .eq("id", parsed.data.userId)
    .maybeSingle();
  if (profileError || !profile) return { ok: false, message: "The selected account no longer exists." };
  if (profile.account_status !== "pending") return { ok: false, message: "Only pending accounts can receive another invitation." };

  const requestHeaders = await headers();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(profile.email, {
    data: invitationMetadata(profile.display_name || profile.email),
    redirectTo: `${getApplicationOrigin(requestHeaders)}/auth/confirm`,
  });
  if (error || !data.user) return { ok: false, message: error?.message || "Supabase could not resend the invitation." };

  revalidatePath("/paired-testing-demo/admin/accounts");
  return { ok: true, message: `A new invitation was sent to ${profile.email}.` };
}

export async function updateAccountAction(input: unknown): Promise<AccountUpdateResult> {
  const identity = await requireRole("admin", "/paired-testing-demo/admin/accounts");
  const parsed = accountUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "The account changes are invalid." };

  if (parsed.data.userId === identity.user.id) {
    return { ok: false, message: "Use another administrator to change your own role or account status." };
  }

  const supabase = await createClient();
  const { data: target, error: targetError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", parsed.data.userId)
    .maybeSingle();

  if (targetError || !target) return { ok: false, message: "The selected account no longer exists." };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName || null,
      account_status: parsed.data.accountStatus,
    })
    .eq("id", parsed.data.userId);

  if (profileError) return { ok: false, message: "The profile could not be updated." };

  const { error: roleError } = await supabase
    .from("user_roles")
    .update({
      role: parsed.data.role,
      assigned_by: identity.user.id,
      assigned_at: new Date().toISOString(),
    })
    .eq("user_id", parsed.data.userId);

  if (roleError) return { ok: false, message: roleError.message || "The account role could not be updated." };

  revalidatePath("/paired-testing-demo/admin/accounts");
  revalidatePath("/paired-testing-demo", "layout");
  return { ok: true, message: "Account updated." };
}
