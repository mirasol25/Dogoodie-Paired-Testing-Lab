"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, LoaderCircle, MailPlus, Search, ShieldAlert, UserRoundCog } from "lucide-react";
import { toast } from "sonner";
import { inviteAccountAction, updateAccountAction } from "@/app/paired-testing-demo/admin/accounts/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AccountStatus, AppRole, ManagedAccount } from "@/lib/data/profiles";

const roleLabels: Record<AppRole, string> = {
  admin: "Administrator",
  test_coordinator: "Test Coordinator",
  tester: "Tester",
  expert_reviewer: "Expert Reviewer",
  law_firm_viewer: "Viewer",
};

const statusLabels: Record<AccountStatus, string> = {
  pending: "Pending",
  active: "Active",
  disabled: "Disabled",
};

function InviteAccountDialog({ configured }: { configured: boolean }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<AppRole>("tester");
  const [pending, startTransition] = useTransition();

  function invite() {
    startTransition(async () => {
      const result = await inviteAccountAction({ email, displayName, role });
      if (result.ok) {
        toast.success(result.message);
        setEmail("");
        setDisplayName("");
        setRole("tester");
        setOpen(false);
      } else toast.error(result.message);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={!configured}><MailPlus className="size-4" />Invite user</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite an internal user</DialogTitle>
          <DialogDescription>Supabase will email a one-time link for the user to create their password.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="invite-name">Display name</Label>
            <Input id="invite-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="off" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email address</Label>
            <Input id="invite-email" value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoCapitalize="none" spellCheck={false} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as AppRole)}>
              <SelectTrigger id="invite-role" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(roleLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline" disabled={pending}>Cancel</Button></DialogClose>
          <Button onClick={invite} disabled={pending || !email.trim() || !displayName.trim()}>
            {pending ? <LoaderCircle className="size-4 animate-spin" /> : <MailPlus className="size-4" />}
            {pending ? "Sending..." : "Send invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AccountRow({ account, isCurrent }: { account: ManagedAccount; isCurrent: boolean }) {
  const [displayName, setDisplayName] = useState(account.displayName ?? "");
  const [role, setRole] = useState<AppRole>(account.role);
  const [status, setStatus] = useState<AccountStatus>(account.accountStatus);
  const [pending, startTransition] = useTransition();
  const changed = displayName.trim() !== (account.displayName ?? "") || role !== account.role || status !== account.accountStatus;

  function save() {
    startTransition(async () => {
      const result = await updateAccountAction({
        userId: account.id,
        displayName: displayName.trim() || null,
        role,
        accountStatus: status,
      });
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <TableRow>
      <TableCell className="min-w-64 whitespace-normal py-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md border border-border bg-secondary text-muted-foreground">
            <UserRoundCog className="size-4" />
          </span>
          <div className="min-w-0">
            <Input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              disabled={isCurrent || pending}
              aria-label={`Display name for ${account.email}`}
              placeholder="Display name"
              className="h-8 max-w-64"
            />
            <p className="mt-1.5 break-all text-xs text-muted-foreground">{account.email}</p>
            {isCurrent ? <Badge variant="outline" className="mt-2">Your account</Badge> : null}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Select value={role} onValueChange={(value) => setRole(value as AppRole)} disabled={isCurrent || pending}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(roleLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select value={status} onValueChange={(value) => setStatus(value as AccountStatus)} disabled={isCurrent || pending}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(account.createdAt))}</TableCell>
      <TableCell className="text-right">
        <Button size="sm" onClick={save} disabled={isCurrent || pending || !changed}>
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
          Save
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function AccountsManager({
  accounts,
  currentUserId,
  invitationsConfigured,
}: {
  accounts: ManagedAccount[];
  currentUserId: string;
  invitationsConfigured: boolean;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return accounts;
    return accounts.filter((account) =>
      account.email.toLowerCase().includes(normalized)
      || account.displayName?.toLowerCase().includes(normalized)
      || roleLabels[account.role].toLowerCase().includes(normalized));
  }, [accounts, query]);

  return (
    <div className="space-y-4">
      <Alert variant={invitationsConfigured ? "default" : "destructive"}>
        <ShieldAlert />
        <AlertTitle>{invitationsConfigured ? "Internal accounts only" : "Invitations need configuration"}</AlertTitle>
        <AlertDescription>
          {invitationsConfigured
            ? "Invited users remain Pending until they create a password from their one-time email link."
            : "Add SUPABASE_SECRET_KEY to the server environment to enable secure email invitations."}
        </AlertDescription>
      </Alert>

      <div className="flex flex-col gap-3 border-y border-border/70 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search accounts" className="pl-9" />
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground">{filtered.length} of {accounts.length} accounts</p>
          <InviteAccountDialog configured={invitationsConfigured} />
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-border/80">
        <Table>
          <TableHeader className="bg-secondary/45">
            <TableRow>
              <TableHead>Account</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((account) => <AccountRow key={`${account.id}-${account.updatedAt}`} account={account} isCurrent={account.id === currentUserId} />)}
            {filtered.length === 0 ? <TableRow><TableCell colSpan={5} className="h-28 text-center text-muted-foreground">No accounts match this search.</TableCell></TableRow> : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
