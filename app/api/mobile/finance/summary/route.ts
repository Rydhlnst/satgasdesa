import { getFinanceSummary } from "@/src/features/finance/service";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withMobileSession(request, async () => {
    try { return Response.json({ summary: await getFinanceSummary() }); }
    catch (error) { return apiErrorResponse(error); }
  });
}
