import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://22102959.dcism.org/biocella-api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!month || !year) {
      return NextResponse.json(
        { error: 'Month and year parameters are required', daysWithAppointments: {}, daysUnavailable: {} },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${API_BASE_URL}/appointments/calendar/overview?month=${month}&year=${year}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      // Return safe response with empty calendar
      return NextResponse.json({
        month,
        year,
        daysWithAppointments: {},
        daysUnavailable: {}
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[API Route] Get Calendar Overview Error:', error);
    // Return safe empty response
    return NextResponse.json({
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      daysWithAppointments: {},
      daysUnavailable: {}
    });
  }
}
