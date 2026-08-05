import { describe, expect, it } from "vitest";
import { auditEventsFixture, evidenceFixture, pairsFixture } from "@/data/paired-testing-demo.fixtures";
import { auditToCsv, evidenceToCsv, pairsToCsv, rowsToCsv } from "@/lib/exports/csv-export";
import { createManifest, manifestToJson } from "@/lib/exports/manifest-export";

describe("demonstration exports", () => {
  it("quotes CSV cells safely", () => {
    expect(rowsToCsv(["Note"], [['Value, with "quote"']])).toContain('"Value, with ""quote"""');
  });

  it("exports current pair state as CSV", () => {
    const csv = pairsToCsv(pairsFixture);
    expect(csv.split("\n")).toHaveLength(13);
    expect(csv).toContain("PAIR-008");
    expect(csv).toContain("34.00");
  });

  it("exports evidence and activity inventories", () => {
    expect(evidenceToCsv(evidenceFixture)).toContain("Synthetic hash");
    expect(evidenceToCsv(evidenceFixture)).toContain("FILE-001");
    expect(auditToCsv(auditEventsFixture)).toContain("AUD-001");
  });

  it("creates valid JSON package manifests from current state", () => {
    const manifest = createManifest(pairsFixture, evidenceFixture, auditEventsFixture);
    const parsed = JSON.parse(manifestToJson(manifest));
    expect(parsed.packageId).toBe("PKG-001");
    expect(parsed.evidenceRecordCount).toBe(evidenceFixture.length);
    expect(parsed.reviewStatusSummary.accepted).toBe(4);
  });
});
