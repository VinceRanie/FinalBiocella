import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET(request: NextRequest) {
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

  const appBaseUrl = (
    process.env.NEXT_PUBLIC_APP_BASE_URL || forwardedOrigin || hostOrigin || requestOrigin
  ).replace(/\/+$/, "");

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { message: "Google authentication is not configured on the server." },
      { status: 500 }
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    `${appBaseUrl}/API/auth/google/callback`
  );

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ message: "Email is required." }, { status: 400 });
  }

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
    state: JSON.stringify({ purpose: "reverify", email }),
    prompt: "select_account",
  });

  return NextResponse.redirect(authUrl);
}