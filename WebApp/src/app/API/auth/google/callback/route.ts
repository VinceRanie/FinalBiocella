import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { requireEnv } from "@/app/API/lib/routeEnv";

// Google redirects here after the user signs in.
// Fetch their profile, verify the email matches the one they registered,
// then redirect to the finalize form with profile data in the URL.

export async function GET(request: NextRequest) {
  const env = requireEnv(["NEXT_PUBLIC_API_URL"] as const);
  if (!env.ok) return env.response;

  const API_BASE_URL = env.values.NEXT_PUBLIC_API_URL;
  const clientId = process.env.GMAIL_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = request.headers.get("host");
  const requestOrigin = new URL(request.url).origin;

  const forwardedOrigin =
    forwardedProto && forwardedHost
      ? `${forwardedProto.split(",")[0].trim()}://${forwardedHost.split(",")[0].trim()}`
      : null;

  const hostOrigin = host
    ? `${request.nextUrl.protocol.replace(":", "") || "https"}://${host}`
    : null;

  const APP_BASE_URL = (
    process.env.NEXT_PUBLIC_APP_BASE_URL || forwardedOrigin || hostOrigin || requestOrigin
  ).replace(/\/+$/, "");

  if (!clientId || !clientSecret) {
    console.error(
      "Server misconfiguration: Missing Google OAuth credentials. " +
        "Expected GMAIL_CLIENT_ID (or NEXT_PUBLIC_GOOGLE_CLIENT_ID) and GMAIL_CLIENT_SECRET (or GOOGLE_CLIENT_SECRET)."
    );
    return NextResponse.redirect(
      `${APP_BASE_URL}/signup/finalize?error=${encodeURIComponent("Google authentication is not configured on the server.")}`
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    `${APP_BASE_URL}/API/auth/google/callback`
  );

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // this is the registration token

  const baseUrl = APP_BASE_URL;
  const errorRedirect = (msg: string) =>
    NextResponse.redirect(
      `${baseUrl}/signup/finalize?error=${encodeURIComponent(msg)}`
    );

  if (!code || !state) {
    return errorRedirect("Missing authorization code or token.");
  }

  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch Google profile
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();

    if (!profile.email) {
      return errorRedirect("Could not retrieve email from Google.");
    }

    const reverifyState = (() => {
      if (!state) return null;
      try {
        const parsed = JSON.parse(state);
        return parsed && parsed.purpose === "reverify" ? parsed : null;
      } catch {
        return null;
      }
    })();

    if (reverifyState) {
      if (String(reverifyState.email || "").toLowerCase() !== profile.email.toLowerCase()) {
        return errorRedirect(
          `Email mismatch. Please sign in with ${reverifyState.email} to complete re-verification.`
        );
      }

      const completionResponse = await fetch(`${API_BASE_URL}/auth/complete-reverification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: reverifyState.email }),
      });

      const completionData = await completionResponse.json();
      if (!completionResponse.ok) {
        return errorRedirect(completionData?.message || "Unable to complete re-verification.");
      }

      return NextResponse.redirect(`${baseUrl}/Login?reverified=true`);
    }

    // Validate token and fetch user from backend API.
    // This avoids requiring DB credentials in the frontend deployment.
    const userResponse = await fetch(`${API_BASE_URL}/auth/get-user-by-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: state }),
    });

    const raw = await userResponse.text();
    let parsed;
    try {
      parsed = raw ? JSON.parse(raw) : {};
    } catch {
      parsed = {};
    }

    const user = parsed?.user;

    if (!userResponse.ok || !user) {
      return errorRedirect(parsed?.message || "Invalid or expired registration link.");
    }

    if (Number(user.is_setup_complete) === 1) {
      return errorRedirect("Account setup is already complete. Please log in.");
    }

    // Verify the Google email matches the registered email
    if (profile.email.toLowerCase() !== user.email.toLowerCase()) {
      return errorRedirect(
        `Email mismatch. You registered with ${user.email} but signed in with ${profile.email}. Please use the correct Google account.`
      );
    }

    // Build redirect URL with profile data
    const finalizeUrl = new URL(`${baseUrl}/signup/finalize`);
    finalizeUrl.searchParams.set("token", state);
    finalizeUrl.searchParams.set("first_name", profile.given_name || "");
    finalizeUrl.searchParams.set("last_name", profile.family_name || "");
    finalizeUrl.searchParams.set("photo", profile.picture || "");
    finalizeUrl.searchParams.set("email", user.email);
    finalizeUrl.searchParams.set("role", String(user.role || "student"));
    finalizeUrl.searchParams.set("verified", "true");

    return NextResponse.redirect(finalizeUrl.toString());
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return errorRedirect("Google authentication failed. Please try again.");
  }
}
