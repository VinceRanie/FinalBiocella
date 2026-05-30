import { NextRequest, NextResponse } from "next/server";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://22102959.dcism.org/biocella-api";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const toUserId = (value: string | null) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");

    if (!id) {
      return NextResponse.json({ error: "Report ID is required" }, { status: 400 });
    }

    if (!toUserId(userId)) {
      return NextResponse.json({ error: "Valid user_id is required" }, { status: 400 });
    }

    const response = await fetch(`${API_BASE_URL}/reports/${id}?user_id=${encodeURIComponent(userId as string)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("[API Route] Delete Report Error:", error);
    return NextResponse.json({ error: "Failed to delete report" }, { status: 500 });
  }
}
