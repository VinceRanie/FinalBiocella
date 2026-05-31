import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:3000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${API_BASE_URL}/appointments/verify-qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API Route] Verify QR Error:', error);
    return NextResponse.json(
      { error: 'Failed to verify QR code' },
      { status: 500 }
    );
  }
}
