import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const clientSrc = join(root, "client", "src");
const forbiddenPaths = [join(clientSrc, "app", "api")];
const forbiddenPatterns = [
  /@prisma\//,
  /@\/lib\/prisma/,
  /@\/lib\/auth(?!-client|-react-compat)/,
  /@\/lib\/server-session/,
  /node:crypto/,
  /process\.env\.DATABASE_URL/,
  /process\.env\.MASTER_ENCRYPTION_KEY/,
  /fetch\(\s*["'`]\/api/,
];

const failures = [];

for (const path of forbiddenPaths) {
  if (existsSync(path)) failures.push(`Forbidden client path exists: ${relative(root, path)}`);
}

function walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path);
      continue;
    }
    if (!/\.(ts|tsx|js|jsx)$/.test(path)) continue;
    const text = readFileSync(path, "utf8");
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(text)) {
        failures.push(`${relative(root, path)} matches ${pattern}`);
      }
    }
  }
}

walk(clientSrc);

if (failures.length > 0) {
  console.error("Client/backend boundary violations found:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Client/backend boundary checks passed.");

