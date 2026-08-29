import { describe, expect, it, vi } from "vitest";

vi.mock("@/src/lib/mobile-api", () => ({
  getMobileSession: vi.fn().mockResolvedValue(null),
  unauthorizedResponse: () => Response.json({ error: "UNAUTHORIZED", message: "Your session is invalid or expired." }, { status: 401 }),
  withMobileSession: () => Response.json({ error: "UNAUTHORIZED", message: "Your session is invalid or expired." }, { status: 401 }),
  apiErrorResponse: () => Response.json({ error: "REQUEST_FAILED", message: "Unable to process the request." }, { status: 500 }),
}));

type RouteModule = Record<string, unknown>;
type RouteCase = { name: string; method: "GET" | "POST" | "PATCH"; load: () => Promise<RouteModule>; detail?: boolean };

const cases: RouteCase[] = [
  { name: "admin settings GET", method: "GET", load: () => import("@/app/api/mobile/admin/settings/route") },
  { name: "admin settings PATCH", method: "PATCH", load: () => import("@/app/api/mobile/admin/settings/route") },
  { name: "admin users GET", method: "GET", load: () => import("@/app/api/mobile/admin/users/route") },
  { name: "admin users POST", method: "POST", load: () => import("@/app/api/mobile/admin/users/route") },
  { name: "admin user PATCH", method: "PATCH", detail: true, load: () => import("@/app/api/mobile/admin/users/[id]/route") },
  { name: "assignments GET", method: "GET", load: () => import("@/app/api/mobile/assignments/route") },
  { name: "audit GET", method: "GET", load: () => import("@/app/api/mobile/audit/route") },
  { name: "blocks GET", method: "GET", load: () => import("@/app/api/mobile/blocks/route") },
  { name: "block detail GET", method: "GET", detail: true, load: () => import("@/app/api/mobile/blocks/[id]/route") },
  { name: "budget categories GET", method: "GET", load: () => import("@/app/api/mobile/budget-categories/route") },
  { name: "budgets GET", method: "GET", load: () => import("@/app/api/mobile/budgets/route") },
  { name: "budget detail GET", method: "GET", detail: true, load: () => import("@/app/api/mobile/budgets/[id]/route") },
  { name: "business actors GET", method: "GET", load: () => import("@/app/api/mobile/business-actors/route") },
  { name: "dashboard GET", method: "GET", load: () => import("@/app/api/mobile/dashboard/route") },
  { name: "dues GET", method: "GET", load: () => import("@/app/api/mobile/dues/route") },
  { name: "due detail GET", method: "GET", detail: true, load: () => import("@/app/api/mobile/dues/[id]/route") },
  { name: "excavators GET", method: "GET", load: () => import("@/app/api/mobile/excavators/route") },
  { name: "excavator detail GET", method: "GET", detail: true, load: () => import("@/app/api/mobile/excavators/[id]/route") },
  { name: "field officers GET", method: "GET", load: () => import("@/app/api/mobile/field-officers/route") },
  { name: "finance summary GET", method: "GET", load: () => import("@/app/api/mobile/finance/summary/route") },
  { name: "finance categories GET", method: "GET", load: () => import("@/app/api/mobile/finance-categories/route") },
  { name: "fund requests GET", method: "GET", load: () => import("@/app/api/mobile/fund-requests/route") },
  { name: "fund request detail GET", method: "GET", detail: true, load: () => import("@/app/api/mobile/fund-requests/[id]/route") },
  { name: "information GET", method: "GET", load: () => import("@/app/api/mobile/information/route") },
  { name: "information detail GET", method: "GET", detail: true, load: () => import("@/app/api/mobile/information/[id]/route") },
  { name: "inspections GET", method: "GET", load: () => import("@/app/api/mobile/inspections/route") },
  { name: "inspection detail GET", method: "GET", detail: true, load: () => import("@/app/api/mobile/inspections/[id]/route") },
  { name: "notifications GET", method: "GET", load: () => import("@/app/api/mobile/notifications/route") },
  { name: "notifications PATCH", method: "PATCH", load: () => import("@/app/api/mobile/notifications/route") },
  { name: "notification detail PATCH", method: "PATCH", detail: true, load: () => import("@/app/api/mobile/notifications/[id]/route") },
  { name: "payments GET", method: "GET", load: () => import("@/app/api/mobile/payments/route") },
  { name: "profile GET", method: "GET", load: () => import("@/app/api/mobile/profile/route") },
  { name: "profile PATCH", method: "PATCH", load: () => import("@/app/api/mobile/profile/route") },
  { name: "push devices POST", method: "POST", load: () => import("@/app/api/mobile/push-devices/route") },
  { name: "realizations GET", method: "GET", load: () => import("@/app/api/mobile/realizations/route") },
  { name: "realization detail GET", method: "GET", detail: true, load: () => import("@/app/api/mobile/realizations/[id]/route") },
  { name: "receivables GET", method: "GET", load: () => import("@/app/api/mobile/receivables/route") },
  { name: "reports GET", method: "GET", load: () => import("@/app/api/mobile/reports/route") },
  { name: "report export GET", method: "GET", load: () => import("@/app/api/mobile/reports/export/route") },
  { name: "session GET", method: "GET", load: () => import("@/app/api/mobile/session/route") },
  { name: "tasks GET", method: "GET", load: () => import("@/app/api/mobile/tasks/route") },
  { name: "task detail GET", method: "GET", detail: true, load: () => import("@/app/api/mobile/tasks/[id]/route") },
  { name: "transactions GET", method: "GET", load: () => import("@/app/api/mobile/transactions/route") },
  { name: "transaction detail GET", method: "GET", detail: true, load: () => import("@/app/api/mobile/transactions/[id]/route") },
  { name: "workers GET", method: "GET", load: () => import("@/app/api/mobile/workers/route") },
  { name: "worker detail GET", method: "GET", detail: true, load: () => import("@/app/api/mobile/workers/[id]/route") },
  { name: "workflows POST", method: "POST", load: () => import("@/app/api/mobile/workflows/route") },
];

describe("mobile API authentication gate", { timeout: 15000 }, () => {
  it.each(cases)("rejects unauthenticated $name with 401", async (testCase) => {
    const route = await testCase.load();
    const handler = route[testCase.method] as (request: Request, context?: { params: Promise<{ id: string }> }) => Promise<Response> | Response;
    const request = new Request(`https://api.example.test/api/${testCase.name}`, { method: testCase.method, body: testCase.method === "GET" ? undefined : JSON.stringify({}) });
    const response = testCase.detail ? await handler(request, { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) }) : await handler(request);
    expect(response.status).toBe(401);
  });
});
