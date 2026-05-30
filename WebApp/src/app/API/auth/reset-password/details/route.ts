import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/app/API/lib/routeEnv";

export async function GET(request: NextRequest) {
  try {
    const env = requireEnv(["NEXT_PUBLIC_API_URL"] as const);
    if (!env.ok) return env.response;
    const API_BASE_URL = env.values.NEXT_PUBLIC_API_URL;

    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ message: "Token is required." }, { status: 400 });
    }

    const response = await fetch(`${API_BASE_URL}/auth/get-reset-user-by-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();

    if (!response.ok || !data?.user) {
      return NextResponse.json(
        { message: data?.message || "Invalid or expired token." },
        { status: response.status || 401 }
      );
    }

    const user = data.user;

    return NextResponse.json(
      {
        email: user.email,
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        department: user.department || "",
        course: user.course || "",
        profile_photo: user.profile_photo || "",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Reset password details error:", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
