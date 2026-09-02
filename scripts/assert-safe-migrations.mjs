import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const migrationFolder = process.argv[2] ?? "drizzle";

const blockedStatements = [
  { label: "DROP TABLE", pattern: /^DROP\s+(?:TEMPORARY\s+)?TABLE\b/i },
  { label: "DROP COLUMN", pattern: /^ALTER\s+TABLE[\s\S]*\bDROP\s+COLUMN\b/i },
  { label: "DROP DATABASE/SCHEMA", pattern: /^DROP\s+(?:DATABASE|SCHEMA)\b/i },
  { label: "TRUNCATE", pattern: /^TRUNCATE\b/i },
  { label: "DELETE FROM", pattern: /^DELETE\s+FROM\b/i },
];

function withoutComments(statement) {
  return statement
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .trim();
}

export function assertSafeMigrations(folder = migrationFolder) {
  const files = readdirSync(folder)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const violations = [];

  for (const file of files) {
    const sql = readFileSync(join(folder, file), "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      const executable = withoutComments(statement);
      const match = blockedStatements.find((candidate) => candidate.pattern.test(executable));
      if (match) violations.push(`${file}: ${match.label}`);
    }
  }

  if (violations.length) {
    throw new Error(`Destructive database migration blocked. Review: ${violations.join(", ")}`);
  }

  console.info(`Migration safety check passed for ${files.length} SQL files.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  assertSafeMigrations();
}
