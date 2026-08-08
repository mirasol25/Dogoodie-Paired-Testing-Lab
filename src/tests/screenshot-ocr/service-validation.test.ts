import { describe, expect, it } from "vitest";
import { parseSelectedFare } from "@/lib/screenshot-ocr/fare-parser";
import { resolveScreenshotService, validateRequiredService } from "@/lib/screenshot-ocr/service-resolver";
import { resolveQuoteTime } from "@/lib/screenshot-ocr/time-parser";

describe("screenshot service validation", () => {
  const services = [
    { id: "grabcar", name: "GrabCar", service_code: "GRABCAR", metadata: { ocr_aliases: ["Standard Car"] } },
    { id: "grabtaxi", name: "GrabTaxi", service_code: "GRAB-TAXI", metadata: {} },
  ];

  it("resolves configured aliases only within the supplied platform services", () => {
    expect(resolveScreenshotService(services, " standard-car ").platformServiceId).toBe("grabcar");
    expect(resolveScreenshotService(services, "Unknown ride").resolution).toBe("unresolved");
  });

  it("ignores a terminal passenger-count OCR artifact without prefix-matching another service", () => {
    const uberServices = [{ id: "uberx", name: "UberX", service_code: "UBERX", metadata: {} }];
    expect(resolveScreenshotService(uberServices, "UberX &4").platformServiceId).toBe("uberx");
    expect(resolveScreenshotService(uberServices, "UberX Share").resolution).toBe("unresolved");
  });

  it("resolves each configured Uber service and preserves a wrong-service rejection", () => {
    const uberServices = [
      { id: "uberx", name: "UberX", service_code: "UBERX", metadata: {} },
      { id: "uberxl", name: "UberXL", service_code: "UBERXL", metadata: {} },
      { id: "uber-pet", name: "Pet", service_code: "UBER_PET", metadata: {} },
      { id: "wait-save", name: "Wait & Save", service_code: "WAIT_SAVE", metadata: {} },
      { id: "assist", name: "Assist", service_code: "ASSIST", metadata: {} },
    ];

    const cases = [
      ["uberx", "UberX &4"],
      ["uberxl", "UberXL &6"],
      ["uber-pet", "Pet &4"],
      ["wait-save", "Wait & Save &4"],
      ["assist", "Assist &4"],
    ] as const;

    for (const [expectedId, label] of cases) {
      const resolved = resolveScreenshotService(uberServices, label);
      expect(resolved.platformServiceId).toBe(expectedId);
      expect(validateRequiredService(expectedId, resolved.platformServiceId)).toBe("matched");
    }

    const wrongService = resolveScreenshotService(uberServices, "UberX &4");
    expect(validateRequiredService("uberxl", wrongService.platformServiceId)).toBe("mismatched");
  });

  it("resolves the Grab products displayed on the supplied cards", () => {
    const grabServices = [
      { id: "grab-standard-4", name: "Standard - 4 Seater", service_code: "standard-car", metadata: { ocr_aliases: ["Standard Car"] } },
      { id: "grab-standard-6", name: "Standard - 6 Seater", service_code: "six-seater", metadata: { ocr_aliases: ["Standard Car 6 Seater"] } },
      { id: "grab-pet", name: "Standard - Pet", service_code: "pet-friendly-car", metadata: { ocr_aliases: ["Standard Car Pet"] } },
      { id: "grab-saver", name: "Saver Car - 4 Seater", service_code: "saver-car", metadata: { ocr_aliases: ["Saver Car"] } },
      { id: "grab-taxi", name: "Metered Taxi - 4 Seater", service_code: "metered-taxi", metadata: { ocr_aliases: ["Metered Taxi"] } },
    ];

    expect(validateRequiredService("grab-standard-6", resolveScreenshotService(grabServices, "Standard Car 6 Seater").platformServiceId)).toBe("matched");
    expect(validateRequiredService("grab-pet", resolveScreenshotService(grabServices, "Standard Car Pet").platformServiceId)).toBe("matched");
    expect(validateRequiredService("grab-standard-4", resolveScreenshotService(grabServices, "Standard Car &4").platformServiceId)).toBe("matched");
    expect(validateRequiredService("grab-saver", resolveScreenshotService(grabServices, "Saver Car").platformServiceId)).toBe("matched");
    expect(validateRequiredService("grab-taxi", resolveScreenshotService(grabServices, "Metered Taxi").platformServiceId)).toBe("matched");
  });

  it("resolves the corrected inDrive categories", () => {
    const services = [
      { id: "indrive-4", name: "4 Seater", service_code: "standard-car", metadata: {} },
      { id: "indrive-6", name: "6 Seater", service_code: "six-seater", metadata: {} },
      { id: "indrive-comfort", name: "Comfort XL", service_code: "comfort-xl", metadata: {} },
      { id: "indrive-taxi", name: "Taxi", service_code: "taxi", metadata: {} },
    ];
    expect(resolveScreenshotService(services, "4 Seater").platformServiceId).toBe("indrive-4");
    expect(resolveScreenshotService(services, "6 Seater").platformServiceId).toBe("indrive-6");
    expect(resolveScreenshotService(services, "Comfort XL").platformServiceId).toBe("indrive-comfort");
    expect(resolveScreenshotService(services, "Taxi").platformServiceId).toBe("indrive-taxi");
  });

  it("distinguishes match, mismatch, and unverified", () => {
    expect(validateRequiredService("grabcar", "grabcar")).toBe("matched");
    expect(validateRequiredService("grabcar", "grabtaxi")).toBe("mismatched");
    expect(validateRequiredService("grabcar", null)).toBe("unverified");
  });

  it("reads fares but ignores duration ranges", () => {
    expect(parseSelectedFare("Standard Car\n₱297 - ₱488\n4-7 mins")).toEqual({ min: 297, max: 488 });
    expect(parseSelectedFare("4-7 mins")).toBeNull();
  });

  it("uses the nearest local candidate around an upload time", () => {
    const result = resolveQuoteTime("7:24", "2026-08-07T11:27:00.000Z", "Asia/Manila");
    expect(result.resolvedTimestamp).toBe("2026-08-07T11:24:00.000Z");
    expect(result.differenceFromUploadMinutes).toBe(3);
  });
});
