import { NextResponse } from "next/server";
import { requireEnv } from "@/app/API/lib/routeEnv";

export async function POST(req: Request) {
  try {
    const env = requireEnv(["NEXT_PUBLIC_API_URL"] as const);
    if (!env.ok) return env.response;
    const API_BASE_URL = env.values.NEXT_PUBLIC_API_URL;

    const body = await req.json();
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const raw = await response.text();
    let data: Record<string, unknown> = {};

    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      const isVercelProtection = raw.includes("Authentication Required") || raw.includes("Vercel Authentication");
      data = {
        message: isVercelProtection
          ? "Request blocked by Vercel deployment protection. Sign in to Vercel or disable protection for this deployment."
          : "Upstream service returned a non-JSON response.",
      };
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Forgot password proxy error:", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
