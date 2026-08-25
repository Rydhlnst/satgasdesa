import { registerPushDevice } from "@/src/features/notifications/service";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withMobileSession(request, async () => {
    try {
      return Response.json(await registerPushDevice(await request.json()));
    } catch (error) {
      return apiErrorResponse(error);
    }
  });
}
