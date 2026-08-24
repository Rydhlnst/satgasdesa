import { getFinancialTransaction } from "@/src/features/finance/service";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";

export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return withMobileSession(request, async () => {
    try {
      const item = await getFinancialTransaction((await context.params).id);
      if (!item) return Response.json({ error: "NOT_FOUND", message: "Transaction was not found." }, { status: 404 });
      return Response.json({ item });
    } catch (error) { return apiErrorResponse(error); }
  });
}
