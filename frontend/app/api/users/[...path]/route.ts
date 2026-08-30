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

async function proxyRequest(request: NextRequest, context: RouteContext) {
    const { path } = await context.params;
    const endpoint = path.join('/');

    const url = new URL(request.url);
    const queryString = url.search;
    const targetUrl = `${backendBaseUrl}/api/users/${endpoint}${queryString}`;

    try {
        const outboundHeaders = new Headers(request.headers);
        outboundHeaders.delete('host');

        const token = request.cookies.get('access_token')?.value;
        if (token) {
            outboundHeaders.set('Authorization', `Bearer ${token}`);
        }

        const contentType = request.headers.get('content-type') || '';
        const isMultipart = contentType.includes('multipart/form-data');

        const requestBody =
            request.method === 'GET' || request.method === 'HEAD'
                ? undefined
                : isMultipart
                  ? await request.arrayBuffer()
                  : await request.text();

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
