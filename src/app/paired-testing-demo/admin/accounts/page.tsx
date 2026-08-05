import { AccountsManager } from "@/components/paired-testing/admin/accounts-manager";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { requireRole } from "@/lib/auth/server";
import { listManagedAccounts } from "@/lib/data/profiles";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export default async function AccountsPage() {
  const { user } = await requireRole("admin", "/paired-testing-demo/admin/accounts");
  const accounts = await listManagedAccounts();

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
