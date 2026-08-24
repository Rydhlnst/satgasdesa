import { getDashboardSummary, getNeedsAttention } from "@/src/features/dashboard/service";
import { monthlyReportPeriodSchema } from "@/src/features/reports/schema";
import { apiErrorResponse, getMobileSession, unauthorizedResponse } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!await getMobileSession(request)) return unauthorizedResponse();
  try {
    const requestedPeriod = new URL(request.url).searchParams.get("period");
    const periodKey = requestedPeriod ? monthlyReportPeriodSchema.parse({ periodKey: requestedPeriod }).periodKey : undefined;
    const [summary, attention] = await Promise.all([getDashboardSummary({ periodKey }), getNeedsAttention({ periodKey })]);
    return Response.json({ summary, attention });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
