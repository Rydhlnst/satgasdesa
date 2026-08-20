const required = ["DATABASE_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL"];
const missing = required.filter((name) => !process.env[name]?.trim());

if (!new Set(["disabled", "console", "resend"]).has(process.env.EMAIL_PROVIDER ?? "disabled")) {
  console.error("EMAIL_PROVIDER must be disabled, console, or resend.");
  process.exit(1);
}

if (!new Set(["disabled", "r2"]).has(process.env.STORAGE_PROVIDER ?? "disabled")) {
  console.error("STORAGE_PROVIDER must be disabled or r2.");
  process.exit(1);
}

const connectionLimit = Number.parseInt(process.env.DB_CONNECTION_LIMIT ?? "5", 10);
if (!Number.isInteger(connectionLimit) || connectionLimit < 1 || connectionLimit > 5) {
  console.error("DB_CONNECTION_LIMIT must be an integer between 1 and 5.");
  process.exit(1);
}

if (process.env.STORAGE_PROVIDER === "r2") {
  for (const name of [
    "STORAGE_BUCKET",
    "STORAGE_ENDPOINT",
    "STORAGE_REGION",
    "STORAGE_ACCESS_KEY_ID",
    "STORAGE_SECRET_ACCESS_KEY",
  ]) {
    if (!process.env[name]?.trim()) missing.push(name);
  }
}

if (process.env.EMAIL_PROVIDER === "resend") {
  for (const name of ["EMAIL_FROM", "RESEND_API_KEY"]) {
    if (!process.env[name]?.trim()) missing.push(name);
  }
}

if (process.env.ROAD_ENTRY_DUE_AUTOMATION_ENABLED === "true") {
  for (const name of ["AUTOMATION_ACTOR_USER_ID", "CRON_SECRET"]) {
    if (!process.env[name]?.trim()) missing.push(name);
  }
}

if (missing.length > 0) {
  console.error(`Missing environment variables: ${[...new Set(missing)].join(", ")}`);
  process.exit(1);
}

if (process.env.NODE_ENV === "production" && process.env.BETTER_AUTH_URL?.startsWith("http://")) {
  console.error("BETTER_AUTH_URL must use HTTPS in production.");
  process.exit(1);
}

console.log("Environment configuration is valid.");
