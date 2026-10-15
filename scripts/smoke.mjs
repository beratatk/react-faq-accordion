// Smoke-tests the package the way npm users get it: packs the tarball,
// installs it with react and react-dom in a throwaway project, and runs
// smoke-check.mjs there with plain Node ESM. This catches what the TypeScript
// build doesn't, such as extensionless imports in dist (ERR_MODULE_NOT_FOUND
// in Node) or files missing from the tarball.
//
// Usage: npm run smoke -- [react version, default 19]. Run `npm run build` first.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const reactVersion = process.argv[2] ?? "19";
const root = fileURLToPath(new URL("..", import.meta.url));

if (!existsSync(join(root, "dist", "index.js"))) {
  console.error("dist/index.js is missing. Run `npm run build` first.");
  process.exit(1);
}

const run = (command, args, cwd) =>
  execFileSync(command, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });

const dir = mkdtempSync(join(tmpdir(), "react-faq-accordion-smoke-"));
try {
  const [pack] = JSON.parse(run("npm", ["pack", "--json", "--pack-destination", dir], root));
  console.log(`Packed ${pack.filename} (${pack.files.length} files, ${pack.size} bytes):`);
  for (const file of pack.files) console.log(`  ${file.path}`);

  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "smoke", private: true, type: "module" })
  );
  run(
    "npm",
    [
      "install",
      "--no-audit",
      "--no-fund",
      "--ignore-scripts",
      join(dir, pack.filename),
      `react@${reactVersion}`,
      `react-dom@${reactVersion}`,
    ],
    dir
  );

  copyFileSync(join(root, "scripts", "smoke-check.mjs"), join(dir, "check.mjs"));
  process.stdout.write(run("node", ["check.mjs"], dir));
} catch (error) {
  console.error(`\nSmoke test failed. The throwaway project is kept at ${dir}`);
  throw error;
}
rmSync(dir, { recursive: true, force: true });
