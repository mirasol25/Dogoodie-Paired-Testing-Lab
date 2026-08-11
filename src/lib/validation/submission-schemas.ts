import { z } from "zod";

export const submissionDraftSchema = z.object({
  assignmentId: z.string().uuid(),
  displayedFare: z.number().positive("Displayed fare must be greater than zero."),
  quoteTimestamp: z.iso.datetime({ offset: true }),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  networkType: z.string().trim().max(80).nullable().optional().transform((value) => value || null),
  deviceType: z.string().trim().min(1, "Enter the device type.").max(120),
  operatingSystem: z.string().trim().min(1, "Enter the operating system.").max(80),
  operatingSystemVersion: z.string().trim().min(1, "Enter the OS version.").max(80),
  appVersion: z.string().trim().max(80).nullable().optional().transform((value) => value || null),
  batteryPercentage: z.number().int().min(0).max(100).nullable().optional(),
  observationData: z.record(z.string(), z.string().trim().max(2000)).default({}),
  // The client normalizes a blank optional note to null before the server action validates it again.
  notes: z.string().trim().max(1000).nullable().optional().transform((value) => value || null),
});

// Device model and OS details are account-level metadata. The observation UI
// submits only session-specific values; the server adds these three fields
// from the authenticated user's saved Device Profile.
export const submissionDraftClientSchema = submissionDraftSchema.omit({
  displayedFare: true,
  quoteTimestamp: true,
  deviceType: true,
  operatingSystem: true,
  operatingSystemVersion: true,
});

export type SubmissionDraftInput = z.input<typeof submissionDraftSchema>;
