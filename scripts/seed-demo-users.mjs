import { hashPassword } from "better-auth/crypto";
import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error("DATABASE_URL must be configured before seeding demo users.");
if (process.env.NODE_ENV === "production") throw new Error("Demo users may only be seeded outside production.");

function requiredPassword(name) {
  const password = process.env[name];
  if (!password) throw new Error(`${name} must be configured before seeding users.`);
  if (password.length < 12) throw new Error(`${name} must be at least 12 characters.`);
  return password;
}

const accountDefinitions = [
  { name: "Bootstrap Admin", email: "admin@satgas.local", passwordEnv: "SEED_ADMIN_PASSWORD", role: "PIMPINAN" },
  { name: "Local Pimpinan", email: "pimpinan@satgas.local", passwordEnv: "SEED_PIMPINAN_PASSWORD", role: "PIMPINAN" },
  { name: "Local Bendahara", email: "bendahara@satgas.local", passwordEnv: "SEED_BENDAHARA_PASSWORD", role: "BENDAHARA" },
  { name: "Local Petugas Lapangan", email: "petugas@satgas.local", passwordEnv: "SEED_PETUGAS_PASSWORD", role: "PETUGAS_LAPANGAN" },
];

const supportedRoles = new Set(accountDefinitions.map((account) => account.role));
const selectedRoles = (process.env.SEED_ROLES ?? "BENDAHARA,PETUGAS_LAPANGAN")
  .split(",")
  .map((role) => role.trim())
  .filter(Boolean);

if (!selectedRoles.length || selectedRoles.some((role) => !supportedRoles.has(role))) {
  throw new Error(`SEED_ROLES must contain supported roles: ${[...supportedRoles].join(", ")}.`);
}

const accounts = accountDefinitions
  .filter((account) => selectedRoles.includes(account.role))
  .map(({ passwordEnv, ...account }) => ({ ...account, password: requiredPassword(passwordEnv) }));

const pool = mysql.createPool({ uri: databaseUrl, connectionLimit: 1 });
const connection = await pool.getConnection();

try {
  await connection.beginTransaction();
  const now = new Date();

  for (const account of accounts) {
    const [existingRows] = await connection.execute("SELECT `id` FROM `user` WHERE `email` = ? LIMIT 1", [account.email]);
    const existingUser = existingRows[0];
    const userId = existingUser?.id ?? crypto.randomUUID();

    if (!existingUser) {
      const passwordHash = await hashPassword(account.password);
      await connection.execute(
        "INSERT INTO `user` (`id`, `name`, `email`, `email_verified`, `image`, `status`, `created_at`, `updated_at`) VALUES (?, ?, ?, 1, NULL, 'ACTIVE', ?, ?)",
        [userId, account.name, account.email, now, now],
      );
      await connection.execute(
        "INSERT INTO `account` (`id`, `account_id`, `provider_id`, `issuer`, `user_id`, `password`, `created_at`, `updated_at`) VALUES (?, ?, 'credential', 'local:credential', ?, ?, ?, ?)",
        [crypto.randomUUID(), userId, userId, passwordHash, now, now],
      );
      await connection.execute(
        "INSERT INTO `audit_log` (`id`, `actor_user_id`, `action`, `entity_type`, `entity_id`, `new_values`, `created_at`) VALUES (?, ?, 'CREATE', 'USER', ?, ?, ?)",
        [crypto.randomUUID(), userId, userId, JSON.stringify({ email: account.email, role: account.role, demo: true }), now],
      );
      console.info(`Created ${account.role}: ${account.email}`);
    } else {
      console.info(`Preserved existing ${account.role}: ${account.email}`);
    }

    await connection.execute(
      "INSERT IGNORE INTO `user_role` (`user_id`, `role_id`, `assigned_at`, `assigned_by`) VALUES (?, ?, ?, ?)",
      [userId, account.role, now, userId],
    );
  }

  await connection.commit();
  console.info("Demo role accounts seeded.");
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
  await pool.end();
}
