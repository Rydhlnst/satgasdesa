import { getDailyInformationItem } from "@/src/features/daily-information/service";
import { apiErrorResponse, apiNotFoundResponse, withMobileSession } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return withMobileSession(request, async () => {
    try {
      const item = await getDailyInformationItem((await context.params).id);
      if (!item) return apiNotFoundResponse("Daily information was not found.");
      return Response.json(item);
    } catch (error) { return apiErrorResponse(error); }
  });
}
