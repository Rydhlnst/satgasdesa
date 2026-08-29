import { readdirSync, readFileSync } from "node:fs";
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

  it("keeps every multi-statement migration split for Drizzle MySQL", () => {
    const migrationDirectory = resolve(process.cwd(), "drizzle");
    const migrations = readdirSync(migrationDirectory).filter((file) => file.endsWith(".sql"));

    for (const file of migrations) {
      const sql = readFileSync(resolve(migrationDirectory, file), "utf8");
      const statementCount = (sql.match(/;/g) ?? []).length;

      if (!sql.includes("--> statement-breakpoint")) {
        expect(statementCount, `${file} must contain breakpoints when it has multiple statements`).toBeLessThanOrEqual(1);
      }
    }
  });
});
