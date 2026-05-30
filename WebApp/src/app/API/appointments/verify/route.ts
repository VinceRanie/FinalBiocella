import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://22102959.dcism.org/biocella-api';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    const id = searchParams.get('id');
    
    const response = await fetch(`${API_BASE_URL}/appointments/verify?token=${token}&id=${id}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API Route] Error:', error);
    return NextResponse.json(
      { error: 'Failed to verify QR code', details: error.message },
      { status: 500 }
    );
  }
}
