import { getDailyInformationPage } from "@/src/features/daily-information/service";
import { apiErrorResponse, getMobileSession, unauthorizedResponse } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!await getMobileSession(request)) return unauthorizedResponse();
  try {
    const params = new URL(request.url).searchParams;
    return Response.json(await getDailyInformationPage({ query: params.get("query") || undefined, blockId: params.get("blockId") || undefined, category: params.get("category") || undefined, priority: params.get("priority") || undefined, status: params.get("status") || undefined, reportedDate: params.get("reportedDate") || undefined, dateFrom: params.get("dateFrom") || undefined, dateTo: params.get("dateTo") || undefined, mine: params.get("mine") || undefined, page: params.get("page") || undefined, pageSize: params.get("pageSize") || undefined }));
  } catch (error) { return apiErrorResponse(error); }
}
