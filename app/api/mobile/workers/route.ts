import { getFieldWorkers } from "@/src/features/field-work/service";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  return withMobileSession(request, async () => {
    try {
      return Response.json(await getFieldWorkers({
        query: params.get("query") ?? undefined,
        status: params.get("status") ?? undefined,
        blockId: params.get("blockId") ?? undefined,
        page: params.get("page") ?? undefined,
        pageSize: params.get("pageSize") ?? undefined,
      }));
    } catch (error) { return apiErrorResponse(error); }
  });
}
