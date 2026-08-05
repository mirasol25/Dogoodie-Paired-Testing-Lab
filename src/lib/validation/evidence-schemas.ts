import { z } from "zod";

export const registerEvidenceSchema = z.object({
  submissionId: z.string().uuid(),
  evidenceType: z.enum(["screenshot", "screen_recording"]),
  storagePath: z.string().min(10).max(1000),
  originalFilename: z.string().trim().min(1).max(255),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"]),
  sizeBytes: z.number().int().positive().max(52_428_800),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  capturedAt: z.iso.datetime({ offset: true }).nullable(),
});

export type RegisterEvidenceInput = z.input<typeof registerEvidenceSchema>;
