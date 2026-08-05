import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSafeNextPath } from "@/lib/auth/safe-next-path";
import { getSupabasePublicEnv, isSupabaseConfigured } from "@/lib/supabase/env";
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
  const isProtectedPath = request.nextUrl.pathname === "/paired-testing-demo"
    || request.nextUrl.pathname.startsWith("/paired-testing-demo/");
  if (!isSupabaseConfigured()) {
    return isProtectedPath ? createLoginRedirect(request, "configuration") : NextResponse.next({ request });
  }

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

  return supabaseResponse;
}
