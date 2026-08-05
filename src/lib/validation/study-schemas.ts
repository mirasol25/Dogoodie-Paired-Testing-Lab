import { z } from "zod";

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

const optionalText = (maximum: number) => z.string().trim().max(maximum).optional()
  .transform((value) => value || null);

const optionalDateTime = z.union([z.iso.datetime({ offset: true }), z.literal(""), z.null()])
  .optional()
  .transform((value) => value || null);

const studyFields = {
  studyCode: z.string().trim().toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9_-]{2,31}$/, "Use 3-32 letters, numbers, underscores, or hyphens."),
  name: z.string().trim().min(3, "Enter a study name.").max(160),
  description: optionalText(1000),
  studyType: z.enum(["within_platform_pair", "cross_platform_comparison"]),
  studyQuestion: optionalText(500),
  isolatedVariable: optionalText(160),
  targetPairCount: z.number().int().positive().max(1_000_000).nullable(),
  defaultCurrency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a three-letter ISO currency code."),
  displayTimezone: z.string().trim().min(1).refine(isValidTimeZone, "Select a valid IANA timezone."),
  testingStartsAt: optionalDateTime,
  testingEndsAt: optionalDateTime,
};

function validateSchedule(
  value: { testingStartsAt?: string | null; testingEndsAt?: string | null },
  context: z.RefinementCtx,
) {
  if (value.testingStartsAt && value.testingEndsAt
    && Date.parse(value.testingEndsAt) <= Date.parse(value.testingStartsAt)) {
    context.addIssue({
      code: "custom",
      path: ["testingEndsAt"],
      message: "Testing must end after it starts.",
    });
  }
}

export const createStudySchema = z.object(studyFields).superRefine(validateSchedule);

export type CreateStudyInput = z.input<typeof createStudySchema>;
export type ValidatedCreateStudyInput = z.output<typeof createStudySchema>;

const { studyCode: generatedStudyCode, ...studyFieldsWithoutCode } = studyFields;
void generatedStudyCode;

export const pinnedLocationSchema = z.object({
  label: z.string().trim().min(2, "Enter a location label.").max(160),
  formattedAddress: z.string().trim().min(3),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
  regionName: z.string().trim().max(160).nullable(),
  currencyCode: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  timezone: z.string().trim().refine(isValidTimeZone, "The pinned location has an invalid timezone."),
  geocodingProvider: z.string().trim().min(2).max(50),
  externalPlaceId: z.string().trim().max(200).nullable(),
  isPublicLocation: z.literal(true, { error: "Confirm that this is a public location." }),
});

export const createStudyWithRouteSchema = z.object({
  ...studyFieldsWithoutCode,
  searchCountryCode: z.enum(["PH", "US"]),
  routeName: z.string().trim().min(3, "Enter a route name.").max(160),
  pickup: pinnedLocationSchema,
  destination: pinnedLocationSchema,
  pickupInstructions: optionalText(500),
  destinationInstructions: optionalText(500),
  routeNotes: optionalText(1000),
  platformServiceIds: z.array(z.string().uuid()).min(1, "Select at least one provider service."),
}).superRefine((value, context) => {
  validateSchedule(value, context);
  if (!value.studyQuestion || value.studyQuestion.length < 10) {
    context.addIssue({ code: "custom", path: ["studyQuestion"], message: "Enter a clear research question." });
  }
  if (!value.isolatedVariable || value.isolatedVariable.length < 2) {
    context.addIssue({ code: "custom", path: ["isolatedVariable"], message: "Enter the isolated variable." });
  }
  if (value.pickup.countryCode !== value.destination.countryCode) {
    context.addIssue({ code: "custom", path: ["destination"], message: "Pickup and destination must be in the same country." });
  }
  if (value.pickup.currencyCode !== value.destination.currencyCode) {
    context.addIssue({ code: "custom", path: ["destination"], message: "Pickup and destination must use the same currency." });
  }
  const samePoint = Math.abs(value.pickup.latitude - value.destination.latitude) < 0.000001
    && Math.abs(value.pickup.longitude - value.destination.longitude) < 0.000001;
  if (samePoint) {
    context.addIssue({ code: "custom", path: ["destination"], message: "Pickup and destination must be different locations." });
  }
});

export type CreateStudyWithRouteInput = z.input<typeof createStudyWithRouteSchema>;
