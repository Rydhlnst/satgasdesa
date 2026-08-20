import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2/promise";
import * as schema from "./schema";

let queryClient: ReturnType<typeof createPool> | undefined;
type Database = ReturnType<typeof drizzle<typeof schema, ReturnType<typeof createPool>>>;
let database: Database | undefined;

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be configured before accessing the database.");
  }

  return databaseUrl;
}

export function getQueryClient(): ReturnType<typeof createPool> {
  const configuredLimit = Number.parseInt(process.env.DB_CONNECTION_LIMIT ?? "5", 10);
  const connectionLimit = Number.isInteger(configuredLimit)
    ? Math.min(Math.max(configuredLimit, 1), 5)
    : 5;

  queryClient ??= createPool({
    uri: getDatabaseUrl(),
    connectionLimit,
    waitForConnections: true,
    queueLimit: 0,
    enableKeepAlive: true,
  });

  return queryClient;
}

export function getDb() {
  const db = database ?? drizzle(getQueryClient(), { schema, mode: "default" });
  database = db;

  return db;
}

export async function verifyDatabaseConnection(): Promise<void> {
  await getQueryClient().query("select 1");
}
