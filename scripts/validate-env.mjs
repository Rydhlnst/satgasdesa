const required = ["DATABASE_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL"];
const missing = required.filter((name) => !process.env[name]?.trim());

function validateUrl(name, value, protocols) {
  if (!value?.trim()) return;
  try {
    const url = new URL(value);
    if (!protocols.includes(url.protocol)) throw new Error("unsupported protocol");
  } catch {
    console.error(`${name} must be a valid ${protocols.join(" or ")} URL.`);
    process.exit(1);
  }
}

function validateSampleRate(name) {
  const value = process.env[name];
  if (value === undefined || value === "") return;
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    console.error(`${name} must be between 0 and 1.`);
    process.exit(1);
  }
}

if (!new Set(["disabled", "console", "resend"]).has(process.env.EMAIL_PROVIDER ?? "disabled")) {
  console.error("EMAIL_PROVIDER must be disabled, console, or resend.");
  process.exit(1);
}

if (!new Set(["disabled", "r2", "filesystem", "cpanel"]).has(process.env.STORAGE_PROVIDER ?? "disabled")) {
  console.error("STORAGE_PROVIDER must be disabled, r2, filesystem, or cpanel.");
  process.exit(1);
}

if (process.env.NODE_ENV === "production" && process.env.STORAGE_PROVIDER === "disabled") {
  console.error("STORAGE_PROVIDER must be r2, filesystem, or cpanel in production so image and evidence uploads are available.");
  process.exit(1);
}

if (!new Set(["true", "false"]).has(process.env.PUSH_NOTIFICATIONS_ENABLED ?? "false")) {
  console.error("PUSH_NOTIFICATIONS_ENABLED must be true or false.");
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

if (process.env.DAILY_AUTOMATION_ENABLED === "true" || process.env.ROAD_ENTRY_DUE_AUTOMATION_ENABLED === "true") {
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

validateUrl("DATABASE_URL", process.env.DATABASE_URL, ["mysql:"]);
validateUrl("BETTER_AUTH_URL", process.env.BETTER_AUTH_URL, ["http:", "https:"]);
validateUrl("SENTRY_DSN", process.env.SENTRY_DSN, ["http:", "https:"]);
validateUrl("NEXT_PUBLIC_SENTRY_DSN", process.env.NEXT_PUBLIC_SENTRY_DSN, ["http:", "https:"]);
validateSampleRate("SENTRY_TRACES_SAMPLE_RATE");
validateSampleRate("NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE");

if (process.env.NODE_ENV === "production" && process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_SECRET.length < 32) {
  console.error("BETTER_AUTH_SECRET must be at least 32 characters in production.");
  process.exit(1);
}

if (process.env.NODE_ENV === "production" && process.env.STORAGE_PROVIDER === "r2") {
  validateUrl("STORAGE_ENDPOINT", process.env.STORAGE_ENDPOINT, ["https:"]);
}

console.log("Environment configuration is valid.");
