import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const appRoot = path.join(repoRoot, "mobile", "app");
const violations = [];
const warnings = [];

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : target.endsWith(".tsx") ? [target] : [];
  });
}

for (const file of walk(appRoot)) {
  const relative = path.relative(repoRoot, file);
  const source = fs.readFileSync(file, "utf8");
  const isRootProvider = path.basename(file) === "_layout.tsx";

  if (!isRootProvider && /from\s+["'][^"']*src[\\/]components[\\/]ui(?:["'/])/.test(source)) {
    violations.push(`${relative}: route imports a generated Gluestack primitive directly; use src/components/AppPrimitives instead`);
  }

  if (/import\s*\{[^}]*\bTextInput\b[^}]*\}\s*from\s*["']react-native["']/.test(source)) {
    violations.push(`${relative}: raw React Native TextInput is not allowed in routes; use a Gluestack-backed form primitive`);
  }

  if (/<Modal\b/.test(source) && !/\bGModal\b/.test(source)) {
    violations.push(`${relative}: raw Modal usage is not allowed in routes; use the semantic Gluestack modal gateway`);
  }

  if (source.includes("<BottomNav") && !source.includes("<Screen")) {
    warnings.push(`${relative}: BottomNav is present without a Screen container; verify the content inset manually`);
  }
}

console.log(`Mobile UI guardrail: ${walk(appRoot).length} route files scanned`);
for (const warning of warnings) console.warn(`WARN ${warning}`);
if (violations.length) {
  for (const violation of violations) console.error(`FAIL ${violation}`);
  process.exitCode = 1;
} else {
  console.log("PASS no direct generated-primitive or raw form/modal violations found");
}
