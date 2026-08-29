import { NextResponse } from "next/server";

import { verifyDatabaseConnection } from "@/src/db";
import { apiDiagnosticHeaders, getApiDiagnostics } from "@/src/lib/mobile-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const diagnostics = getApiDiagnostics(request.headers.get("x-client-request-id")?.trim() || undefined);
  try {
    await verifyDatabaseConnection();
    const enabled = process.env.DAILY_AUTOMATION_ENABLED === "true";
    const configured = Boolean(process.env.CRON_SECRET?.trim() && process.env.AUTOMATION_ACTOR_USER_ID?.trim());
    return NextResponse.json({ status: "ok", deployment: diagnostics, automation: { enabled, configured: enabled && configured } }, { headers: apiDiagnosticHeaders(diagnostics.requestId) });
  } catch {
    return NextResponse.json({ status: "unavailable", deployment: diagnostics, message: "Database health check failed. Check Coolify logs, database connectivity, and startup migrations." }, { status: 503, headers: apiDiagnosticHeaders(diagnostics.requestId) });
  }
}
