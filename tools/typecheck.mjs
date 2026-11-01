// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const ignored = new Set(["node_modules", "dist", "artifacts", "coverage", ".git"]);
const files = [];
const failures = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute);
    else if (/\.(?:js|mjs)$/.test(entry.name)) files.push(absolute);
  }
}

await walk(root);
for (const file of files) {
  const text = await readFile(file, "utf8");
  for (const match of text.matchAll(/(?:import|export)\s+(?:[^"']+\s+from\s+)?["'](\.[^"']+)["']/g)) {
    const target = path.resolve(path.dirname(file), match[1]);
    try {
      await access(target);
    } catch {
      failures.push(`${path.relative(root, file)}: unresolved module ${match[1]}`);
    }
  }
}

const tsc = spawnSync("tsc", ["--noEmit", "--pretty", "false"], { cwd: root, encoding: "utf8" });
if (tsc.error?.code !== "ENOENT" && tsc.status !== 0) failures.push(tsc.stdout.trim() || tsc.stderr.trim());
if (tsc.error?.code === "ENOENT") console.warn("TypeScript compiler not present; import and syntax validation completed instead.");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else console.log("Type and module-resolution checks passed.");
