import { getFundRequests } from "@/src/features/fund-requests/service";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withMobileSession(request, async () => {
    try {
      const params = new URL(request.url).searchParams;
      return Response.json(await getFundRequests({
        status: params.get("status") || undefined,
        periodKey: params.get("periodKey") || undefined,
        dateFrom: params.get("dateFrom") || undefined,
        dateTo: params.get("dateTo") || undefined,
        categoryId: params.get("categoryId") || undefined,
        blockId: params.get("blockId") || undefined,
        mine: params.get("mine") === "true",
        query: params.get("query") || undefined,
        page: params.get("page") || undefined,
        pageSize: params.get("pageSize") || undefined,
      }));
    } catch (error) {
      return apiErrorResponse(error);
    }
  });
}
