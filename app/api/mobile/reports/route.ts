import { getMonthlyReport } from "@/src/features/reports/service";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";
export async function GET(request: Request) { return withMobileSession(request, async () => { try { const params = new URL(request.url).searchParams; const dateFrom = params.get("dateFrom") || undefined; const dateTo = params.get("dateTo") || undefined; const period = params.get("period") ?? dateFrom?.slice(0, 7) ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit" }).format(new Date()); return Response.json({ report: await getMonthlyReport(period, { dateFrom, dateTo }) }); } catch (error) { return apiErrorResponse(error); } }); }
