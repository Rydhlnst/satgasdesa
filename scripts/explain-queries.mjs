import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL must be configured before running EXPLAIN.");

const queries = {
  financialTransactions: "SELECT id FROM financial_transaction WHERE status IN ('SAH', 'REVERSED') AND transaction_at >= '2026-01-01' AND transaction_at < '2026-02-01' ORDER BY transaction_at DESC LIMIT 20",
  dues: "SELECT id FROM due WHERE status IN ('UNPAID', 'PARTIAL') AND due_date < '2026-02-01' ORDER BY due_date LIMIT 50",
  notifications: "SELECT id FROM notification WHERE recipient_user_id = '00000000-0000-0000-0000-000000000000' AND read_at IS NULL ORDER BY created_at DESC LIMIT 20",
  inspections: "SELECT id FROM inspection WHERE block_id = '00000000-0000-0000-0000-000000000000' ORDER BY inspected_at DESC LIMIT 20",
  auditActor: "SELECT id FROM audit_log WHERE actor_user_id = '00000000-0000-0000-0000-000000000000' ORDER BY created_at DESC LIMIT 50",
  auditEntity: "SELECT id FROM audit_log WHERE entity_type = 'REALIZATION' AND entity_id = '00000000-0000-0000-0000-000000000000' ORDER BY created_at DESC LIMIT 50",
};

const pool = mysql.createPool({ uri: databaseUrl, connectionLimit: 1 });
try {
  for (const [name, query] of Object.entries(queries)) {
    const [rows] = await pool.query(`EXPLAIN ${query}`);
    console.log(`\n[${name}]`);
    console.table(rows);
  }
} finally {
  await pool.end();
}
