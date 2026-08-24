import { getExcavator } from "@/src/features/excavators/service";
import { apiErrorResponse, getMobileSession, unauthorizedResponse } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await getMobileSession(request)) return unauthorizedResponse();
  try { const { id } = await context.params; const result = await getExcavator(id); if (!result) return Response.json({ error: "NOT_FOUND", message: "Excavator was not found." }, { status: 404 }); return Response.json(result); } catch (error) { return apiErrorResponse(error); }
}
