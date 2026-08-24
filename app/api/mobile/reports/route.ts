import { getMonthlyReport } from "@/src/features/reports/service";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";
export async function GET(request: Request) { return withMobileSession(request, async () => { try { const period = new URL(request.url).searchParams.get("period") ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit" }).format(new Date()); return Response.json({ report: await getMonthlyReport(period) }); } catch (error) { return apiErrorResponse(error); } }); }
