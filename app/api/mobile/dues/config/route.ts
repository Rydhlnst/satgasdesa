import { getDueCreationConfig } from "@/src/features/dues/service";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withMobileSession(request, async () => {
    try {
      return Response.json(await getDueCreationConfig());
    } catch (error) {
      return apiErrorResponse(error);
    }
  });
}
