import { getSystemSettings, updateSystemSettings } from "@/src/features/settings/service";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";
export async function GET(request: Request) { return withMobileSession(request, async () => { try { return Response.json({ settings: await getSystemSettings() }); } catch (error) { return apiErrorResponse(error); } }); }
export async function PATCH(request: Request) { return withMobileSession(request, async () => { try { return Response.json({ settings: await updateSystemSettings(await request.json()) }); } catch (error) { return apiErrorResponse(error); } }); }
