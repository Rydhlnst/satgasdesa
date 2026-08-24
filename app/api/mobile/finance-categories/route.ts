import { getFinanceCategories } from "@/src/features/finance/service";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withMobileSession(request, async () => {
    try {
      const params = new URL(request.url).searchParams;
      return Response.json({ categories: await getFinanceCategories({ transactionType: params.get("transactionType") || undefined, includeInactive: params.get("includeInactive") === "true", query: params.get("query") || undefined }) });
    } catch (error) { return apiErrorResponse(error); }
  });
}
