import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be configured before seeding RBAC.");
}

const pool = mysql.createPool(databaseUrl);
const connection = await pool.getConnection();

const permissions = [
  "USER_READ", "USER_MANAGE", "BLOCK_READ", "BLOCK_CREATE", "BLOCK_UPDATE",
  "EXCAVATOR_READ", "EXCAVATOR_MANAGE", "INSPECTION_READ", "INSPECTION_CREATE",
  "DAILY_INFO_READ", "DAILY_INFO_CREATE", "DAILY_INFO_UPDATE", "DUES_READ",
  "DUES_MANAGE", "PAYMENT_CREATE", "FINANCE_READ", "FINANCE_CREATE", "FINANCE_APPROVE", "BUDGET_READ",
  "BUDGET_CREATE", "BUDGET_VERIFY", "BUDGET_APPROVE", "REALIZATION_READ",
  "REALIZATION_CREATE", "REALIZATION_VERIFY", "REALIZATION_APPROVE", "REPORT_READ",
  "REPORT_EXPORT", "AUDIT_READ",
];

const rolePermissions = {
  PIMPINAN: permissions,
  BENDAHARA: [
    "BLOCK_READ", "EXCAVATOR_READ", "INSPECTION_READ", "DAILY_INFO_READ", "DUES_READ",
    "DUES_MANAGE", "PAYMENT_CREATE", "FINANCE_READ", "FINANCE_CREATE", "BUDGET_READ",
    "BUDGET_CREATE", "REALIZATION_READ", "REALIZATION_CREATE", "REPORT_READ", "REPORT_EXPORT",
  ],
  PETUGAS_LAPANGAN: [
    "BLOCK_READ", "EXCAVATOR_READ", "INSPECTION_READ", "INSPECTION_CREATE", "DAILY_INFO_READ",
    "DAILY_INFO_CREATE", "DAILY_INFO_UPDATE",
  ],
};

try {
  await connection.beginTransaction();

  for (const name of Object.keys(rolePermissions)) {
    await connection.execute(
      `INSERT INTO \`role\` (\`id\`, \`name\`, \`description\`, \`created_at\`, \`updated_at\`)
       VALUES (?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE \`description\` = VALUES(\`description\`), \`updated_at\` = NOW()`,
      [name, name, `Default ${name} role`],
    );
  }

  for (const name of permissions) {
    await connection.execute(
      `INSERT INTO \`permission\` (\`id\`, \`name\`, \`description\`, \`created_at\`)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE \`description\` = VALUES(\`description\`)`,
      [name, name, `Permission ${name}`],
    );
  }

  for (const [roleName, rolePermissionNames] of Object.entries(rolePermissions)) {
    for (const permissionName of rolePermissionNames) {
      await connection.execute(
        `INSERT IGNORE INTO \`role_permission\` (\`role_id\`, \`permission_id\`) VALUES (?, ?)`,
        [roleName, permissionName],
      );
    }
  }

  await connection.commit();
  console.info("RBAC roles and permissions seeded.");
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
  await pool.end();
}
