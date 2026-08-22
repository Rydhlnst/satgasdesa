import fs from "node:fs";
import path from "node:path";

const dashboardRoot = path.resolve(process.cwd(), "app/dashboard");
const routeFiles = [];

const requiredStateExports = [
  "StatePanel",
  "LoadingState",
  "EmptyState",
  "NoResultsState",
  "OfflineState",
  "ErrorState",
  "NotFoundState",
  "UnauthorizedState",
  "SuccessState",
];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(entryPath);
    else if (entry.name === "page.tsx") routeFiles.push(entryPath);
  }
}

walk(dashboardRoot);

const failures = [];
const stateSource = fs.readFileSync(path.resolve(process.cwd(), "components/shared/ui-state.tsx"), "utf8");
for (const exportName of requiredStateExports) {
  if (!stateSource.includes(`export function ${exportName}`)) failures.push(`shared state system: missing ${exportName}`);
}

for (const filePath of routeFiles) {
  const source = fs.readFileSync(filePath, "utf8");
  const route = filePath
    .slice(dashboardRoot.length)
    .replace(/\\page\.tsx$/, "")
    .replaceAll(path.sep, "/") || "/";

  if (!source.includes("PageContainer")) {
    failures.push(`${route}: missing PageContainer`);
  }

  const routeDirectory = path.dirname(filePath);
  const hasRouteLoading = fs.existsSync(path.join(routeDirectory, "loading.tsx")) || fs.existsSync(path.join(dashboardRoot, "loading.tsx"));
  if (!hasRouteLoading) failures.push(`${route}: missing loading boundary`);

  if (
    source.includes("<table") &&
    !source.includes("ResponsiveDataView") &&
    !(source.includes("md:hidden") && source.includes("md:block")) &&
    !source.includes("Mobile")
  ) {
    failures.push(`${route}: table has no mobile representation`);
  }

  if (source.includes("=== 0") || source.includes(".length === 0") || source.includes("!rows.length")) {
    if (!source.includes("EmptyState") && !source.includes("NoResultsState") && !source.includes("ResponsiveDataView")) {
      failures.push(`${route}: data-empty branch has no shared state component`);
    }
  }
}

if (failures.length) {
  console.error("Responsive UI validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Responsive UI validation passed: ${routeFiles.length} dashboard routes checked.`);
