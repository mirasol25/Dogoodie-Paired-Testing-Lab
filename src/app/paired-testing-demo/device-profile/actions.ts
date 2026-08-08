"use server";

import { revalidatePath } from "next/cache";
import { requireActiveUser } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { deviceProfileSchema } from "@/lib/validation/device-profile-schemas";

export async function updateDeviceProfileAction(input: unknown): Promise<{ ok: boolean; message: string }> {
  await requireActiveUser("/paired-testing-demo/device-profile");
  const parsed = deviceProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message || "The device profile is invalid." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_own_device_profile", {
    p_network_type: parsed.data.networkType,
    p_device_type: parsed.data.deviceType,
    p_operating_system: parsed.data.operatingSystem,
    p_operating_system_version: parsed.data.operatingSystemVersion,
    p_app_version: parsed.data.appVersion,
  });
  if (error) return { ok: false, message: error.message || "The device profile could not be updated." };

  revalidatePath("/paired-testing-demo/device-profile");
  revalidatePath("/paired-testing-demo/assignments", "layout");
  return { ok: true, message: "Device profile updated for future studies." };
}

