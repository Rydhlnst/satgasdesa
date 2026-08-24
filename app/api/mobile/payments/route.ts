import { getDuePaymentsPage } from "@/src/features/dues/service";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withMobileSession(request, async () => {
    try {
      const params = new URL(request.url).searchParams;
      const result = await getDuePaymentsPage({ blockId: params.get("blockId") || undefined, periodKey: params.get("periodKey") || undefined, query: params.get("query") || undefined, page: params.get("page") || undefined, pageSize: params.get("pageSize") || undefined });
      return Response.json({ payments: result.rows.map((row) => ({ ...row.payment, due: row.due, block: row.block, cashStatus: row.cashStatus ?? "MISSING" })), pagination: result.pagination });
    } catch (error) { return apiErrorResponse(error); }
  });
}
