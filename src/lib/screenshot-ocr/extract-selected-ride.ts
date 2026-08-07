import sharp from "sharp";
import { parseBatteryPercentage } from "./battery-parser";
import { parseSelectedFare } from "./fare-parser";
import { getPlatformAdapter } from "./platforms";
import type { ScreenshotOCRResult } from "./schemas";
import { parseStatusBarTime } from "./time-parser";
import { recognizeText } from "./tesseract";

function labelFromText(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  // Ride names conventionally share a row with the selected fare. This avoids
  // treating route/map or promotional text as the selected service.
  const fareLine = lines.find((line) => /(?:₱|£|\$|\bP)\s*\d/.test(line));
  if (fareLine) {
    const beforeFare = fareLine.split(/(?:₱|£|\$|\bP)\s*\d/i)[0]?.replace(/^[^A-Za-z]+/, "").trim() ?? "";
    const withoutLeadingArtifact = beforeFare.replace(/^[A-Za-z]\s+(?=[A-Z])/, "").trim();
    if (withoutLeadingArtifact) {
      const label = cleanRideLabel(withoutLeadingArtifact);
      // Grab renders Pet as a small selected-card badge below "Standard Car".
      // It changes the booked product, so retain it as part of the service
      // identity rather than incorrectly accepting it as ordinary GrabCar.
      if (/^standard\s+car$/i.test(label) && lines.some((line) => /^pet$/i.test(line))) {
        return "Standard Car Pet";
      }
      return label;
    }
  }
  const fallback = lines.find((line) => /[a-z]/i.test(line) && !/\b(?:min|mins|minute|minutes|book|promo|invite|save)\b/i.test(line) && line.length <= 48);
  return fallback ? cleanRideLabel(fallback) : null;
}

function cleanRideLabel(value: string) {
  // Ride cards commonly render a passenger icon and count after the label.
  // Tesseract reads the icon as `&`, `@`, or `|`; it is UI metadata, not a
  // service alias (for example: `UberX &4` -> `UberX`).
  return value.replace(/\s+[&@|]?\s*\d{1,2}\s*$/, "").trim();
}

export async function extractSelectedRide(image: Buffer, platformSlug: string): Promise<ScreenshotOCRResult> {
  const metadata = await sharp(image).metadata();
  const adapter = getPlatformAdapter(platformSlug);
  const crop = await adapter.detectSelectedCard(image);
  const selectedCardImage = crop ? await sharp(image).extract(crop).grayscale().normalize().png().toBuffer() : image;
  const width = metadata.width ?? 1;
  const height = metadata.height ?? 1;
  const timeImage = await sharp(image)
    .extract({ left: 0, top: 0, width: Math.max(1, Math.round(width * 0.26)), height: Math.max(1, Math.round(height * 0.055)) })
    .resize({ width: Math.max(1, Math.round(width * 1.3)) }).grayscale().normalize().threshold(160).png().toBuffer();
  const batteryImage = await sharp(image)
    .extract({ left: Math.round(width * 0.86), top: Math.round(height * 0.018), width: Math.max(1, Math.round(width * 0.06)), height: Math.max(1, Math.round(height * 0.024)) })
    .resize({ width: Math.max(1, Math.round(width * 1.2)) }).grayscale().normalize().threshold(135).png().toBuffer();
  const [selectedCardRawText, statusBarRawText, batteryRawText] = await Promise.all([
    recognizeText(selectedCardImage),
    recognizeText(timeImage, { tessedit_pageseg_mode: 7 }),
    recognizeText(batteryImage, { tessedit_pageseg_mode: 8, tessedit_char_whitelist: "0123456789" }),
  ]);
  const warnings: string[] = [];
  const selectedRideLabel = labelFromText(selectedCardRawText);
  if (!selectedRideLabel) warnings.push("Selected ride label could not be read.");
  return { selectedRideLabel, fare: parseSelectedFare(selectedCardRawText), statusBarTimeText: parseStatusBarTime(statusBarRawText), batteryPercentage: parseBatteryPercentage(batteryRawText), warnings, diagnostics: { selectedCardRawText, selectedCardCrop: crop ?? undefined, statusBarRawText: `${statusBarRawText.trim()} | battery: ${batteryRawText.trim()}` } };
}
