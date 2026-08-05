"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { requireActiveUser } from "@/lib/auth/server";

export async function createEvidenceAccessAction(evidenceId: string): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(evidenceId)) return { ok: false, message: "Invalid evidence record." };
  const identity = await requireActiveUser("/paired-testing-demo/evidence");
  const supabase = await createClient();
  const { data: evidence, error } = await supabase.from("evidence_files").select("storage_bucket,storage_path,uploaded_by").eq("id", evidenceId).maybeSingle();
  if (error || !evidence) return { ok: false, message: "You are not authorized to access this evidence." };
  if (identity.profile.role === "law_firm_viewer" || (identity.profile.role === "tester" && evidence.uploaded_by !== identity.user.id)) {
    return { ok: false, message: "You are not authorized to open this evidence file." };
  }
  if (!isSupabaseAdminConfigured()) return { ok: false, message: "Secure evidence access is not configured." };
  const admin = createAdminClient();
  const { data, error: signedError } = await admin.storage.from(evidence.storage_bucket).createSignedUrl(evidence.storage_path, 60);
  if (signedError || !data.signedUrl) return { ok: false, message: "A secure evidence link could not be created." };
  return { ok: true, url: data.signedUrl };
}
