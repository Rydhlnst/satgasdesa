import { createHash } from "node:crypto";
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

function isIdentifierLengthError(error) {
  const code = error?.errno ?? error?.cause?.errno;
  const message = String(error?.sqlMessage ?? error?.message ?? "").toLowerCase();
  return code === 1059 || message.includes("identifier name") && message.includes("too long");
}

function shortenMySqlNamedObjects(statement) {
  let changed = false;
  const shortened = statement.replace(/\b(CONSTRAINT\s+|CREATE\s+(?:UNIQUE\s+)?INDEX\s+)(`)([^`]+)(`)/gi, (match, prefix, opening, name, closing) => {
    if (name.length <= 64) return match;

    const digest = createHash("sha256").update(name).digest("hex").slice(0, 16);
    const safeName = `${name.replace(/[^a-zA-Z0-9_$]/g, "_").slice(0, 46)}_${digest}`;
    changed = true;
    return `${prefix}${opening}${safeName}${closing}`;
  });

  return changed ? shortened : null;
}

async function executeMigrationStatement(pool, statement, migrationHash) {
  try {
    await pool.query(statement);
    return;
  } catch (error) {
    if (isIdentifierLengthError(error)) {
      const shortenedStatement = shortenMySqlNamedObjects(statement);
      if (shortenedStatement) {
        try {
          await pool.query(shortenedStatement);
          console.warn(`Migration ${migrationHash.slice(0, 12)} shortened an oversized MySQL constraint/index name without changing data.`);
          return;
        } catch (retryError) {
          if (isSafeDuplicateObjectError(retryError, shortenedStatement)) {
            console.warn(`Migration ${migrationHash.slice(0, 12)} skipped an existing database object: ${migrationErrorDetails(retryError).message}`);
            return;
          }
          throw retryError;
        }
      }
    }

    if (isSafeDuplicateObjectError(error, statement)) {
      console.warn(`Migration ${migrationHash.slice(0, 12)} skipped an existing database object: ${migrationErrorDetails(error).message}`);
      return;
    }

    throw error;
  }
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
      await executeMigrationStatement(pool, sql, migration.hash);
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
