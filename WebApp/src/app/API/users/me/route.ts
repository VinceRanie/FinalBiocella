import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://22102959.dcism.org/biocella-api';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${API_BASE_URL}/users/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      // If backend returns 404 or 500, return 400 so frontend knows to fallback
      return NextResponse.json(
        { error: 'User endpoint not available, please use stored session' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[API Route] Get User Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user information' },
      { status: 404 }
    );
  }
}
