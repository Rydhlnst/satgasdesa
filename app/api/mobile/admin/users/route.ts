import { createUser, getRoles, getUsers } from "@/src/features/users/actions";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";
import { z } from "zod";

export const dynamic = "force-dynamic";
const createUserRequestSchema = z.object({ name: z.string().trim().min(2).max(255), email: z.string().trim().email().max(255), roleId: z.enum(["PIMPINAN", "BENDAHARA", "PETUGAS_LAPANGAN"]), password: z.string().min(8).max(128) });
export async function GET(request: Request) { return withMobileSession(request, async () => { try { const p = new URL(request.url).searchParams; const [users, roles] = await Promise.all([getUsers({ query: p.get("query") || undefined, status: p.get("status") || undefined, roleId: p.get("roleId") || undefined }), getRoles()]); return Response.json({ users, roles }); } catch (error) { return apiErrorResponse(error); } }); }
export async function POST(request: Request) { return withMobileSession(request, async () => { try { const input = createUserRequestSchema.parse(await request.json()); const data = new FormData(); data.set("name", input.name); data.set("email", input.email); data.set("roleId", input.roleId); data.set("password", input.password); const result = await createUser({ error: null, success: null }, data); if (result.error) return Response.json({ message: result.error, created: false }, { status: 400 }); return Response.json({ message: result.success, created: true }, { status: 201 }); } catch (error) { return apiErrorResponse(error); } }); }
