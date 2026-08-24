import { assignUserRole, updateUserStatus } from "@/src/features/users/actions";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { return withMobileSession(request, async () => { try { const { id } = await context.params; const input = await request.json() as { status?: string; roleId?: string }; const data = new FormData(); data.set("userId", id); if (input.status) { data.set("status", input.status); await updateUserStatus(data); } else if (input.roleId) { data.set("roleId", input.roleId); await assignUserRole(data); } else return Response.json({ message: "status or roleId is required." }, { status: 400 }); return Response.json({ updated: true }); } catch (error) { return apiErrorResponse(error); } }); }
