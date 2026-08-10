"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ClipboardCheck, FileArchive, GitCompareArrows, History, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppShellUser } from "@/components/paired-testing/layout/app-shell";

const items = [
  { segment: "", label: "Overview", icon: LayoutDashboard, roles: ["admin", "test_coordinator", "tester", "expert_reviewer", "law_firm_viewer"] },
  { segment: "protocol", label: "Protocol", icon: BookOpen, roles: ["admin", "test_coordinator", "expert_reviewer", "law_firm_viewer"] },
  { segment: "assignments", label: "Assignments", icon: ClipboardCheck, roles: ["admin", "test_coordinator", "tester"] },
  { segment: "pairs", label: "Matched Pairs", icon: GitCompareArrows, roles: ["admin", "test_coordinator", "expert_reviewer", "law_firm_viewer"] },
  { segment: "evidence", label: "Evidence", icon: FileArchive, roles: ["admin", "test_coordinator", "expert_reviewer", "law_firm_viewer"] },
  { segment: "activity", label: "Activity Log", icon: History, roles: ["admin", "test_coordinator", "expert_reviewer", "law_firm_viewer"] },
] satisfies Array<{
  segment: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: AppShellUser["role"][];
}>;

export function StudyWorkspaceNav({ studyId, role }: { studyId: string; role: AppShellUser["role"] }) {
  const pathname = usePathname();
  const base = `/studies/${studyId}`;

  return (
    <nav aria-label="Selected study navigation" className="no-print -mx-3 mb-5 border-b border-border px-3 sm:mx-0 sm:mb-6 sm:px-0">
      <div className="overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max snap-x snap-mandatory gap-1">
          {items.filter((item) => item.roles.includes(role)).map((item) => {
            const href = item.segment ? `${base}/${item.segment}` : base;
            const isPairReview = item.segment === "pairs" && /^\/pairs\/[^/]+$/.test(pathname);
            const active = item.segment ? pathname === href || pathname.startsWith(`${href}/`) || isPairReview : pathname === href;
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-12 snap-start items-center gap-2 px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground sm:h-11",
                  active && "text-primary after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-primary",
                )}
              >
                <Icon className="size-3.5 shrink-0" strokeWidth={1.8} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
