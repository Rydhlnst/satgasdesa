import { spawn } from "node:child_process";

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env: process.env });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${signal ?? code}.`));
    });
  });
}

async function startApplication() {
  await run(process.execPath, ["scripts/validate-env.mjs"]);
  await run(process.execPath, ["scripts/migrate-runtime.mjs"]);

  if (process.env.SEED_RBAC === "true") {
    await run(process.execPath, ["scripts/seed-rbac.mjs"]);
  }

  if (process.env.BOOTSTRAP_ADMIN_EMAIL?.trim()) {
    await run(process.execPath, ["scripts/seed-admin.mjs"]);
  }

  const server = spawn(process.execPath, ["server.js"], { stdio: "inherit", env: process.env });
  const shutdown = (signal) => {
    server.kill(signal);
  };
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
  server.once("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
}

try {
  await startApplication();
} catch (error) {
  if (process.env.KEEP_CONTAINER_RUNNING_ON_STARTUP_FAILURE !== "true") throw error;

  console.error("Startup failed; keeping the container running for diagnostics.", error);
  await new Promise((resolve) => {
    process.once("SIGTERM", resolve);
    process.once("SIGINT", resolve);
  });
}
