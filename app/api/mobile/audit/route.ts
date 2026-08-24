import { getAuditLogs } from "@/src/features/audit/service";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";
export async function GET(request: Request) { return withMobileSession(request, async () => { try { const p = new URL(request.url).searchParams; return Response.json(await getAuditLogs({ query: p.get("query") || undefined, action: p.get("action") || undefined, entityType: p.get("entityType") || undefined, entityId: p.get("entityId") || undefined, page: p.get("page") || undefined, pageSize: p.get("pageSize") || undefined })); } catch (error) { return apiErrorResponse(error); } }); }
