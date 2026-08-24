import { getAssignedBlocks, getBlockFieldAssignments } from "@/src/features/field-operations/service";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withMobileSession(request, async () => {
    try { return Response.json({ blocks: await getAssignedBlocks(), assignments: await getBlockFieldAssignments() }); } catch (error) { return apiErrorResponse(error); }
  });
}
