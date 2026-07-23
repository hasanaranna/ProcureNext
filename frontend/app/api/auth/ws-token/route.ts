import { NextRequest, NextResponse } from 'next/server';

/**
 * Returns the access_token from the httpOnly cookie so the frontend
 * can use it for WebSocket connections (which can't send cookies).
 *
 * This is a server-side route — it CAN read httpOnly cookies.
 * The token is only briefly held in memory on the client for the WS handshake.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;

  if (!token) {
    return NextResponse.json(
      { error: 'No access token found' },
      { status: 401 },
    );
  }

  return NextResponse.json({ token });
}
