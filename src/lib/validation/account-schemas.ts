import { z } from "zod";

export const appRoleSchema = z.enum([
  "admin",
  "test_coordinator",
  "tester",
  "expert_reviewer",
  "law_firm_viewer",
]);

export const inviteAccountSchema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  displayName: z.string().trim().min(2, "Enter the user's name.").max(100),
  role: appRoleSchema,
});

const optionalCoordinate = (minimum: number, maximum: number) => z.preprocess(
  (value) => value === "" || value === null ? undefined : value,
  z.coerce.number().min(minimum).max(maximum).optional(),
);

export const setPasswordSchema = z.object({
  password: z.string().min(12, "Use at least 12 characters.").max(128),
  confirmPassword: z.string(),
  latitude: optionalCoordinate(-90, 90),
  longitude: optionalCoordinate(-180, 180),
  networkType: z.string().trim().min(1, "Enter the network type.").max(50),
  deviceType: z.string().trim().min(1, "Enter the device type.").max(100),
  operatingSystem: z.string().trim().min(1, "Enter the operating system.").max(50),
  operatingSystemVersion: z.string().trim().min(1, "Enter the OS version.").max(50),
  appVersion: z.string().trim().min(1, "Enter the app version.").max(50),
  browserLanguage: z.string().trim().max(50),
  browserTimezone: z.string().trim().max(100),
  screenSize: z.string().trim().regex(/^\d{1,5}x\d{1,5}$/).or(z.literal("")),
  userAgent: z.string().trim().max(1000),
}).refine((value) => value.password === value.confirmPassword, {
  message: "The passwords do not match.",
  path: ["confirmPassword"],
}).refine((value) => (value.latitude === undefined) === (value.longitude === undefined), {
  message: "Location coordinates are incomplete.",
  path: ["latitude"],
});
