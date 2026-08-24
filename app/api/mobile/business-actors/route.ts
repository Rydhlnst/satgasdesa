import { getBusinessActors } from "@/src/features/field-operations/service";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withMobileSession(request, async () => {
    try {
      const params = new URL(request.url).searchParams;
      return Response.json({ actors: await getBusinessActors({ query: params.get("query") ?? undefined, page: params.get("page") ?? undefined, pageSize: params.get("pageSize") ?? undefined }) });
    } catch (error) { return apiErrorResponse(error); }
  });
}
