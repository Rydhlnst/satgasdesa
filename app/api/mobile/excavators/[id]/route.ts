import { getExcavator } from "@/src/features/excavators/service";
import { apiErrorResponse, apiNotFoundResponse, getMobileSession, unauthorizedResponse } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await getMobileSession(request)) return unauthorizedResponse();
  try { const { id } = await context.params; const result = await getExcavator(id); if (!result) return apiNotFoundResponse("Excavator was not found."); return Response.json(result); } catch (error) { return apiErrorResponse(error); }
}
