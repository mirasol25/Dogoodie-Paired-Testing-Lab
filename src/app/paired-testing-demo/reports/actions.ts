"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function recordReportExportAction(studyId: string, exportKind: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_report_export", {
    p_study_id: studyId,
    p_export_kind: exportKind,
  });
  if (error) throw new Error(error.message || "Report export activity could not be recorded.");
  revalidatePath("/paired-testing-demo/audit");
}
