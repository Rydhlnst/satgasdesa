import { getFundRequestDetail } from "@/src/features/fund-requests/service";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return withMobileSession(request, async () => {
    try {
      return Response.json(await getFundRequestDetail((await context.params).id));
    } catch (error) {
      return apiErrorResponse(error);
    }
  });
}
