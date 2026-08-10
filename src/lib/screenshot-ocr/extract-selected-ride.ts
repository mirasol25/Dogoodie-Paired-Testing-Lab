import sharp from "sharp";
import { parseBatteryPercentage } from "./battery-parser";
import { parseSelectedFare } from "./fare-parser";
import { getPlatformAdapter } from "./platforms";
import type { ScreenshotOCRResult } from "./schemas";
import { parseStatusBarTime } from "./time-parser";
import { recognizeLayout, recognizeText, withOCRWorker } from "./tesseract";
import type { ScreenshotCandidate } from "./schemas";

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
  // One worker loads the language model once. Four concurrent workers caused
  // large memory/CPU spikes in serverless production when testers uploaded at
  // the same time.
  const layoutImage = width > 1080
    ? await sharp(image).resize({ width: 1080, withoutEnlargement: true }).png().toBuffer()
    : image;
  const [selectedCardRawText, statusBarRawText, batteryRawText, layout] = await withOCRWorker(async (worker) => [
    await recognizeText(worker, selectedCardImage),
    await recognizeText(worker, timeImage, { tessedit_pageseg_mode: 7 }),
    await recognizeText(worker, batteryImage, { tessedit_pageseg_mode: 8, tessedit_char_whitelist: "0123456789" }),
    await recognizeLayout(worker, layoutImage),
  ] as const);
  const layoutScale = width / Math.min(width, 1080);
  const warnings: string[] = [];
  const selectedRideLabel = labelFromText(selectedCardRawText);
  if (!selectedRideLabel) warnings.push("Selected ride label could not be read.");
  const normalize = (bbox: { x0: number; y0: number; x1: number; y1: number }) => ({ x: (bbox.x0 * layoutScale) / width, y: (bbox.y0 * layoutScale) / height, width: ((bbox.x1 - bbox.x0) * layoutScale) / width, height: ((bbox.y1 - bbox.y0) * layoutScale) / height });
  const candidates: ScreenshotCandidate[] = [];
  layout.lines.forEach((line, index) => {
    const bounds = normalize(line.bbox);
    const lineFare = parseSelectedFare(line.text);
    if (lineFare) candidates.push({ id: `fare-${index}`, type: "fare", text: line.text, displayValue: lineFare.max === null ? String(lineFare.min) : `${lineFare.min}-${lineFare.max}`, parsedValue: lineFare, bounds });
    const lineTime = bounds.y < 0.13 ? parseStatusBarTime(line.text) : null;
    if (lineTime) candidates.push({ id: `time-${index}`, type: "time", text: line.text, displayValue: lineTime, parsedValue: lineTime, bounds });
    const battery = bounds.y < 0.13 && bounds.x > 0.62 ? parseBatteryPercentage(line.text) : null;
    if (battery !== null) candidates.push({ id: `battery-${index}`, type: "battery", text: line.text, displayValue: `${battery}%`, parsedValue: battery, bounds });
    if (bounds.y > 0.35 && /[a-z]{2}/i.test(line.text) && !lineFare && !/\b(?:min|mins|away|book|offer|promo|invite|save)\b/i.test(line.text)) {
      const y = Math.max(0, bounds.y - 0.025);
      candidates.push({ id: `ride-${index}`, type: "ride_card", text: line.text, displayValue: line.text, parsedValue: line.text, bounds: { x: 0.025, y, width: 0.95, height: Math.min(0.14, 1 - y) } });
    }
  });
  const statusBarTimeText = parseStatusBarTime(statusBarRawText);
  if (statusBarTimeText && !candidates.some((item) => item.type === "time" && item.displayValue === statusBarTimeText)) candidates.push({ id: "time-status-crop", type: "time", text: statusBarRawText.trim(), displayValue: statusBarTimeText, parsedValue: statusBarTimeText, bounds: { x: 0, y: 0, width: 0.26, height: 0.055 } });
  const batteryPercentage = parseBatteryPercentage(batteryRawText);
  if (batteryPercentage !== null && !candidates.some((item) => item.type === "battery" && item.parsedValue === batteryPercentage)) candidates.push({ id: "battery-status-crop", type: "battery", text: batteryRawText.trim(), displayValue: `${batteryPercentage}%`, parsedValue: batteryPercentage, bounds: { x: 0.84, y: 0, width: 0.14, height: 0.065 } });
  const fare = parseSelectedFare(selectedCardRawText);
  const cropBounds = crop ? { x: crop.left / width, y: crop.top / height, width: crop.width / width, height: crop.height / height } : { x: 0, y: 0.62, width: 1, height: 0.24 };
  if (selectedRideLabel && !candidates.some((item) => item.type === "ride_card" && item.text.toLowerCase().includes(selectedRideLabel.toLowerCase()))) candidates.push({ id: "ride-selected-crop", type: "ride_card", text: selectedRideLabel, displayValue: selectedRideLabel, parsedValue: selectedRideLabel, bounds: cropBounds });
  if (fare && !candidates.some((item) => item.type === "fare" && JSON.stringify(item.parsedValue) === JSON.stringify(fare))) candidates.push({ id: "fare-selected-crop", type: "fare", text: selectedCardRawText, displayValue: fare.max === null ? String(fare.min) : `${fare.min}-${fare.max}`, parsedValue: fare, bounds: cropBounds });
  return { selectedRideLabel, fare, statusBarTimeText, batteryPercentage, warnings, candidates, diagnostics: { selectedCardRawText, selectedCardCrop: crop ?? undefined, statusBarRawText: `${statusBarRawText.trim()} | battery: ${batteryRawText.trim()} | full: ${layout.text}` } };
}
