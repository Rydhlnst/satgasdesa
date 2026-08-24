import { exportMonthlyReportExcel, exportMonthlyReportPdf } from "@/src/features/reports/export";
import { getMonthlyReport } from "@/src/features/reports/service";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { recordAuditEvent } from "@/src/lib/audit";
import { getRequestSession } from "@/src/lib/auth/request-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  return withMobileSession(request, async () => {
    try {
      await requirePermission(PERMISSIONS.REPORT_EXPORT);
      const params = new URL(request.url).searchParams;
      const period = params.get("period") ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit" }).format(new Date());
      const format = params.get("format") === "xlsx" ? "xlsx" : "pdf";
      const report = await getMonthlyReport(period);
      const data = format === "xlsx" ? await exportMonthlyReportExcel(report) : await exportMonthlyReportPdf(report);
      const session = getRequestSession();
      await recordAuditEvent({ actorUserId: session?.user.id, action: "EXPORT", entityType: "REPORT", entityId: period, metadata: { format } });
      return new Response(new Uint8Array(data), { headers: { "Content-Type": format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf", "Content-Disposition": `attachment; filename="satgas-${period}.${format}"` } });
    } catch (error) { return apiErrorResponse(error); }
  });
}
