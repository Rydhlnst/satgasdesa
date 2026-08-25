import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { runDailyAutomations } from "@/src/features/automation/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function matchesCronSecret(value: string | null, expected: string): boolean {
  if (!value) return false;
  const supplied = Buffer.from(value);
  const configured = Buffer.from(expected);
  return supplied.length === configured.length && timingSafeEqual(supplied, configured);
}

export async function POST(request: Request) {
  if (process.env.DAILY_AUTOMATION_ENABLED !== "true") return NextResponse.json({ error: "Scheduled automation is disabled." }, { status: 503 });
  const secret = process.env.CRON_SECRET;
  const actorUserId = process.env.AUTOMATION_ACTOR_USER_ID;
  if (!secret || !actorUserId) return NextResponse.json({ error: "Scheduled automation is not configured." }, { status: 503 });
  if (!matchesCronSecret(request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null, secret)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const actor = z.string().uuid().safeParse(actorUserId);
  if (!actor.success) return NextResponse.json({ error: "AUTOMATION_ACTOR_USER_ID must be a UUID." }, { status: 503 });
  return NextResponse.json(await runDailyAutomations(actor.data));
}
