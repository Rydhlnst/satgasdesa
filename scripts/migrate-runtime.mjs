import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL must be configured before migration.");

const maxAttempts = 30;
const retryDelayMs = 2000;

function isConnectionFailure(error) {
  const rootCause = getRootCause(error);
  const code = rootCause?.code ?? error?.code;

  return ["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "PROTOCOL_CONNECTION_LOST"].includes(code);
}

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

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  const pool = mysql.createPool({ uri: databaseUrl, connectionLimit: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
    await pool.end();
    console.info("Database migrations applied.");
    process.exit(0);
  } catch (error) {
    await pool.end().catch(() => undefined);
    if (!isConnectionFailure(error)) {
      console.error(
        "Database migration failed. Review the migration SQL and database state.",
        migrationErrorDetails(error),
      );
      process.exit(1);
    }
    if (attempt === maxAttempts) {
      console.error("Database migration failed after waiting for MySQL.");
      process.exit(1);
    }
    console.warn(`MySQL is not ready; retrying migration (${attempt}/${maxAttempts}).`);
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }
}
