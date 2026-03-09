import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/gmail";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    console.error("OAuth error:", error);
    const redirectUrl = new URL("/communications", request.url);
    redirectUrl.searchParams.set("gmail_error", error);
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    const redirectUrl = new URL("/communications", request.url);
    redirectUrl.searchParams.set("gmail_error", "no_code");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    await exchangeCodeForTokens(code);
    const redirectUrl = new URL("/communications", request.url);
    redirectUrl.searchParams.set("gmail_connected", "true");
    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error("Token exchange error:", err);
    const redirectUrl = new URL("/communications", request.url);
    redirectUrl.searchParams.set("gmail_error", "token_exchange_failed");
    return NextResponse.redirect(redirectUrl);
  }
}
