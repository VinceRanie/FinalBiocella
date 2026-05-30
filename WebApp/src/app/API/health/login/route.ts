import { NextResponse } from "next/server";
import { query } from "@/app/API/lib/mysql";

export async function GET() {
  const requiredKeys = [
    "JWT_TOKEN",
    "DB_HOST",
    "DB_USER",
    "DB_PASSWORD",
    "DB_NAME",
    "DB_PORT",
  ] as const;

  const missing = requiredKeys.filter((key) => !process.env[key]);

  let dbOk = false;
  let dbError: string | null = null;

  try {
    await query("SELECT 1 as ok");
    dbOk = true;
  } catch (error: unknown) {
    dbError = error instanceof Error ? error.message : "Unknown DB error";
  }

  const jwtConfigured = Boolean(process.env.JWT_TOKEN || process.env.JWT_SECRET);
  const ok = missing.length === 0 && jwtConfigured && dbOk;

  return NextResponse.json(
    {
      ok,
      jwtConfigured,
      missingEnvKeys: missing,
      dbOk,
      dbError,
      note: "Temporary diagnostic endpoint for login 500 troubleshooting.",
    },
    { status: ok ? 200 : 500 }
  );
}
