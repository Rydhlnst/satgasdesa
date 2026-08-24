import { getDuesPage } from "@/src/features/dues/service";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return withMobileSession(request, async () => {
    try {
      const params = new URL(request.url).searchParams;
      const result = await getDuesPage({ status: params.get("status") || undefined, dueType: params.get("dueType") || undefined, blockId: params.get("blockId") || undefined, periodKey: params.get("periodKey") || undefined, query: params.get("query") || undefined, overdueOnly: params.get("overdueOnly") === "true", page: params.get("page") || undefined, pageSize: params.get("pageSize") || undefined });
      const dues = result.rows.map((row) => "due" in row && row.due ? { ...row.due, excavator: row.excavator } : row);
      return Response.json({ dues, pagination: result.pagination });
    } catch (error) { return apiErrorResponse(error); }
  });
}
