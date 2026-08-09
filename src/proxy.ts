import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/", "/login", "/paired-testing-demo/:path*", "/dashboard/:path*",
    "/protocol/:path*", "/assignments/:path*", "/pairs/:path*",
    "/evidence/:path*", "/audit/:path*", "/reports/:path*",
    "/admin/:path*", "/device-profile/:path*", "/studies/:path*",
    "/submission/:path*", "/review-studies/:path*",
    "/tester-studies/:path*", "/view-studies/:path*",
  ],
};
