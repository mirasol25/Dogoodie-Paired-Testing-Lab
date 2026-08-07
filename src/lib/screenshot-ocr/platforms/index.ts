import sharp from "sharp";
import type { PlatformScreenshotAdapter } from "../schemas";

// Selection cues differ by provider. Until real per-platform fixtures are
// configured, this adapter targets the lower service-sheet region based on
// image dimensions (rather than a resolution-specific pixel coordinate).
const adaptiveCardAdapter: PlatformScreenshotAdapter = {
  async detectSelectedCard(image) {
    const metadata = await sharp(image).metadata();
    if (!metadata.width || !metadata.height) return null;
    return { left: 0, top: Math.round(metadata.height * 0.62), width: metadata.width, height: Math.round(metadata.height * 0.24) };
  },
};

export function getPlatformAdapter(platformSlug: string): PlatformScreenshotAdapter {
  void platformSlug;
  return adaptiveCardAdapter;
}
