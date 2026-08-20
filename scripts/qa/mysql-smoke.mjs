import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL must be configured before MySQL smoke tests.");

const requiredTables = [
  "user",
  "role",
  "permission",
  "audit_log",
  "block",
  "excavator",
  "inspection",
  "due",
  "due_payment",
  "financial_transaction",
  "budget_period",
  "realization_request",
  "notification",
];

const pool = mysql.createPool({ uri: databaseUrl, connectionLimit: 1 });
try {
  await pool.query("SELECT 1 AS ok");
  const [tables] = await pool.query("SHOW TABLES");
  const names = new Set(tables.map((row) => Object.values(row)[0]));
  const missing = requiredTables.filter((table) => !names.has(table));
  if (missing.length) throw new Error(`Missing migrated tables: ${missing.join(", ")}`);

  const [checks] = await pool.query("SELECT COUNT(*) AS total FROM information_schema.check_constraints WHERE constraint_schema = DATABASE()");
  const [users] = await pool.query("SELECT COUNT(*) AS total FROM `user`");
  console.info(`MySQL smoke test passed. Tables: ${names.size}; CHECK constraints: ${checks[0].total}; Users: ${users[0].total}.`);
} finally {
  await pool.end();
}
