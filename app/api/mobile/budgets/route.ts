import { getBudgetPeriods } from "@/src/features/budgets/service";
import { apiErrorResponse, getMobileSession, unauthorizedResponse } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!await getMobileSession(request)) return unauthorizedResponse();
  try {
    const params = new URL(request.url).searchParams;
    const result = await getBudgetPeriods({ status: params.get("status") || undefined, periodKey: params.get("periodKey") || undefined, query: params.get("query") || undefined, page: params.get("page") || undefined, pageSize: params.get("pageSize") || undefined });
    return Response.json({ budgets: result.items, pagination: { page: result.page, pageSize: result.pageSize, total: result.total, totalPages: result.totalPages } });
  } catch (error) { return apiErrorResponse(error); }
}
