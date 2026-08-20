import { toNextJsHandler } from "better-auth/next-js";

import { createAuth } from "@/src/lib/auth/auth";

export const GET = (request: Request) =>
  toNextJsHandler(createAuth()).GET(request);

export const POST = (request: Request) =>
  toNextJsHandler(createAuth()).POST(request);

export const PATCH = (request: Request) =>
  toNextJsHandler(createAuth()).PATCH(request);

export const PUT = (request: Request) =>
  toNextJsHandler(createAuth()).PUT(request);

export const DELETE = (request: Request) =>
  toNextJsHandler(createAuth()).DELETE(request);
