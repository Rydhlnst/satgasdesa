import { NextResponse } from "next/server";

import { verifyDatabaseConnection } from "@/src/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await verifyDatabaseConnection();
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }
}
