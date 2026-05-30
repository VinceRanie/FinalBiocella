import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://22102959.dcism.org/biocella-api';

type RouteContext = {
  params: Promise<{ date: string }>;
};

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { date } = await context.params;
    const response = await fetch(`${API_BASE_URL}/appointments/unavailable-dates/${encodeURIComponent(date)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('[API Route] Remove Unavailable Date Error:', error);
    return NextResponse.json({ error: 'Failed to remove unavailable date' }, { status: 500 });
  }
}
