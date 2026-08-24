import { getFieldTasks } from "@/src/features/field-work/service";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  return withMobileSession(request, async () => {
    try {
      return Response.json(await getFieldTasks({
        query: params.get("query") ?? undefined,
        status: params.get("status") ?? undefined,
        priority: params.get("priority") ?? undefined,
        blockId: params.get("blockId") ?? undefined,
        mine: params.get("mine") ?? undefined,
        page: params.get("page") ?? undefined,
        pageSize: params.get("pageSize") ?? undefined,
      }));
    } catch (error) { return apiErrorResponse(error); }
  });
}
