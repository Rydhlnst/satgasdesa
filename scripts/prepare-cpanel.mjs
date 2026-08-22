import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const standaloneRoot = path.join(projectRoot, ".next", "standalone");

await fs.access(path.join(standaloneRoot, "server.js"));
await fs.cp(path.join(projectRoot, ".next", "static"), path.join(standaloneRoot, ".next", "static"), { force: true, recursive: true });
await fs.cp(path.join(projectRoot, "public"), path.join(standaloneRoot, "public"), { force: true, recursive: true });

// pnpm can leave this small Next runtime package as a symlink in standalone
// output. Materialize only this dependency so the bundle also starts on cPanel.
const pnpmRoot = path.join(projectRoot, "node_modules", ".pnpm");
const standalonePnpmRoot = path.join(standaloneRoot, "node_modules", ".pnpm");
const pnpmEntries = await fs.readdir(pnpmRoot, { withFileTypes: true });
const swcEntry = pnpmEntries.find((entry) => entry.name.startsWith("@swc+helpers@"));

if (swcEntry) {
  const swcHelpersSource = path.join(pnpmRoot, swcEntry.name, "node_modules", "@swc", "helpers");
  const standaloneEntries = await fs.readdir(standalonePnpmRoot, { withFileTypes: true });

  for (const entry of standaloneEntries.filter((item) => item.name.startsWith("next@"))) {
    const swcHelpersTarget = path.join(standalonePnpmRoot, entry.name, "node_modules", "@swc", "helpers");
    await fs.rm(swcHelpersTarget, { force: true, recursive: true });
    await fs.cp(swcHelpersSource, swcHelpersTarget, { force: true, recursive: true });
  }
}

async function materializeInternalLinks(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isSymbolicLink()) {
      const linkTarget = path.resolve(directory, await fs.readlink(entryPath));
      const isInternal = linkTarget === standalonePnpmRoot || linkTarget.startsWith(`${standalonePnpmRoot}${path.sep}`);

      if (isInternal) {
        await fs.rm(entryPath, { force: true, recursive: true });
        await fs.cp(linkTarget, entryPath, { force: true, recursive: true });
      }
    } else if (entry.isDirectory()) {
      await materializeInternalLinks(entryPath);
    }
  }
}

for (let pass = 0; pass < 3; pass += 1) {
  await materializeInternalLinks(standalonePnpmRoot);
}

console.log("cPanel Node bundle prepared at .next/standalone.");
