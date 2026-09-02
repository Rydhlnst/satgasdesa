import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { assertSafeMigrations } from "./assert-safe-migrations.mjs";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL must be configured before migration.");

function redactSecrets(value) {
  return String(value ?? "")
    .replace(/(mysql(?:\+[^:]+)?:\/\/[^:]+:)[^@]+@/gi, "$1[REDACTED]@")
    .replace(/((?:password|secret|token|api[_-]?key)\s*[=:]\s*)[^\s,}]+/gi, "$1[REDACTED]");
}

function getRootCause(error) {
  const seen = new Set();
  let current = error;

  while (current?.cause && !seen.has(current)) {
    seen.add(current);
    current = current.cause;
  }

  return current;
}

function migrationErrorDetails(error) {
  const rootCause = getRootCause(error);

  return {
    code: rootCause?.code ?? error?.code,
    errno: rootCause?.errno ?? error?.errno,
    sqlState: rootCause?.sqlState ?? error?.sqlState,
    message: redactSecrets(rootCause?.sqlMessage ?? rootCause?.message ?? error?.message),
  };
}

const pool = mysql.createPool({ uri: databaseUrl, connectionLimit: 1 });
try {
  assertSafeMigrations("drizzle");
  await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
  await pool.end();
  console.info("Database migrations applied.");
} catch (error) {
  await pool.end().catch(() => undefined);
  console.error(
    "Database migration failed. Automatic retry is disabled; review the error and database state.",
    migrationErrorDetails(error),
  );
  process.exitCode = 1;
}
