import { NextResponse } from "next/server";
import { requireEnv } from "@/app/API/lib/routeEnv";

export async function POST(req: Request) {
    try {
        const env = requireEnv(["NEXT_PUBLIC_API_URL"] as const);
        if (!env.ok) return env.response;
        const API_BASE_URL = env.values.NEXT_PUBLIC_API_URL;

        const body = await req.json();
        const backendResponse = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const raw = await backendResponse.text();
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

        const response = NextResponse.json(data, { status: backendResponse.status });

        const token = typeof data?.token === "string" ? data.token : null;
        if (backendResponse.ok && token) {
            response.cookies.set("auth_token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/",
                maxAge: 60 * 60,
            });
        }

        return response;
    }
    catch (error: unknown ){
        console.error("Login proxy error", error);
        return NextResponse.json(
            { message: "An unexpected error occurred during login." },
            { status: 500 }
        );
    }
}


