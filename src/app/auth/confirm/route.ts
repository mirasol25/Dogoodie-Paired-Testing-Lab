import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const allowedTypes = new Set<EmailOtpType>(["invite", "recovery"]);

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const successPath = type === "recovery" ? "/reset-password" : "/set-password";
  const successUrl = new URL(successPath, request.url);

  if (tokenHash && type && allowedTypes.has(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(successUrl);
  }

  const code = request.nextUrl.searchParams.get("code");
  if (code && type && allowedTypes.has(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(successUrl);
  }

  const errorUrl = new URL("/login", request.url);
  errorUrl.searchParams.set("error", type === "recovery" || code ? "invalid_recovery" : "invalid_invitation");
  return NextResponse.redirect(errorUrl);
}
