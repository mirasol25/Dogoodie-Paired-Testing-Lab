import "server-only";
import vision from "@google-cloud/vision";
import { getGoogleVisionCredentials } from "./provider";
import { groupGoogleTextAnnotations, type GoogleTextAnnotation } from "./google-vision-mapping";

let client: InstanceType<typeof vision.ImageAnnotatorClient> | null = null;

function getClient() {
  if (!client) client = new vision.ImageAnnotatorClient(getGoogleVisionCredentials());
  return client;
}

export async function recognizeWithGoogleVision(image: Buffer) {
  const [response] = await getClient().textDetection({ image: { content: image } });
  if (response.error?.message) throw new Error(`Google Cloud Vision OCR failed: ${response.error.message}`);
  const annotations = (response.textAnnotations ?? []) as GoogleTextAnnotation[];
  return {
    text: annotations[0]?.description ?? "",
    lines: groupGoogleTextAnnotations(annotations),
  };
}
