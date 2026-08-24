import { getBudgetCategories } from "@/src/features/budgets/service";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withMobileSession(request, async () => {
    try {
      const params = new URL(request.url).searchParams;
      return Response.json({
        categories: await getBudgetCategories({
          categoryId: params.get("categoryId") || undefined,
          includeInactive: params.get("includeInactive") === "true",
          query: params.get("query") || undefined,
        }),
      });
    } catch (error) {
      return apiErrorResponse(error);
    }
  });
}
