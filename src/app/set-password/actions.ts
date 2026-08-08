"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth/server";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { setPasswordSchema } from "@/lib/validation/account-schemas";
import { reverseLocation } from "@/lib/geocoding/nominatim";

export interface SetPasswordState {
  message?: string;
  fieldErrors?: Partial<Record<"password" | "confirmPassword" | "latitude" | "longitude" | "networkType" | "deviceType" | "operatingSystem" | "operatingSystemVersion" | "appVersion", string[]>>;
}

export async function setPasswordAction(
  _previousState: SetPasswordState,
  formData: FormData,
): Promise<SetPasswordState> {
  const parsed = setPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    latitude: formData.get("latitude"), longitude: formData.get("longitude"),
    networkType: formData.get("networkType"), deviceType: formData.get("deviceType"),
    operatingSystem: formData.get("operatingSystem"), operatingSystemVersion: formData.get("operatingSystemVersion"),
    appVersion: formData.get("appVersion"), browserLanguage: formData.get("browserLanguage"),
    browserTimezone: formData.get("browserTimezone"), screenSize: formData.get("screenSize"), userAgent: formData.get("userAgent"),
  });
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return { message: "Check the highlighted fields.", fieldErrors: errors };
  }

  const user = await getCurrentUser();
  if (!user) return { message: "This invitation is invalid or has expired. Ask an administrator for a new invitation." };
  if (!isSupabaseAdminConfigured()) return { message: "Account activation is not configured. Contact an administrator." };
  if (user.user_metadata.password_setup_required !== true) redirect("/paired-testing-demo");

  const admin = createAdminClient();
  const { data: currentProfile, error: currentProfileError } = await admin
    .from("profiles")
    .select("account_status,tester_country_code")
    .eq("id", user.id)
    .maybeSingle();
  if (currentProfileError || !currentProfile) {
    return { message: "The invited profile is unavailable. Contact an administrator." };
  }
  if (currentProfile.account_status === "disabled") {
    return { message: "This account cannot be activated from an invitation. Contact an administrator." };
  }

  const requestHeaders = await headers();
  const ipCountry = (requestHeaders.get("x-vercel-ip-country") || requestHeaders.get("cf-ipcountry") || "").toUpperCase();
  const registrationIp = (requestHeaders.get("x-forwarded-for")?.split(",")[0] || requestHeaders.get("x-real-ip") || "").trim() || null;
  let gpsCountry = "";
  if (parsed.data.latitude !== undefined && parsed.data.longitude !== undefined) {
    try {
      gpsCountry = (await reverseLocation(parsed.data.latitude, parsed.data.longitude)).countryCode;
    } catch (error) {
      return { message: error instanceof Error ? error.message : "Your country could not be verified." };
    }
  }
  const verifiedCountryCode = gpsCountry || (["PH", "US"].includes(ipCountry) ? ipCountry : "");
  if (!verifiedCountryCode) return { message: "Your country could not be detected. Allow location access and try again." };
  const verifiedCountryName = verifiedCountryCode === "PH" ? "Philippines" : "United States";
  const locationReviewStatus = gpsCountry && ipCountry && ipCountry !== gpsCountry ? "review_required" : "verified";

  const supabase = await createClient();
  const { error: passwordError } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (passwordError) return { message: passwordError.message || "The password could not be created." };

  const { error: profileUpdateError } = await admin
    .from("profiles")
    .update({
      account_status: "active", tester_country_code: verifiedCountryCode, tester_country_name: verifiedCountryName,
      network_type: parsed.data.networkType, device_type: parsed.data.deviceType,
      operating_system: parsed.data.operatingSystem, operating_system_version: parsed.data.operatingSystemVersion,
      app_version: parsed.data.appVersion, registration_latitude: parsed.data.latitude,
      registration_longitude: parsed.data.longitude, registration_ip: registrationIp,
      ip_country_code: ipCountry || null, location_review_status: locationReviewStatus,
      browser_language: parsed.data.browserLanguage || null, browser_timezone: parsed.data.browserTimezone || null,
      screen_size: parsed.data.screenSize || null, registration_user_agent: parsed.data.userAgent || null,
      device_profile_created_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .eq("account_status", "pending");
  if (profileUpdateError) return { message: profileUpdateError.message || "Your tester location could not be saved." };

  // PostgREST may report an update-response error after the database has
  // committed the change. The persisted profile state is authoritative.
  const { data: finalProfile, error: finalProfileError } = await admin
    .from("profiles")
    .select("account_status,tester_country_code,device_type")
    .eq("id", user.id)
    .maybeSingle();
  if (finalProfileError || finalProfile?.account_status !== "active" || finalProfile.tester_country_code !== verifiedCountryCode || finalProfile.device_type !== parsed.data.deviceType) {
    return { message: "Your password was saved, but the account could not be activated. Contact an administrator." };
  }

  const { error: metadataError } = await supabase.auth.updateUser({
    data: {
      password_setup_required: false,
      password_setup_completed_at: new Date().toISOString(),
    },
  });
  if (metadataError) {
    return { message: "Your password was saved, but setup could not be completed. Try again." };
  }

  redirect("/paired-testing-demo");
}
