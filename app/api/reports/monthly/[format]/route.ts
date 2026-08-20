import { NextResponse } from "next/server";

import { exportMonthlyReportExcel, exportMonthlyReportPdf } from "@/src/features/reports/export";
import { getMonthlyReportData } from "@/src/features/reports/service";
import { monthlyReportFormatSchema, monthlyReportPeriodSchema } from "@/src/features/reports/schema";
import { recordAuditEvent } from "@/src/lib/audit";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ format: string }> }) {
  const session = await requirePermission(PERMISSIONS.REPORT_EXPORT);
  const { format } = await context.params;
  const period = new URL(request.url).searchParams.get("period") ?? "";
  const parsedFormat = monthlyReportFormatSchema.safeParse(format);
  const parsedPeriod = monthlyReportPeriodSchema.safeParse({ periodKey: period });
  if (!parsedFormat.success) return NextResponse.json({ error: "Unsupported report format." }, { status: 400 });
  if (!parsedPeriod.success) return NextResponse.json({ error: "Period must use YYYY-MM." }, { status: 400 });
  try {
    const validFormat = parsedFormat.data;
    const validPeriod = parsedPeriod.data.periodKey;
    const report = await getMonthlyReportData(validPeriod);
    const file = validFormat === "pdf" ? await exportMonthlyReportPdf(report) : await exportMonthlyReportExcel(report);
    await recordAuditEvent({ actorUserId: session.user.id, action: "EXPORT", entityType: "MONTHLY_REPORT", entityId: validPeriod, metadata: { period: validPeriod, format: validFormat } });
    return new NextResponse(new Uint8Array(file), { headers: { "Content-Type": validFormat === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename=monthly-report-${validPeriod}.${validFormat}` } });
  } catch {
    return NextResponse.json({ error: "Unable to generate the report." }, { status: 500 });
  }
}
