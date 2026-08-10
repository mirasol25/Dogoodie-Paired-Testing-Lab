import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSafeNextPath } from "@/lib/auth/safe-next-path";
import { getSupabasePublicEnv, isSupabaseConfigured } from "@/lib/supabase/env";
import { ACTIVE_STUDY_COOKIE, ACTIVE_STUDY_COOKIE_MAX_AGE } from "@/lib/study-context";
import type { Database } from "@/types/database.types";

function requestedInternalPath(request: NextRequest): string {
  return `${request.nextUrl.pathname}${request.nextUrl.search}`;
}

function copySessionCookies(source: NextResponse, target: NextResponse): NextResponse {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = source.headers.get(header);
    if (value) target.headers.set(header, value);
  }
  return target;
}

export function createLoginRedirect(request: NextRequest, error?: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", getSafeNextPath(requestedInternalPath(request)));
  if (error) url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const protectedRoots = [
    "/dashboard", "/protocol", "/assignments", "/pairs", "/evidence",
    "/audit", "/reports", "/admin", "/device-profile", "/studies",
    "/submission", "/review-studies", "/tester-studies", "/view-studies",
  ];
  const isProtectedPath = request.nextUrl.pathname === "/"
    || request.nextUrl.pathname === "/paired-testing-demo"
    || request.nextUrl.pathname.startsWith("/paired-testing-demo/")
    || protectedRoots.some((root) => request.nextUrl.pathname === root || request.nextUrl.pathname.startsWith(`${root}/`));
  if (!isSupabaseConfigured()) {
    return isProtectedPath ? createLoginRedirect(request, "configuration") : NextResponse.next({ request });
  }

  const scopedStudyId = request.nextUrl.pathname.match(/^\/(?:paired-testing-demo\/)?studies\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:\/|$)/i)?.[1];
  if (scopedStudyId) request.cookies.set(ACTIVE_STUDY_COOKIE, scopedStudyId);

  let supabaseResponse = NextResponse.next({ request });
  const { url, publishableKey } = getSupabasePublicEnv();
  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headersToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
        Object.entries(headersToSet).forEach(([name, value]) => {
          supabaseResponse.headers.set(name, value);
        });
      },
    },
  });

  // Keep this immediately after client creation. It validates the access token
  // and refreshes cookies when needed; getSession() is not trusted here.
  const { data, error } = await supabase.auth.getClaims();
  const hasVerifiedUser = !error && Boolean(data?.claims?.sub);

  if (!hasVerifiedUser && isProtectedPath) {
    return copySessionCookies(supabaseResponse, createLoginRedirect(request));
  }

  if (scopedStudyId) {
    supabaseResponse.cookies.set(ACTIVE_STUDY_COOKIE, scopedStudyId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ACTIVE_STUDY_COOKIE_MAX_AGE,
    });
  }

  return supabaseResponse;
}
