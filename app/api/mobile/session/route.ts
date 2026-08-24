import { getMobileSession, unauthorizedResponse } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) return unauthorizedResponse();
  return Response.json({
    user: { id: session.user.id, name: session.user.name, email: session.user.email },
    role: session.role,
    permissions: session.permissions,
  });
}
