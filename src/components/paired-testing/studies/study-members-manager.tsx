"use client";

import { useMemo, useState, useTransition } from "react";
import { LoaderCircle, Search, UserCheck, UserMinus, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { addStudyMemberAction, setStudyMembershipStatusAction } from "@/app/paired-testing-demo/studies/[studyId]/members/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { EligibleStudyAccount, StudyMember } from "@/lib/data/study-members";
import type { AppRole } from "@/lib/data/profiles";

const roleLabels: Record<AppRole, string> = { admin: "Administrator", test_coordinator: "Coordinator", tester: "Tester", expert_reviewer: "Expert Reviewer", law_firm_viewer: "Law-Firm Viewer" };

export function StudyMembersManager({ studyId, members, eligibleAccounts, canManageCoordinators }: { studyId: string; members: StudyMember[]; eligibleAccounts: EligibleStudyAccount[]; canManageCoordinators: boolean }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("active");
  const [addOpen, setAddOpen] = useState(false);
  const [accountQuery, setAccountQuery] = useState("");
  const [accountRole, setAccountRole] = useState("all");
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [statusTarget, setStatusTarget] = useState<StudyMember | null>(null);
  const [pending, startTransition] = useTransition();
  const visibleMembers = useMemo(() => members.filter((member) => {
    const haystack = `${member.display_name ?? ""} ${member.email}`.toLocaleLowerCase();
    return haystack.includes(query.toLocaleLowerCase()) && (role === "all" || member.study_role === role) && (status === "all" || member.membership_status === status);
  }), [members, query, role, status]);
  const visibleAccounts = useMemo(() => eligibleAccounts.filter((account) => (canManageCoordinators || account.role !== "test_coordinator") && (accountRole === "all" || account.role === accountRole) && `${account.display_name ?? ""} ${account.email} ${roleLabels[account.role]}`.toLocaleLowerCase().includes(accountQuery.toLocaleLowerCase())), [accountQuery, accountRole, canManageCoordinators, eligibleAccounts]);
  const counts = { coordinators: members.filter((item) => item.study_role === "test_coordinator" && item.membership_status === "active").length, testers: members.filter((item) => item.study_role === "tester" && item.membership_status === "active").length, reviewers: members.filter((item) => item.study_role === "expert_reviewer" && item.membership_status === "active").length, viewers: members.filter((item) => item.study_role === "law_firm_viewer" && item.membership_status === "active").length };

  function add() {
    if (!selectedAccountIds.length) return;
    startTransition(async () => {
      const result = await addStudyMemberAction({ studyId, userIds: selectedAccountIds });
      if (result.ok) { setAddOpen(false); setSelectedAccountIds([]); toast.success(result.message); }
      else toast.error(result.message);
    });
  }

  function toggleAccount(userId: string, checked: boolean) {
    setSelectedAccountIds((current) => checked ? [...current, userId] : current.filter((id) => id !== userId));
  }

  function changeStatus() {
    if (!statusTarget) return;
    const nextStatus = statusTarget.membership_status === "active" ? "removed" : "active";
    startTransition(async () => {
      const result = await setStudyMembershipStatusAction({ studyId, userId: statusTarget.user_id, status: nextStatus });
      if (result.ok) { setStatusTarget(null); toast.success(result.message); }
      else toast.error(result.message);
    });
  }

  return <div className="space-y-6"><div className="grid divide-y divide-border border-y border-border sm:grid-cols-4 sm:divide-x sm:divide-y-0">{[["Coordinators", counts.coordinators], ["Testers", counts.testers], ["Reviewers", counts.reviewers], ["Viewers", counts.viewers]].map(([label, count]) => <div key={label} className="py-4 sm:px-4 sm:first:pl-0"><p className="text-[10px] text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold">{count}</p></div>)}</div>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="label-kicker">Authorized users</p><h2 className="mt-1.5 text-lg font-semibold">Membership</h2><p className="mt-1 text-xs text-muted-foreground">{canManageCoordinators ? "Administrators manage coordinators and operational members." : "You can manage testers, reviewers, and viewers. Coordinator access is controlled by an Administrator."}</p></div><Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) { setSelectedAccountIds([]); setAccountQuery(""); setAccountRole("all"); } }}><DialogTrigger asChild><Button><UserPlus className="size-4" />Add members</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Add study members</DialogTitle><DialogDescription>Select one or more active accounts. Each account keeps its existing global role as its study role.</DialogDescription></DialogHeader><div className="space-y-3"><div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_170px]"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={accountQuery} onChange={(event) => setAccountQuery(event.target.value)} placeholder="Search name or email" className="pl-9" /></div><Select value={accountRole} onValueChange={setAccountRole}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All roles</SelectItem>{canManageCoordinators ? <SelectItem value="test_coordinator">Coordinators</SelectItem> : null}<SelectItem value="tester">Testers</SelectItem><SelectItem value="expert_reviewer">Reviewers</SelectItem><SelectItem value="law_firm_viewer">Viewers</SelectItem></SelectContent></Select></div><div className="flex min-h-7 items-center justify-between"><p className="text-xs text-muted-foreground">{selectedAccountIds.length} selected</p>{selectedAccountIds.length ? <Button type="button" variant="ghost" size="xs" onClick={() => setSelectedAccountIds([])}>Clear</Button> : null}</div><div className="max-h-64 divide-y divide-border overflow-y-auto rounded-md border border-border">{visibleAccounts.map((account) => { const selected = selectedAccountIds.includes(account.user_id); return <label key={account.user_id} className={`flex cursor-pointer items-center gap-3 px-3 py-3 hover:bg-secondary ${selected ? "bg-primary/10" : ""}`}><Checkbox checked={selected} onCheckedChange={(checked) => toggleAccount(account.user_id, checked === true)} /><span className="grid size-8 shrink-0 place-items-center rounded-md bg-secondary"><Users className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{account.display_name || account.email}</span><span className="block truncate text-xs text-muted-foreground">{account.email}</span></span><Badge variant="outline">{roleLabels[account.role]}</Badge></label>; })}{!visibleAccounts.length ? <p className="p-6 text-center text-sm text-muted-foreground">No eligible active accounts match this role.</p> : null}</div></div><DialogFooter><DialogClose asChild><Button variant="outline" disabled={pending}>Cancel</Button></DialogClose><Button onClick={add} disabled={!selectedAccountIds.length || pending}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <UserPlus className="size-4" />}{pending ? "Adding..." : `Add ${selectedAccountIds.length || ""} ${selectedAccountIds.length === 1 ? "member" : "members"}`}</Button></DialogFooter></DialogContent></Dialog></div>
    <div className="flex flex-wrap gap-2"><div className="relative min-w-64 flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search members" className="pl-9" /></div><Select value={role} onValueChange={setRole}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All roles</SelectItem><SelectItem value="test_coordinator">Coordinators</SelectItem><SelectItem value="tester">Testers</SelectItem><SelectItem value="expert_reviewer">Reviewers</SelectItem><SelectItem value="law_firm_viewer">Viewers</SelectItem></SelectContent></Select><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="invited">Invited</SelectItem><SelectItem value="removed">Removed</SelectItem></SelectContent></Select></div>
    <div className="overflow-hidden rounded-md border border-border"><Table><TableHeader className="bg-secondary/45"><TableRow><TableHead>Member</TableHead><TableHead>Study role</TableHead><TableHead>Status</TableHead><TableHead>Added by</TableHead><TableHead>Added</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{visibleMembers.map((member) => <TableRow key={member.user_id}><TableCell className="min-w-56 whitespace-normal"><p className="font-medium">{member.display_name || member.email}</p><p className="mt-1 text-xs text-muted-foreground">{member.email}</p></TableCell><TableCell><Badge variant="outline">{roleLabels[member.study_role]}</Badge></TableCell><TableCell><Badge variant={member.membership_status === "active" ? "secondary" : "outline"} className="capitalize">{member.membership_status}</Badge></TableCell><TableCell className="text-xs text-muted-foreground">{member.added_by_name || "System"}</TableCell><TableCell className="text-xs text-muted-foreground">{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(member.created_at))}</TableCell><TableCell className="text-right">{member.study_role === "test_coordinator" && !canManageCoordinators ? <span className="text-xs text-muted-foreground">Admin managed</span> : <Button size="sm" variant={member.membership_status === "active" ? "destructive" : "outline"} onClick={() => setStatusTarget(member)}>{member.membership_status === "active" ? <UserMinus className="size-3.5" /> : <UserCheck className="size-3.5" />}{member.membership_status === "active" ? "Remove" : "Restore"}</Button>}</TableCell></TableRow>)}{!visibleMembers.length ? <TableRow><TableCell colSpan={6} className="h-28 text-center text-sm text-muted-foreground">No members match these filters.</TableCell></TableRow> : null}</TableBody></Table></div>
    <Dialog open={Boolean(statusTarget)} onOpenChange={(open) => { if (!open) setStatusTarget(null); }}><DialogContent><DialogHeader><DialogTitle>{statusTarget?.membership_status === "active" ? "Remove study member?" : "Restore study member?"}</DialogTitle><DialogDescription>{statusTarget?.membership_status === "active" ? `${statusTarget.display_name || statusTarget.email} will lose access to this study. Their system account will remain active.` : `${statusTarget?.display_name || statusTarget?.email} will regain access with the ${statusTarget ? roleLabels[statusTarget.study_role] : "existing"} role.`}</DialogDescription></DialogHeader><DialogFooter><DialogClose asChild><Button variant="outline" disabled={pending}>Cancel</Button></DialogClose><Button variant={statusTarget?.membership_status === "active" ? "destructive" : "default"} onClick={changeStatus} disabled={pending}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : statusTarget?.membership_status === "active" ? <UserMinus className="size-4" /> : <UserCheck className="size-4" />}{pending ? "Updating..." : statusTarget?.membership_status === "active" ? "Remove access" : "Restore access"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
