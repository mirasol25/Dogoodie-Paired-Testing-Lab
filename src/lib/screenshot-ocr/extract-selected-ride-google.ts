import sharp from "sharp";
import { parseBatteryPercentage } from "./battery-parser";
import { cleanRideLabel, labelFromText } from "./extract-selected-ride";
import { parseSelectedFare } from "./fare-parser";
import { recognizeWithGoogleVision } from "./google-vision";
import { getPlatformAdapter } from "./platforms";
import type { ScreenshotCandidate, ScreenshotOCRResult } from "./schemas";
import { parseStatusBarTime } from "./time-parser";

export async function extractSelectedRideWithGoogle(image: Buffer, platformSlug: string): Promise<ScreenshotOCRResult> {
  const metadata = await sharp(image).metadata();
  const width = metadata.width ?? 1;
  const height = metadata.height ?? 1;
  const crop = await getPlatformAdapter(platformSlug).detectSelectedCard(image);
  const recognized = await recognizeWithGoogleVision(image);
  const normalize = (bbox: { x0: number; y0: number; x1: number; y1: number }) => ({
    x: bbox.x0 / width, y: bbox.y0 / height,
    width: (bbox.x1 - bbox.x0) / width, height: (bbox.y1 - bbox.y0) / height,
  });
  const inSelectedCard = (bbox: { x0: number; y0: number; x1: number; y1: number }) => {
    if (!crop) return bbox.y0 / height >= 0.62;
    const centerY = (bbox.y0 + bbox.y1) / 2;
    return centerY >= crop.top && centerY <= crop.top + crop.height;
  };
  const selectedLines = recognized.lines.filter((line) => inSelectedCard(line.bbox));
  const selectedCardRawText = selectedLines.map((line) => line.text).join("\n");
  const topLines = recognized.lines.filter((line) => line.bbox.y0 / height < 0.13);
  const statusBarRawText = topLines.filter((line) => line.bbox.x0 / width < 0.5).map((line) => line.text).join(" ");
  const batteryRawText = topLines.filter((line) => line.bbox.x0 / width > 0.62).map((line) => line.text).join(" ");
  const candidates: ScreenshotCandidate[] = [];

  recognized.lines.forEach((line, index) => {
    const bounds = normalize(line.bbox);
    const lineFare = parseSelectedFare(line.text);
    if (lineFare) candidates.push({ id: `fare-${index}`, type: "fare", text: line.text, displayValue: lineFare.max === null ? String(lineFare.min) : `${lineFare.min}-${lineFare.max}`, parsedValue: lineFare, bounds });
    const lineTime = bounds.y < 0.13 ? parseStatusBarTime(line.text) : null;
    if (lineTime) candidates.push({ id: `time-${index}`, type: "time", text: line.text, displayValue: lineTime, parsedValue: lineTime, bounds });
    const battery = bounds.y < 0.13 && bounds.x > 0.62 ? parseBatteryPercentage(line.text) : null;
    if (battery !== null) candidates.push({ id: `battery-${index}`, type: "battery", text: line.text, displayValue: `${battery}%`, parsedValue: battery, bounds });
    if (inSelectedCard(line.bbox) && /[a-z]{2}/i.test(line.text) && !lineFare && !/\b(?:min|mins|away|book|offer|promo|invite|save)\b/i.test(line.text)) {
      const y = Math.max(0, bounds.y - 0.025);
      candidates.push({ id: `ride-${index}`, type: "ride_card", text: cleanRideLabel(line.text), displayValue: cleanRideLabel(line.text), parsedValue: cleanRideLabel(line.text), bounds: { x: 0.025, y, width: 0.95, height: Math.min(0.14, 1 - y) } });
    }
  });

  const selectedRideLabel = labelFromText(selectedCardRawText);
  const fare = parseSelectedFare(selectedCardRawText);
  const statusBarTimeText = parseStatusBarTime(statusBarRawText);
  const batteryPercentage = parseBatteryPercentage(batteryRawText);
  const cropBounds = crop ? { x: crop.left / width, y: crop.top / height, width: crop.width / width, height: crop.height / height } : { x: 0, y: 0.62, width: 1, height: 0.24 };
  if (selectedRideLabel && !candidates.some((item) => item.type === "ride_card" && item.text.toLowerCase().includes(selectedRideLabel.toLowerCase()))) candidates.push({ id: "ride-selected-region", type: "ride_card", text: selectedRideLabel, displayValue: selectedRideLabel, parsedValue: selectedRideLabel, bounds: cropBounds });
  if (fare && !candidates.some((item) => item.type === "fare" && JSON.stringify(item.parsedValue) === JSON.stringify(fare))) candidates.push({ id: "fare-selected-region", type: "fare", text: selectedCardRawText, displayValue: fare.max === null ? String(fare.min) : `${fare.min}-${fare.max}`, parsedValue: fare, bounds: cropBounds });
  if (statusBarTimeText && !candidates.some((item) => item.type === "time" && item.displayValue === statusBarTimeText)) candidates.push({ id: "time-status-region", type: "time", text: statusBarRawText, displayValue: statusBarTimeText, parsedValue: statusBarTimeText, bounds: { x: 0, y: 0, width: 0.5, height: 0.13 } });

  const warnings: string[] = [];
  if (!selectedRideLabel) warnings.push("Selected ride label could not be read.");
  return {
    selectedRideLabel, fare, statusBarTimeText, batteryPercentage, warnings, candidates,
    diagnostics: { selectedCardRawText, selectedCardCrop: crop ?? undefined, statusBarRawText: `${statusBarRawText} | battery: ${batteryRawText} | provider: google-vision | full: ${recognized.text}` },
  };
}
