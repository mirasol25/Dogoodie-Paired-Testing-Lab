import { NextResponse, type NextRequest } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { searchLocations } from "@/lib/geocoding/nominatim";

export async function GET(request: NextRequest) {
  const identity = await getCurrentIdentity();
  if (!identity || identity.profile.accountStatus !== "active") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!(["admin", "test_coordinator"] as string[]).includes(identity.profile.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const country = request.nextUrl.searchParams.get("country")?.toUpperCase();
  if (query.length < 3 || (country !== "PH" && country !== "US")) {
    return NextResponse.json({ message: "Enter a location and select a supported search country." }, { status: 400 });
  }
  try {
    return NextResponse.json({ results: await searchLocations(query, country) });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Location search failed." }, { status: 502 });
  }
}
