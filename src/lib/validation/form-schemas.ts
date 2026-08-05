import { z } from "zod";

export const assignmentSchema = z.object({
  testerAId: z.string().min(1, "Select Tester A."),
  testerBId: z.string().min(1, "Select Tester B."),
  scheduledDate: z.string().min(1, "Scheduled date is required."),
  startTime: z.string().min(1, "Start time is required."),
  endTime: z.string().min(1, "End time is required."),
  platform: z.string().min(1, "Platform is required."),
  pickup: z.string().min(1, "Pickup is required."),
  destination: z.string().min(1, "Destination is required."),
  rideTier: z.string().min(1, "Ride tier is required."),
  isolatedVariable: z.string().min(1, "Isolated variable is required."),
}).refine((values) => values.testerAId !== values.testerBId, {
  message: "Tester A and Tester B must be different.",
  path: ["testerBId"],
});

export const testerSubmissionSchema = z.object({
  displayedPrice: z.number().positive("Price must be positive."),
  currency: z.string().min(1, "Currency is required."),
  platform: z.string().min(1, "Platform is required."),
  quoteTimestamp: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid timestamp."),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  networkType: z.string().min(1, "Network type is required."),
  deviceType: z.string().min(1, "Device type is required."),
  operatingSystem: z.string().min(1, "Operating system is required."),
  operatingSystemVersion: z.string().min(1, "OS version is required."),
  appVersion: z.string().min(1, "App version is required."),
  batteryPercentage: z.number().min(0).max(100),
  accountProfileCategory: z.string().min(1),
  membershipStatus: z.string().min(1),
  rideTier: z.string().min(1, "Ride tier is required."),
  pickup: z.string().min(1, "Pickup is required."),
  destination: z.string().min(1, "Destination is required."),
  notes: z.string().max(1000).optional(),
  quoteScreenshot: z.any().optional(),
  screenRecording: z.any().optional(),
});

export type AssignmentFormValues = z.infer<typeof assignmentSchema>;
export type TesterSubmissionFormValues = z.infer<typeof testerSubmissionSchema>;
