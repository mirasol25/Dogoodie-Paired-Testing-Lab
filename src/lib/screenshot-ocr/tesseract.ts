import "server-only";
import { join } from "node:path";
import { createWorker } from "tesseract.js";

export async function recognizeText(image: Buffer, config: Record<string, string | number> = {}) {
  // Keep the binary trained-data file out of Turbopack's module graph. It is
  // a runtime resource installed with the application, not a JavaScript asset.
  const langPath = join(process.cwd(), "node_modules", "@tesseract.js-data", "eng", "4.0.0");
  const worker = await createWorker("eng", 1, { langPath, gzip: true });
  try { return (await worker.recognize(image, config)).data.text; }
  finally { await worker.terminate(); }
}

export type RecognizedLine = { text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } };

export async function recognizeLayout(image: Buffer): Promise<{ text: string; lines: RecognizedLine[] }> {
  const langPath = join(process.cwd(), "node_modules", "@tesseract.js-data", "eng", "4.0.0");
  const worker = await createWorker("eng", 1, { langPath, gzip: true });
  try {
    const result = await worker.recognize(image, {}, { text: true, blocks: true });
    const lines = (result.data.blocks ?? []).flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines.map((line) => ({ text: line.text.trim(), confidence: line.confidence, bbox: line.bbox }))));
    return { text: result.data.text, lines: lines.filter((line) => line.text) };
  } finally { await worker.terminate(); }
}
