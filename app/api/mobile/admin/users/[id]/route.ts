import { assignUserRole, updateUserStatus } from "@/src/features/users/actions";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";
import { z } from "zod";

export const dynamic = "force-dynamic";
const updateUserRequestSchema = z.object({ status: z.enum(["ACTIVE", "INACTIVE"]).optional(), roleId: z.string().trim().min(1).max(64).optional() }).refine((value) => Boolean(value.status) !== Boolean(value.roleId), { message: "Provide exactly one user update." });
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { return withMobileSession(request, async () => { try { const { id } = await context.params; const input = updateUserRequestSchema.parse(await request.json()); const data = new FormData(); data.set("userId", id); if (input.status) { data.set("status", input.status); await updateUserStatus(data); } else if (input.roleId) { data.set("roleId", input.roleId); await assignUserRole(data); } return Response.json({ updated: true }); } catch (error) { return apiErrorResponse(error); } }); }
