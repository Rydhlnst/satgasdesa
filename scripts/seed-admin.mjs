import { hashPassword } from "better-auth/crypto";
import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim();

if (!databaseUrl || !email || !password || !name) {
  throw new Error("Bootstrap admin requires BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD, and BOOTSTRAP_ADMIN_NAME.");
}
if (password.length < 12) throw new Error("BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters.");

const pool = mysql.createPool({ uri: databaseUrl, connectionLimit: 1 });
const connection = await pool.getConnection();

try {
  await connection.beginTransaction();
  const [existingRows] = await connection.execute("SELECT `id` FROM `user` WHERE `email` = ? LIMIT 1", [email]);
  if (existingRows.length > 0) {
    console.info("Bootstrap admin already exists; no password was changed.");
    await connection.commit();
    connection.release();
    await pool.end();
    process.exit(0);
  }

  const userId = crypto.randomUUID();
  const now = new Date();
  const passwordHash = await hashPassword(password);
  await connection.execute(
    "INSERT INTO `user` (`id`, `name`, `email`, `email_verified`, `image`, `status`, `created_at`, `updated_at`) VALUES (?, ?, ?, 1, NULL, 'ACTIVE', ?, ?)",
    [userId, name, email, now, now],
  );
  await connection.execute(
    "INSERT INTO `account` (`id`, `account_id`, `provider_id`, `issuer`, `user_id`, `password`, `created_at`, `updated_at`) VALUES (?, ?, 'credential', 'local:credential', ?, ?, ?, ?)",
    [crypto.randomUUID(), userId, userId, passwordHash, now, now],
  );
  await connection.execute(
    "INSERT INTO `user_role` (`user_id`, `role_id`, `assigned_at`, `assigned_by`) VALUES (?, 'PIMPINAN', ?, ?)",
    [userId, now, userId],
  );
  await connection.execute(
    "INSERT INTO `audit_log` (`id`, `actor_user_id`, `action`, `entity_type`, `entity_id`, `new_values`, `created_at`) VALUES (?, ?, 'CREATE', 'USER', ?, ?, ?)",
    [crypto.randomUUID(), userId, userId, JSON.stringify({ email, role: "PIMPINAN", bootstrap: true }), now],
  );
  await connection.commit();
  console.info("Bootstrap Pimpinan account created.");
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
  await pool.end();
}
