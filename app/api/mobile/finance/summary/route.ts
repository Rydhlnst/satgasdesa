import { getFinanceSummary } from "@/src/features/finance/service";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withMobileSession(request, async () => {
    try { const params = new URL(request.url).searchParams; return Response.json({ summary: await getFinanceSummary({ dateFrom: params.get("dateFrom") || undefined, dateTo: params.get("dateTo") || undefined }) }); }
    catch (error) { return apiErrorResponse(error); }
  });
}
