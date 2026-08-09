"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, ClipboardCheck, Columns2, FileArchive, FileText, History,
  ChevronRight, Home, LayoutDashboard, LogOut, Menu, ShieldCheck, UserRoundCog, Users,
} from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { demoConfig } from "@/config/paired-testing-demo.config";
import { cn } from "@/lib/utils";
import type { NavigationItem } from "@/types/paired-testing-demo.types";

const icons = { Activity, ClipboardCheck, Columns2, FileArchive, FileText, History, Home, LayoutDashboard, Users };

export interface AppShellUser {
  email: string;
  displayName: string | null;
  role: "admin" | "test_coordinator" | "tester" | "expert_reviewer" | "law_firm_viewer";
}

export interface AppShellStudy {
  id: string;
  code: string;
  name: string;
  status: "draft" | "active" | "paused" | "completed" | "archived";
  currency: string | null;
  serviceLabel?: string | null;
  timezone?: string;
  testingStartsAt?: string | null;
  testingEndsAt?: string | null;
  workload?: { studyId: string; total: number; pending: number; flagged: number };
}

const roleLabels: Record<AppShellUser["role"], string> = {
  admin: "Administrator",
  test_coordinator: "Test Coordinator",
  tester: "Tester",
  expert_reviewer: "Expert Reviewer",
  law_firm_viewer: "Law-Firm Viewer",
};

function AccountPanel({ user, compact = false }: { user: AppShellUser; compact?: boolean }) {
  return (
    <div className={cn(!compact && "rounded-lg border border-border/80 bg-secondary/35 p-3")}>
      {!compact ? (
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-foreground">{user.displayName || user.email}</p>
          {user.displayName ? <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{user.email}</p> : null}
          <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-primary">{roleLabels[user.role]}</p>
        </div>
      ) : null}
      {!compact && user.role === "admin" ? (
        <Button asChild variant="ghost" size="sm" className="mt-3 w-full justify-start text-muted-foreground hover:text-foreground">
          <Link href="/admin/accounts">
            <Users className="size-3.5" />
            Manage accounts
          </Link>
        </Button>
      ) : null}
      {!compact ? (
        <Button asChild variant="ghost" size="sm" className="mt-1 w-full justify-start text-muted-foreground hover:text-foreground">
          <Link href="/device-profile"><UserRoundCog className="size-3.5" />Device profile</Link>
        </Button>
      ) : null}
      <form action={signOutAction} className={cn(!compact && "mt-3")}>
        <Button
          type="submit"
          variant="ghost"
          size={compact ? "icon-sm" : "sm"}
          className={cn("text-muted-foreground hover:text-foreground", !compact && "w-full justify-start")}
        >
          <LogOut className="size-3.5" />
          {!compact ? "Sign out" : <span className="sr-only">Sign out</span>}
        </Button>
      </form>
    </div>
  );
}

