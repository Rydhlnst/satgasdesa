const configuredUrl = process.env.PRODUCTION_URL;

if (!configuredUrl) throw new Error("PRODUCTION_URL must be configured before production verification.");

const baseUrl = new URL(configuredUrl);
if (baseUrl.protocol !== "https:") throw new Error("PRODUCTION_URL must use HTTPS.");

const response = await fetch(new URL("/api/health", baseUrl), { redirect: "error" });
if (!response.ok) throw new Error(`Health check failed with ${response.status}.`);
if (!response.headers.get("strict-transport-security")) throw new Error("HSTS header is missing from the production response.");

const health = await response.json();
if (health.status !== "ok") throw new Error("Production database health check did not pass.");

console.log(`Production verification passed for ${baseUrl.origin}.`);
