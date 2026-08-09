export type ServiceValidationStatus = "matched" | "mismatched" | "unverified";

export type CropRegion = { left: number; top: number; width: number; height: number };
export type NormalizedBounds = { x: number; y: number; width: number; height: number };
export type ScreenshotCandidateType = "ride_card" | "fare" | "time" | "battery";
export type ScreenshotCandidate = {
  id: string;
  type: ScreenshotCandidateType;
  text: string;
  displayValue: string;
  bounds: NormalizedBounds;
  parsedValue: string | number | { min: number; max: number | null };
  platformServiceId?: string | null;
};

export type ScreenshotOCRResult = {
  selectedRideLabel: string | null;
  fare: { min: number; max: number | null } | null;
  statusBarTimeText: string | null;
  batteryPercentage: number | null;
  warnings: string[];
  diagnostics: { selectedCardRawText: string; selectedCardCrop?: CropRegion; statusBarRawText?: string };
  candidates: ScreenshotCandidate[];
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
  validationId: string;
  selectionStatus: "pending" | "confirmed";
};

export type ScreenshotCandidateSelections = {
  rideCardCandidateId: string;
  fareCandidateId: string;
  timeCandidateId: string;
};

export interface PlatformScreenshotAdapter {
  detectSelectedCard(image: Buffer): Promise<CropRegion | null>;
}
