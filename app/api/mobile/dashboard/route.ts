import { getDashboardSummary, getNeedsAttention } from "@/src/features/dashboard/service";
import { monthlyReportPeriodSchema } from "@/src/features/reports/schema";
import { apiErrorResponse, getMobileSession, unauthorizedResponse } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!await getMobileSession(request)) return unauthorizedResponse();
  try {
    const params = new URL(request.url).searchParams;
    const requestedPeriod = params.get("period");
    const dateFrom = params.get("dateFrom") || undefined;
    const dateTo = params.get("dateTo") || undefined;
    const periodKey = requestedPeriod ? monthlyReportPeriodSchema.parse({ periodKey: requestedPeriod }).periodKey : undefined;
    const [summary, attention] = await Promise.all([getDashboardSummary({ periodKey, dateFrom, dateTo }), getNeedsAttention({ periodKey })]);
    return Response.json({ summary, attention });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
