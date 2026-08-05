import { SubmissionClient } from "@/components/paired-testing/submission/submission-client";
import { requireRole } from "@/lib/auth/server";

export default async function SubmissionPage() {
  await requireRole("tester", "/paired-testing-demo/submission");
  return <SubmissionClient />;
}

