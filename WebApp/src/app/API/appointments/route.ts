import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://22102959.dcism.org/biocella-api';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const scopedParams = new URLSearchParams();
    const scope = searchParams.get('scope');

    if (scope === 'self') {
      scopedParams.set('scope', 'self');
    }

    const userId = scope === 'self' ? searchParams.get('user_id') : null;
    const studentId = scope === 'self' ? searchParams.get('student_id') : null;

    if (userId) {
      scopedParams.set('user_id', userId);
    }

    if (studentId) {
      scopedParams.set('student_id', studentId);
    }

    const backendUrl = `${API_BASE_URL}/appointments${
      scopedParams.toString() ? `?${scopedParams.toString()}` : ''
    }`;

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    // Pass through the actual status code from the backend
    if (!response.ok) {
      console.error('Backend error:', response.status, data);
      return NextResponse.json(data, { status: response.status });
    }
    
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Appointment fetch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to fetch appointments',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${API_BASE_URL}/appointments`, {
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
    
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Appointment creation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to create appointment',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
