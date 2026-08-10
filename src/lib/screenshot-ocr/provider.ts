export type OCRProvider = "google" | "tesseract";

export function getOCRProvider(): OCRProvider {
  const configured = (process.env.OCR_PROVIDER || "google").trim().toLowerCase();
  if (configured === "google" || configured === "tesseract") return configured;
  throw new Error("OCR_PROVIDER must be either google or tesseract.");
}

export function getGoogleVisionCredentials() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID?.trim();
  const clientEmail = process.env.GOOGLE_CLOUD_CLIENT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Google Cloud Vision is not configured. Set GOOGLE_CLOUD_PROJECT_ID, GOOGLE_CLOUD_CLIENT_EMAIL, and GOOGLE_CLOUD_PRIVATE_KEY.");
  }
  return { projectId, credentials: { client_email: clientEmail, private_key: privateKey } };
}
