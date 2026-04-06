import { NextRequest, NextResponse } from 'next/server';

const backendBaseUrl =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:5000';

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

async function proxyRequest(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const endpoint = path.join('/');

  // Preserve query string
  const url = new URL(request.url);
  const queryString = url.search;
  const targetUrl = `${backendBaseUrl}/api/auth/${endpoint}${queryString}`;

  try {
    const outboundHeaders = new Headers(request.headers);
    outboundHeaders.delete('host');

    let requestBody: BodyInit | undefined;

    if (request.method === 'GET' || request.method === 'HEAD') {
      requestBody = undefined;
    } else {
      const contentType = request.headers.get('content-type') || '';
      if (contentType.includes('multipart/form-data')) {
        // Forward multipart form data as-is (binary body)
        requestBody = await request.arrayBuffer();
      } else {
        requestBody = await request.text();
      }
    }

    const upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers: outboundHeaders,
      body: requestBody,
      cache: 'no-store',
    });

    const responseBody = await upstreamResponse.arrayBuffer();
    const responseHeaders = new Headers(upstreamResponse.headers);

    return new NextResponse(responseBody, {
      status: upstreamResponse.status,
      headers: responseHeaders,
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

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function OPTIONS(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}
