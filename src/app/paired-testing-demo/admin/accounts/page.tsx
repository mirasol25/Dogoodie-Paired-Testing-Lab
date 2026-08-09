import { AccountsManager } from "@/components/paired-testing/admin/accounts-manager";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { requireRole } from "@/lib/auth/server";
import { listManagedAccounts } from "@/lib/data/profiles";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { invitationExpiresAt, invitationIsExpired } from "@/lib/auth/invitations";

export default async function AccountsPage() {
  const { user } = await requireRole("admin", "/paired-testing-demo/admin/accounts");
  const accounts = await listManagedAccounts();
  if (isSupabaseAdminConfigured()) {
    const { data } = await createAdminClient().auth.admin.listUsers({ page: 1, perPage: 1000 });
    const authUsers = new Map((data?.users ?? []).map((authUser) => [authUser.id, authUser]));
    for (const account of accounts) {
      const authUser = authUsers.get(account.id);
      if (account.accountStatus !== "pending" || !authUser || authUser.user_metadata.password_setup_required !== true) continue;
      account.invitationExpiresAt = invitationExpiresAt(authUser);
      account.invitationExpired = invitationIsExpired(account.invitationExpiresAt);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Manage accounts"
        description="Activate internal accounts and assign the minimum role each person needs. New Auth users are created in Supabase until secure invitations are configured."
      />
      <AccountsManager
        accounts={accounts}
        currentUserId={user.id}
        invitationsConfigured={isSupabaseAdminConfigured()}
      />
    </div>
  );
}
