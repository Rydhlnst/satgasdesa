import mysql from "mysql2/promise";
import { readMigrationFiles } from "drizzle-orm/migrator";
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

function isSafeDuplicateObjectError(error, statement) {
  const code = error?.errno ?? error?.cause?.errno;
  const message = String(error?.sqlMessage ?? error?.message ?? "").toLowerCase();
  const objectStatement = /^(create\s+(table|index)|alter\s+table[\s\S]+add\s+constraint)/i.test(statement.trim());
  return objectStatement && (code === 1050 || code === 1061 || code === 1826 || message.includes("already exists") || message.includes("duplicate key name"));
}

async function migrateSafely(pool, migrationsFolder) {
  const migrations = readMigrationFiles({ migrationsFolder });
  await pool.query(`create table if not exists \`__drizzle_migrations\` (\`id\` serial primary key, \`hash\` text not null, \`created_at\` bigint)`);
  const [rows] = await pool.query("select hash from `__drizzle_migrations`");
  const applied = new Set(rows.map((row) => String(row.hash)));

  for (const migration of migrations) {
    if (applied.has(migration.hash)) continue;
    for (const statement of migration.sql) {
      const sql = statement.trim();
      if (!sql) continue;
      try {
        await pool.query(sql);
      } catch (error) {
        if (!isSafeDuplicateObjectError(error, sql)) throw error;
        console.warn(`Migration ${migration.hash.slice(0, 12)} skipped an existing database object: ${migrationErrorDetails(error).message}`);
      }
    }
    await pool.query("insert into `__drizzle_migrations` (`hash`, `created_at`) values (?, ?)", [migration.hash, migration.folderMillis]);
    applied.add(migration.hash);
  }
}

const pool = mysql.createPool({ uri: databaseUrl, connectionLimit: 1 });
try {
  assertSafeMigrations("drizzle");
  await migrateSafely(pool, "drizzle");
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
