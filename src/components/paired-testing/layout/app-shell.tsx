"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Activity, BookOpen, ClipboardCheck, Columns2, FileArchive, FileText, History,
  Home, LayoutDashboard, LogOut, Menu, UserRoundCog, Users,
} from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { demoConfig } from "@/config/paired-testing-demo.config";
import { cn } from "@/lib/utils";
import type { NavigationItem } from "@/types/paired-testing-demo.types";
import { DashboardScopeSelector } from "@/components/paired-testing/dashboard/dashboard-scope-selector";

const icons = { Activity, BookOpen, ClipboardCheck, Columns2, FileArchive, FileText, History, Home, LayoutDashboard, Users };

function NavigationIndicator() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pendingDestination, setPendingDestination] = useState<string | null>(null);
  const currentLocation = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`;
  const pending = pendingDestination !== null && pendingDestination !== currentLocation;

  useEffect(() => {
    let resetTimer: ReturnType<typeof setTimeout> | undefined;
    const beginNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (`${destination.pathname}${destination.search}` === `${window.location.pathname}${window.location.search}`) return;
      setPendingDestination(`${destination.pathname}${destination.search}`);
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => setPendingDestination(null), 10000);
    };
    document.addEventListener("click", beginNavigation, true);
    return () => {
      document.removeEventListener("click", beginNavigation, true);
      clearTimeout(resetTimer);
    };
  }, []);

  if (!pending) return null;
  return (
    <div className="no-print pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden bg-primary/10" role="status" aria-live="polite">
      <div className="route-progress-bar h-full w-2/5 bg-primary shadow-[0_0_10px_rgba(183,255,60,0.75)]" />
      <span className="sr-only">Loading the requested page</span>
    </div>
  );
}

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

const studyNavigation: Record<AppShellUser["role"], NavigationItem> = {
  admin: { label: "Study Management", href: "/studies", icon: "BookOpen" },
  test_coordinator: { label: "Study Management", href: "/studies", icon: "BookOpen" },
  tester: { label: "Assigned Studies", href: "/tester-studies", icon: "BookOpen" },
  expert_reviewer: { label: "Review Studies", href: "/review-studies", icon: "BookOpen" },
  law_firm_viewer: { label: "Released Studies", href: "/view-studies", icon: "BookOpen" },
};

function navigationForRole(role: AppShellUser["role"]): NavigationItem[] {
  if (role === "tester") return [studyNavigation[role]];
  const systemItems = ["/dashboard", "/audit", "/reports"].map((href) =>
    demoConfig.navigation.find((item) => item.href === href),
  ).filter((item): item is NavigationItem => Boolean(item));
  return [systemItems[0], studyNavigation[role], ...systemItems.slice(1)];
}

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
  const items = navigationForRole(role);
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
              "group flex min-h-11 items-center gap-3 rounded-md border border-transparent px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
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

function Brand({ role }: { role: AppShellUser["role"] }) {
  const homeHref = role === "tester" ? "/tester-studies" : "/dashboard";
  return (
    <Link href={homeHref} className="flex items-center gap-3 rounded-md" aria-label="Go to your home page">
      <span className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-primary/30 bg-black shadow-sm shadow-primary/15">
        <Image src="/icon.png" alt="" fill sizes="36px" className="object-cover" priority />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.19em] text-primary">DoGoodie</span>
        <span className="block truncate text-sm font-semibold text-foreground">Paired Testing Lab</span>
      </span>
    </Link>
  );
}

export function CurrentStudySummary({ activeStudy }: { activeStudy: AppShellStudy | null }) {
  return (
    <section aria-label="Current study" className="mt-6 rounded-md border border-border/80 bg-secondary/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Current study</span>
        <span className="mono truncate text-[10px] text-primary">{activeStudy?.code ?? "NONE SELECTED"}</span>
      </div>
      <p className="mt-2 line-clamp-2 text-xs font-medium leading-5 text-foreground">{activeStudy?.name ?? "No study selected"}</p>
      {activeStudy ? <p className="mt-1 text-[10px] capitalize leading-4 text-muted-foreground">{activeStudy.status} · {activeStudy.currency ?? "Currency pending"}</p> : null}
      {activeStudy?.serviceLabel ? <p className="mt-2 truncate text-[10px] font-medium text-primary" title={activeStudy.serviceLabel}>{activeStudy.serviceLabel}</p> : null}
    </section>
  );
}

export function AppShell({ children, user, dashboardStudies = [] }: { children: React.ReactNode; user: AppShellUser; dashboardStudies?: Array<{ id: string; code: string; name: string }> }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const current = navigationForRole(user.role).find((item) =>
    item.href === "/" ? pathname === item.href : pathname.startsWith(item.href));
  return (
    <div className="min-h-screen">
      <NavigationIndicator />
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border/80 bg-[#08120e]/95 p-4 backdrop-blur-xl lg:flex lg:flex-col">
        <Brand role={user.role} />
        <div className="mt-8 flex-1 overflow-y-auto"><Navigation role={user.role} /></div>
        <div className="space-y-3 border-t border-border/70 pt-4">
          <AccountPanel user={user} />
          <div className="flex items-center justify-between px-2 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
            <span>{demoConfig.product.badge}</span><span>{demoConfig.product.version}</span>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header role="banner" className="no-print sticky top-0 z-20 flex h-16 items-center justify-between gap-2 border-b border-border/80 bg-background/88 px-3 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="size-11 shrink-0 lg:hidden"><Menu className="size-5" /><span className="sr-only">Open navigation</span></Button>
              </SheetTrigger>
              <SheetContent side="left" className="!h-dvh w-[min(88vw,320px)] gap-0 overflow-hidden p-0">
                <SheetHeader className="shrink-0 px-4 pb-0 pt-[max(1rem,env(safe-area-inset-top))]"><SheetTitle className="sr-only">Application navigation</SheetTitle></SheetHeader>
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                  <Brand role={user.role} />
                  <div className="mt-6"><Navigation role={user.role} onNavigate={() => setMobileNavOpen(false)} /></div>
                  <div className="mt-auto border-t border-border pt-5"><AccountPanel user={user} /></div>
                </div>
              </SheetContent>
            </Sheet>
            {pathname === "/dashboard" ? <DashboardScopeSelector studies={dashboardStudies} selectedId={searchParams.get("study") ?? undefined} compact /> : <p className="truncate text-sm font-medium text-foreground">{current?.label ?? "Matched Pair Review"}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <span className="hidden rounded-md border border-teal-300/20 bg-teal-300/[0.06] px-2.5 py-1 text-[10px] font-medium text-teal-200 sm:inline-flex">Internal pilot</span>
            <span className="hidden max-w-52 truncate text-[11px] text-muted-foreground xl:inline">{user.displayName || user.email} · {roleLabels[user.role]}</span>
            <AccountPanel user={user} compact />
          </div>
        </header>
        <main id="main-content" className="box-border min-w-0 w-full max-w-[1600px] overflow-x-clip px-3 py-4 sm:p-6 lg:mx-auto lg:p-7">
          {children}
        </main>
      </div>
    </div>
  );
}
