import { NextResponse } from "next/server";

import { verifyDatabaseConnection } from "@/src/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await verifyDatabaseConnection();
    const enabled = process.env.DAILY_AUTOMATION_ENABLED === "true";
    const configured = Boolean(process.env.CRON_SECRET?.trim() && process.env.AUTOMATION_ACTOR_USER_ID?.trim());
    return NextResponse.json({ status: "ok", automation: { enabled, configured: enabled && configured } });
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }
}
