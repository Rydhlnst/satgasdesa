import { getFieldTask } from "@/src/features/field-work/service";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return withMobileSession(request, async () => {
    try { return Response.json({ item: await getFieldTask((await context.params).id) }); } catch (error) { return apiErrorResponse(error); }
  });
}