function Navigation({ role, onNavigate }: { role: AppShellUser["role"]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const allowedPaths: Partial<Record<AppShellUser["role"], string[]>> = {
    tester: ["/", "/assignments"],
    expert_reviewer: [
      "/", "/dashboard", "/protocol", "/pairs", "/evidence", "/audit", "/reports",
    ],
    law_firm_viewer: [
      "/", "/dashboard", "/protocol", "/pairs", "/evidence", "/audit", "/reports",
    ],
  };
  const items = allowedPaths[role]
    ? demoConfig.navigation.filter((item) => allowedPaths[role]?.includes(item.href))
    : demoConfig.navigation;
  return (
    <nav aria-label="Primary navigation" className="space-y-1">
      {items.map((item: NavigationItem) => {
        const Icon = icons[item.icon as keyof typeof icons] ?? Activity;
        const active = item.href === "/"
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex min-h-9 items-center gap-3 rounded-md border border-transparent px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
              active && "border-primary/15 bg-primary/[0.085] text-primary",
            )}
          >
            <Icon className="size-4 shrink-0" strokeWidth={1.7} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3 rounded-md">
      <span className="grid size-9 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
        <ShieldCheck className="size-5" strokeWidth={1.8} />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.19em] text-primary">DoGoodie</span>
        <span className="block truncate text-sm font-semibold text-foreground">Paired Testing Lab</span>
      </span>
    </Link>
  );
}

export function AppShell({ children, user, activeStudy }: { children: React.ReactNode; user: AppShellUser; activeStudy: AppShellStudy | null }) {
  const pathname = usePathname();
  const current = demoConfig.navigation.find((item) =>
    item.href === "/" ? pathname === item.href : pathname.startsWith(item.href));
  return (
    <div className="min-h-screen">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border/80 bg-[#08120e]/95 p-4 backdrop-blur-xl lg:flex lg:flex-col">
        <Brand />
        <Link href={user.role === "tester" ? "/tester-studies" : user.role === "expert_reviewer" ? "/review-studies" : user.role === "law_firm_viewer" ? "/view-studies" : "/studies"} className="group mt-6 block rounded-md border border-border/80 bg-secondary/40 p-3 transition-colors hover:border-primary/35 hover:bg-secondary/65">
          <div className="flex items-center justify-between gap-2">
            <span className="mono truncate text-[10px] text-primary">{activeStudy?.code ?? "NO STUDY"}</span>
            <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </div>
          <p className="mt-2 line-clamp-2 text-xs font-medium leading-5 text-foreground">{activeStudy?.name ?? (user.role === "law_firm_viewer" ? "No finalized study available" : "Select or create a study")}</p>
          <p className="mt-1 text-[10px] capitalize leading-4 text-muted-foreground">{activeStudy ? `${activeStudy.status} · ${activeStudy.currency ?? "Currency pending"}` : user.role === "law_firm_viewer" ? "Completed or archived studies only" : "Study management"}</p>
          {activeStudy?.serviceLabel ? <p className="mt-2 truncate text-[10px] font-medium text-primary" title={activeStudy.serviceLabel}>{activeStudy.serviceLabel}</p> : null}
        </Link>
        <div className={cn("flex-1 overflow-y-auto", user.role === "tester" ? "mt-8" : "mt-5")}><Navigation role={user.role} /></div>
        <div className="space-y-3 border-t border-border/70 pt-4">
          <AccountPanel user={user} />
          <div className="flex items-center justify-between px-2 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
            <span>{demoConfig.product.badge}</span><span>{demoConfig.product.version}</span>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header role="banner" className="no-print sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/80 bg-background/88 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden"><Menu className="size-4" /><span className="sr-only">Open navigation</span></Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[290px] p-4">
                <SheetHeader className="px-0 pt-0"><SheetTitle className="sr-only">Application navigation</SheetTitle></SheetHeader>
                <Brand />
                {["admin", "test_coordinator"].includes(user.role) ? <Link href="/paired-testing-demo/studies" className="mt-6 block rounded-md border border-border/80 bg-secondary/40 p-3"><span className="mono text-[10px] text-primary">{activeStudy?.code ?? "NO STUDY"}</span><span className="mt-2 block text-xs font-medium">{activeStudy?.name ?? "Select or create a study"}</span>{activeStudy ? <span className="mt-1 block text-[10px] capitalize text-muted-foreground">{activeStudy.status} · {activeStudy.currency ?? "Currency pending"}</span> : <span className="mt-1 block text-[10px] text-muted-foreground">Study management</span>}{activeStudy?.serviceLabel ? <span className="mt-2 block truncate text-[10px] font-medium text-primary">{activeStudy.serviceLabel}</span> : null}</Link> : null}
                {user.role === "tester" ? <Link href="/paired-testing-demo/tester-studies" className="mt-6 block rounded-md border border-border/80 bg-secondary/40 p-3"><span className="mono text-[10px] text-primary">{activeStudy?.code ?? "NO STUDY"}</span><span className="mt-2 block text-xs font-medium">{activeStudy?.name ?? "Select an assigned study"}</span>{activeStudy?.serviceLabel ? <span className="mt-2 block truncate text-[10px] font-medium text-primary">{activeStudy.serviceLabel}</span> : null}</Link> : null}
                {user.role === "expert_reviewer" ? <Link href="/paired-testing-demo/review-studies" className="mt-6 block rounded-md border border-border/80 bg-secondary/40 p-3"><span className="mono text-[10px] text-primary">{activeStudy?.code ?? "NO STUDY"}</span><span className="mt-2 block text-xs font-medium">{activeStudy?.name ?? "Select an assigned study"}</span>{activeStudy?.serviceLabel ? <span className="mt-2 block truncate text-[10px] font-medium text-primary">{activeStudy.serviceLabel}</span> : null}</Link> : null}
                {user.role === "law_firm_viewer" ? <Link href="/paired-testing-demo/view-studies" className="mt-6 block rounded-md border border-border/80 bg-secondary/40 p-3"><span className="mono text-[10px] text-primary">{activeStudy?.code ?? "NO STUDY"}</span><span className="mt-2 block text-xs font-medium">{activeStudy?.name ?? "No finalized study available"}</span>{activeStudy?.serviceLabel ? <span className="mt-2 block truncate text-[10px] font-medium text-primary">{activeStudy.serviceLabel}</span> : null}</Link> : null}
                <div className="mt-6"><Navigation role={user.role} /></div>
                <div className="mt-6 border-t border-border pt-5"><AccountPanel user={user} /></div>
              </SheetContent>
            </Sheet>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{activeStudy?.code ?? "No study selected"}</p>
              <p className="text-sm font-medium text-foreground">{current?.label ?? "Matched Pair Review"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-md border border-teal-300/20 bg-teal-300/[0.06] px-2.5 py-1 text-[10px] font-medium text-teal-200 sm:inline-flex">Internal pilot</span>
            <span className="hidden max-w-52 truncate text-[11px] text-muted-foreground xl:inline">{user.displayName || user.email} · {roleLabels[user.role]}</span>
            <AccountPanel user={user} compact />
          </div>
        </header>
        <main id="main-content" className="box-border min-w-0 w-full max-w-[1600px] overflow-x-hidden p-4 sm:p-6 lg:mx-auto lg:p-7">
          {children}
        </main>
      </div>
    </div>
  );
}
