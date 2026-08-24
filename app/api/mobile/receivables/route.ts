import { getBlockReceivableSummary } from "@/src/features/dues/service";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withMobileSession(request, async () => {
    try {
      const params = new URL(request.url).searchParams;
      return Response.json({ rows: await getBlockReceivableSummary({ blockId: params.get("blockId") ?? undefined, periodKey: params.get("periodKey") ?? undefined, status: params.get("status") ?? undefined }) });
    } catch (error) { return apiErrorResponse(error); }
  });
}
