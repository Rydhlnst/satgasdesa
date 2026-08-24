import { getExcavatorPage } from "@/src/features/excavators/service";
import { apiErrorResponse, getMobileSession, unauthorizedResponse } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!await getMobileSession(request)) return unauthorizedResponse();
  try {
    const params = new URL(request.url).searchParams;
    const result = await getExcavatorPage({ query: params.get("search") || undefined, operatorName: params.get("operatorName") || undefined, status: params.get("status") || undefined, blockId: params.get("blockId") || undefined, page: params.get("page") || undefined, pageSize: params.get("pageSize") || undefined });
    const excavators = result.rows.map((row) => "excavator" in row && row.excavator ? { ...row.excavator, block: row.block } : row);
    return Response.json({ excavators, pagination: result.pagination });
  } catch (error) { return apiErrorResponse(error); }
}
