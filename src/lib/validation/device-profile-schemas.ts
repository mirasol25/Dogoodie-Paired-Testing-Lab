import { z } from "zod";

export const deviceProfileSchema = z.object({
  deviceType: z.string().trim().min(1, "Enter the device type.").max(120),
  operatingSystem: z.string().trim().min(1, "Enter the operating system.").max(80),
  operatingSystemVersion: z.string().trim().min(1, "Enter the OS version.").max(80),
});

export type DeviceProfileInput = z.infer<typeof deviceProfileSchema>;
