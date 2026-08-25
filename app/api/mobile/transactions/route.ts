import { getFinancialTransactionsPage } from "@/src/features/finance/service";
import { apiErrorResponse, getMobileSession, unauthorizedResponse } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!await getMobileSession(request)) return unauthorizedResponse();
  try {
    const params = new URL(request.url).searchParams;
    const result = await getFinancialTransactionsPage({ status: params.get("status") || undefined, transactionType: params.get("transactionType") || undefined, relatedEntityType: params.get("relatedEntityType") || undefined, query: params.get("query") || undefined, periodKey: params.get("periodKey") || undefined, dateFrom: params.get("dateFrom") || undefined, dateTo: params.get("dateTo") || undefined, page: params.get("page") || undefined, pageSize: params.get("pageSize") || undefined });
    return Response.json({ transactions: result.items, pagination: { page: result.page, pageSize: result.pageSize, total: result.total, totalPages: result.totalPages } });
  } catch (error) { return apiErrorResponse(error); }
}
