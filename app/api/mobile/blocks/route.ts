import { getBlocks } from "@/src/features/blocks/actions";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  return withMobileSession(request, async () => { try { return Response.json({ blocks: await getBlocks(url.searchParams.get("search") ?? undefined, url.searchParams.get("status") ?? undefined, { priority: url.searchParams.get("priority") ?? undefined, includeArchived: url.searchParams.get("includeArchived") === "true" }) }); } catch (error) { return apiErrorResponse(error); } });
}
