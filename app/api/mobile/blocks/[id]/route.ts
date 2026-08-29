import { getBlockDetails } from "@/src/features/blocks/actions";
import { apiErrorResponse, apiNotFoundResponse, withMobileSession } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return withMobileSession(request, async () => { try { const { id } = await context.params; const block = await getBlockDetails(id); if (!block) return apiNotFoundResponse("Block was not found."); return Response.json(block); } catch (error) { return apiErrorResponse(error); } });
}
