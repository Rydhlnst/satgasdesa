import { toNextJsHandler } from "better-auth/next-js";

import { createAuth } from "@/src/lib/auth/auth";
import { checkRateLimit, rateLimitedResponse, requestAddress } from "@/src/lib/rate-limit";

function limited(request: Request, handler: (request: Request) => Promise<Response>) {
  const pathname = new URL(request.url).pathname;
  if (/sign-in|request-password-reset|reset-password|change-password/i.test(pathname)) {
    const result = checkRateLimit(`auth:${requestAddress(request)}:${pathname}`, 10, 15 * 60 * 1000);
    if (!result.allowed) return Promise.resolve(rateLimitedResponse(result.retryAfterSeconds));
  }
  return handler(request);
}

export const GET = (request: Request) => limited(request, (value) => toNextJsHandler(createAuth()).GET(value));

export const POST = (request: Request) => limited(request, (value) => toNextJsHandler(createAuth()).POST(value));

export const PATCH = (request: Request) => limited(request, (value) => toNextJsHandler(createAuth()).PATCH(value));

export const PUT = (request: Request) => limited(request, (value) => toNextJsHandler(createAuth()).PUT(value));

export const DELETE = (request: Request) => limited(request, (value) => toNextJsHandler(createAuth()).DELETE(value));
