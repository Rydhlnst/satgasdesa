import { getBlockDetails } from "@/src/features/blocks/actions";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return withMobileSession(request, async () => { try { const { id } = await context.params; const block = await getBlockDetails(id); if (!block) return Response.json({ error: "NOT_FOUND", message: "Block was not found." }, { status: 404 }); return Response.json(block); } catch (error) { return apiErrorResponse(error); } });
}
