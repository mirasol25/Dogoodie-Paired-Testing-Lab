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

export const setPasswordSchema = z.object({
  password: z.string().min(12, "Use at least 12 characters.").max(128),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, {
  message: "The passwords do not match.",
  path: ["confirmPassword"],
});
