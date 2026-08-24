import { getRealizations } from "@/src/features/budgets/service";
import { apiErrorResponse, getMobileSession, unauthorizedResponse } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!await getMobileSession(request)) return unauthorizedResponse();
  try {
    const params = new URL(request.url).searchParams;
    const result = await getRealizations({ status: params.get("status") || undefined, budgetItemId: params.get("budgetItemId") || undefined, categoryId: params.get("categoryId") || undefined, periodKey: params.get("periodKey") || undefined, query: params.get("query") || undefined, page: params.get("page") || undefined, pageSize: params.get("pageSize") || undefined });
    const realizations = result.items.map((row) => "realization" in row && row.realization ? { ...row.realization, budgetItemName: row.budgetItemName, groupName: row.groupName, categoryName: row.categoryName, periodKey: row.periodKey } : row);
    return Response.json({ realizations, statusCounts: result.statusCounts, pagination: { page: result.page, pageSize: result.pageSize, total: result.total, totalPages: result.totalPages } });
  } catch (error) { return apiErrorResponse(error); }
}
