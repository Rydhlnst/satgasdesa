import { getMyNotifications, markAllNotificationsRead } from "@/src/features/notifications/service";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withMobileSession(request, async () => {
    try {
      const params = new URL(request.url).searchParams;
      return Response.json(await getMyNotifications({
        unreadOnly: params.get("unreadOnly") === "true",
        query: params.get("query") || undefined,
        dateFrom: params.get("dateFrom") || undefined,
        dateTo: params.get("dateTo") || undefined,
        page: params.get("page") || undefined,
        pageSize: params.get("pageSize") || undefined,
      }));
    } catch (error) {
      return apiErrorResponse(error);
    }
  });
}

export async function PATCH(request: Request) {
  return withMobileSession(request, async () => {
    try {
      const body = await request.json() as { action?: string };
      if (body.action !== "markAllRead") return Response.json({ error: "VALIDATION_FAILED", message: "Unsupported notification action." }, { status: 400 });
      return Response.json(await markAllNotificationsRead());
    } catch (error) {
      return apiErrorResponse(error);
    }
  });
}
