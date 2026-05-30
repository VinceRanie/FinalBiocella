import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://22102959.dcism.org/biocella-api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ status: string }> }
) {
  try {
    const { status } = await params;
    const validStatuses = ['pending', 'approved', 'denied', 'ongoing', 'visited'];
    
    console.log(`[API Route] Fetching appointments with status: ${status}`);
    console.log(`[API Route] Environment: ${process.env.NODE_ENV}`);
    console.log(`[API Route] API_BASE_URL from env: ${process.env.NEXT_PUBLIC_API_URL || 'NOT SET'}`);
    console.log(`[API Route] Using API_BASE_URL: ${API_BASE_URL}`);
    
    // Validate status
    if (!validStatuses.includes(status.toLowerCase())) {
      console.warn(`[API Route] Invalid status: ${status}`);
      return NextResponse.json(
        { error: 'Invalid status', validStatuses },
        { status: 400 }
      );
    }
    
    const fullUrl = `${API_BASE_URL}/appointments/status/${status}`;
    console.log(`[API Route] Attempting fetch to: ${fullUrl}`);
    
    let response;
    try {
      response = await fetch(fullUrl, {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      console.log(`[API Route] Response status: ${response.status}`);
    } catch (fetchError: any) {
      console.error(`[API Route] Fetch failed with error:`, {
        message: fetchError.message,
        code: fetchError.code,
        errorno: fetchError.errorno,
        syscall: fetchError.syscall,
        hostname: fetchError.hostname,
        url: fullUrl,
        backend_url: API_BASE_URL
      });
      
      return NextResponse.json(
        { 
          error: 'Failed to reach backend API server',
          backendUrl: API_BASE_URL,
          fetchError: fetchError.message,
          details: 'Please ensure the backend API server is running and accessible',
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      );
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API Route] Backend error ${response.status}:`, errorText);
      return NextResponse.json(
        { 
          error: `Backend returned ${response.status}`, 
          details: errorText,
          timestamp: new Date().toISOString()
        },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log(`[API Route] Successfully fetched ${Array.isArray(data) ? data.length : 0} appointments`);
    
    // Add cache control headers to prevent browser caching
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    return new NextResponse(JSON.stringify(data), { headers, status: 200 });
  } catch (error: any) {
    console.error('[API Route] Error:', error.message, error.stack);
    return NextResponse.json(
      { 
        error: 'Failed to fetch appointments', 
        message: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
