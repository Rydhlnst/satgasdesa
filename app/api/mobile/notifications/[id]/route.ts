import { markNotificationRead } from "@/src/features/notifications/service";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return withMobileSession(request, async () => {
    try {
      return Response.json(await markNotificationRead((await context.params).id));
    } catch (error) {
      return apiErrorResponse(error);
    }
  });
}
