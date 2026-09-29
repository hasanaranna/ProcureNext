import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
const backendBaseUrl =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:8000';

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

// Proxies /api/audit/* to the backend's admin-only /admin/audit/* endpoints.
async function proxyRequest(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const endpoint = path.join('/');

  const url = new URL(request.url);
  const targetUrl = `${backendBaseUrl}/admin/audit/${endpoint}${url.search}`;

  try {
    const outboundHeaders = new Headers(request.headers);
    outboundHeaders.delete('host');

    // Audit endpoints are admin-only, so only the admin session token is forwarded.
    const token = request.cookies.get('admin_access_token')?.value;
    if (token) {
      outboundHeaders.set('Authorization', `Bearer ${token}`);
    }

    const requestBody =
      request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text();

    const upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers: outboundHeaders,
      body: requestBody,
      cache: 'no-store',
    });

    const responseBody = await upstreamResponse.arrayBuffer();
    return new NextResponse(responseBody, {
      status: upstreamResponse.status,
      headers: new Headers(upstreamResponse.headers),
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: 'BAD_GATEWAY',
          message: 'Unable to reach backend API service.',
          status: 502,
        },
      },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}
