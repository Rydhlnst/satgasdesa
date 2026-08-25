import { createInvitedUser, getRoles, getUsers } from "@/src/features/users/actions";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";
import { z } from "zod";

export const dynamic = "force-dynamic";
const createUserRequestSchema = z.object({ name: z.string().trim().min(1).max(255), email: z.string().trim().min(1).max(255), roleId: z.string().trim().min(1).max(64) });
export async function GET(request: Request) { return withMobileSession(request, async () => { try { const p = new URL(request.url).searchParams; const [users, roles] = await Promise.all([getUsers({ query: p.get("query") || undefined, status: p.get("status") || undefined, roleId: p.get("roleId") || undefined }), getRoles()]); return Response.json({ users, roles }); } catch (error) { return apiErrorResponse(error); } }); }
export async function POST(request: Request) { return withMobileSession(request, async () => { try { const input = createUserRequestSchema.parse(await request.json()); const data = new FormData(); data.set("name", input.name); data.set("email", input.email); data.set("roleId", input.roleId); const result = await createInvitedUser({ error: null, success: null }, data); if (result.error) return Response.json({ message: result.error, created: result.error.startsWith("The user was created") }, { status: result.error.startsWith("The user was created") ? 201 : 400 }); return Response.json(result, { status: 201 }); } catch (error) { return apiErrorResponse(error); } }); }
