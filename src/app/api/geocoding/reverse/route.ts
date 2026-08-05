import { NextResponse, type NextRequest } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { reverseLocation } from "@/lib/geocoding/nominatim";

export async function GET(request: NextRequest) {
  const identity = await getCurrentIdentity();
  if (!identity || identity.profile.accountStatus !== "active") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!(["admin", "test_coordinator"] as string[]).includes(identity.profile.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const latitude = Number(request.nextUrl.searchParams.get("lat"));
  const longitude = Number(request.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return NextResponse.json({ message: "Invalid map coordinates." }, { status: 400 });
  }
  try {
    return NextResponse.json({ result: await reverseLocation(latitude, longitude) });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Location lookup failed." }, { status: 502 });
  }
}
