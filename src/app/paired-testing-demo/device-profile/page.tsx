import { DeviceProfileForm } from "@/components/paired-testing/profile/device-profile-form";
import { PageHeader } from "@/components/paired-testing/shared/page-header";
import { requireActiveUser } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export default async function DeviceProfilePage() {
  const identity = await requireActiveUser("/paired-testing-demo/device-profile");
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("network_type,device_type,operating_system,operating_system_version,app_version,tester_country_name,tester_country_code").eq("id", identity.user.id).single();
  if (error) throw new Error("Your device profile could not be loaded.");

  return <div className="space-y-7">
    <PageHeader eyebrow="Account" title="Device profile" description="Manage the device information reused as the default for future paired-testing assignments." />
    <DeviceProfileForm initial={{ networkType: data.network_type ?? "", deviceType: data.device_type ?? "", operatingSystem: data.operating_system ?? "", operatingSystemVersion: data.operating_system_version ?? "", appVersion: data.app_version ?? "" }} countryName={data.tester_country_name} countryCode={data.tester_country_code} />
  </div>;
}

