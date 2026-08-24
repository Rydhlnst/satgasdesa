import { getInspections } from "@/src/features/inspections/service";
import { apiErrorResponse, getMobileSession, unauthorizedResponse } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!await getMobileSession(request)) return unauthorizedResponse();
  try {
    const params = new URL(request.url).searchParams;
    return Response.json({ inspections: await getInspections({ blockId: params.get("blockId") || undefined, status: params.get("status") || undefined, mine: params.get("mine") === "true", query: params.get("query") || undefined, dateFrom: params.get("dateFrom") || undefined, dateTo: params.get("dateTo") || undefined }) });
  } catch (error) { return apiErrorResponse(error); }
}
