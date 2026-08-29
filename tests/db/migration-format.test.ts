import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("runtime migration SQL", () => {
  it("separates each MySQL statement in the payment migration", () => {
    const sql = readFileSync(
      resolve(process.cwd(), "drizzle/0029_payment_confirmation_budget_progress.sql"),
      "utf8",
    );
    const statements = sql
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean);

    expect(statements).toHaveLength(9);
    expect(statements.slice(0, -1).every((statement) => statement.endsWith(";"))).toBe(true);
  });
});
