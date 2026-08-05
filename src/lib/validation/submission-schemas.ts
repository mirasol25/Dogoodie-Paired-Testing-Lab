import { z } from "zod";

export const submissionDraftSchema = z.object({
  assignmentId: z.string().uuid(),
  displayedFare: z.number().positive("Displayed fare must be greater than zero."),
  quoteTimestamp: z.iso.datetime({ offset: true }),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  networkType: z.string().trim().min(1, "Enter the network type.").max(80),
  deviceType: z.string().trim().min(1, "Enter the device type.").max(120),
  operatingSystem: z.string().trim().min(1, "Enter the operating system.").max(80),
  operatingSystemVersion: z.string().trim().min(1, "Enter the OS version.").max(80),
  appVersion: z.string().trim().min(1, "Enter the app version.").max(80),
  batteryPercentage: z.number().int().min(0).max(100),
  // The client normalizes a blank optional note to null before the server action validates it again.
  notes: z.string().trim().max(1000).nullable().optional().transform((value) => value || null),
});

export type SubmissionDraftInput = z.input<typeof submissionDraftSchema>;
