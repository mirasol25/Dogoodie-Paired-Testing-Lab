import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth/server";

export default async function ApplicationEntryPage() {
  const identity = await requireActiveUser("/paired-testing-demo");
  const destinations = {
    admin: "/dashboard",
    test_coordinator: "/dashboard",
    tester: "/tester-studies",
    expert_reviewer: "/review-studies",
    law_firm_viewer: "/view-studies",
  } as const;
  redirect(destinations[identity.profile.role]);
}
