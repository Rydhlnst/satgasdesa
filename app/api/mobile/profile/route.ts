import { getMyProfile, updateMyProfile } from "@/src/features/profile/service";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withMobileSession(request, async () => {
    try {
      return Response.json({ profile: await getMyProfile() });
    } catch (error) {
      return apiErrorResponse(error);
    }
  });
}

export async function PATCH(request: Request) {
  return withMobileSession(request, async () => {
    try {
      return Response.json({ profile: await updateMyProfile(await request.json()) });
    } catch (error) {
      return apiErrorResponse(error);
    }
  });
}
