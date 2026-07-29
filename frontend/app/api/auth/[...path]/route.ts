import { NextRequest, NextResponse } from 'next/server';

const backendBaseUrl =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:8000';

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

async function proxyRequest(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const endpoint = path.join('/');

  if (endpoint === 'logout' && request.method === 'POST') {
    const response = NextResponse.json({ message: 'Logged out successfully' });
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');
    return response;
  }

  if (endpoint === 'admin/logout' && request.method === 'POST') {
    const response = NextResponse.json({ message: 'Admin logged out successfully' });
    response.cookies.delete('admin_access_token');
    response.cookies.delete('admin_refresh_token');
    return response;
  }

  // Preserve query string
  const url = new URL(request.url);
  const queryString = url.search;
  const targetUrl = `${backendBaseUrl}/api/auth/${endpoint}${queryString}`;

  try {
    const outboundHeaders = new Headers(request.headers);
    outboundHeaders.delete('host');

    const token = request.cookies.get('access_token')?.value;
    if (token) {
      outboundHeaders.set('Authorization', `Bearer ${token}`);
    }

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

    if (!upstreamResponse.ok) {
      const responseBody = await upstreamResponse.arrayBuffer();
      return new NextResponse(responseBody, {
        status: upstreamResponse.status,
        headers: new Headers(upstreamResponse.headers),
      });
    }

    const isUserLoginOrRegister = endpoint === 'login' || endpoint === 'register-user';
    const isAdminLogin = endpoint === 'admin/login';

    if (isUserLoginOrRegister) {
      const data = await upstreamResponse.json();
      const response = NextResponse.json(data);

      if (data.access_token) {
        response.cookies.set({
          name: 'access_token',
          value: data.access_token,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 30 * 60, // 30 minutes
        });
      }

      if (data.refresh_token) {
        response.cookies.set({
          name: 'refresh_token',
          value: data.refresh_token,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60, // 7 days
        });
      }
      return response;
    }

    // Admin login — set separate HttpOnly cookies so the middleware
    // can distinguish admin sessions from regular user sessions.
    if (isAdminLogin) {
      const data = await upstreamResponse.json();
      const response = NextResponse.json(data);

      if (data.access_token) {
        response.cookies.set({
          name: 'admin_access_token',
          value: data.access_token,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 30 * 60, // 30 minutes
        });
      }

      if (data.refresh_token) {
        response.cookies.set({
          name: 'admin_refresh_token',
          value: data.refresh_token,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60, // 7 days
        });
      }
      return response;
    }

    const responseBody = await upstreamResponse.arrayBuffer();
    const responseHeaders = new Headers(upstreamResponse.headers);

    return new NextResponse(responseBody, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
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
