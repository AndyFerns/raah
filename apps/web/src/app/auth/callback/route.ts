import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const errorDescription = url.searchParams.get("error_description");

  const nextParam = url.searchParams.get("next") ?? "/account";
  const next = nextParam.startsWith("/") ? nextParam : "/account";

  if (errorDescription) {
    return NextResponse.redirect(
      new URL(
        `/auth/sign-in?error=${encodeURIComponent(errorDescription)}`,
        url.origin
      )
    );
  }

  const supabase = await createSupabaseServerClient();

  // OAuth PKCE flow.
  if (code) {
    console.log("[AUTH TRACKING] Exchanging code for session...");
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[AUTH TRACKING] Error exchanging code:", error.message);
      return NextResponse.redirect(
        new URL(
          `/auth/sign-in?error=${encodeURIComponent(error.message)}`,
          url.origin
        )
      );
    }
    console.log("[AUTH TRACKING] Successfully created session for user:", data.user?.email);
  }
  // Email confirmation / recovery / magiclink flow.
  else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (error) {
      return NextResponse.redirect(
        new URL(
          `/auth/sign-in?error=${encodeURIComponent(
            "That confirmation link is no longer valid."
          )}`,
          url.origin
        )
      );
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
