export type ServiceValidationStatus = "matched" | "mismatched" | "unverified";

export type CropRegion = { left: number; top: number; width: number; height: number };

export type ScreenshotOCRResult = {
  selectedRideLabel: string | null;
  fare: { min: number; max: number | null } | null;
  statusBarTimeText: string | null;
  batteryPercentage: number | null;
  warnings: string[];
  diagnostics: { selectedCardRawText: string; selectedCardCrop?: CropRegion; statusBarRawText?: string };
};

export type QuoteTimeResolution = {
  rawTimeText: string | null;
  resolvedTimestamp: string | null;
  method: "24-hour-status-bar" | "upload-time-proximity" | "manual" | "unresolved";
  differenceFromUploadMinutes: number | null;
};

export type ResolvedScreenshotService = {
  rawDetectedLabel: string | null;
  platformServiceId: string | null;
  platformServiceName: string | null;
  resolution: "resolved" | "unresolved";
};

export type ScreenshotValidationResult = ScreenshotOCRResult & {
  serviceValidation: ServiceValidationStatus;
  expectedPlatformServiceId: string;
  detectedPlatformServiceId: string | null;
  quoteTime: QuoteTimeResolution;
};

export interface PlatformScreenshotAdapter {
  detectSelectedCard(image: Buffer): Promise<CropRegion | null>;
}
