import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/app/API/lib/routeEnv";

export async function POST(request: NextRequest) {
  const env = requireEnv(["NEXT_PUBLIC_API_URL"] as const);
  if (!env.ok) return env.response;
  const API_BASE_URL = env.values.NEXT_PUBLIC_API_URL;

  try {
    const body = await request.json();
    const response = await fetch(`${API_BASE_URL}/auth/finalize-setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Finalize setup proxy error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
