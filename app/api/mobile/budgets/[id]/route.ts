import { getBudgetPeriodCategorySummary, getBudgetPeriodDetail } from "@/src/features/budgets/service";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return withMobileSession(request, async () => {
    try {
      const { id } = await context.params;
      const view = new URL(request.url).searchParams.get("view");
      return Response.json(view === "category" ? await getBudgetPeriodCategorySummary(id) : await getBudgetPeriodDetail(id));
    }
    catch (error) { return apiErrorResponse(error); }
  });
}
