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
