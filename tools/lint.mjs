// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const config = JSON.parse(await readFile(path.join(root, "quality.config.json"), "utf8"));
const ignored = new Set(["node_modules", "dist", "artifacts", "coverage", ".git"]);
const failures = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute);
    else if (/\.(?:js|mjs)$/.test(entry.name)) await checkJavaScript(absolute);
  }
}

async function checkJavaScript(file) {
  const relative = path.relative(root, file);
  const syntax = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (syntax.status !== 0) failures.push(`${relative}: ${syntax.stderr.trim()}`);
  const text = await readFile(file, "utf8");
  for (const marker of config.forbiddenSourceMarkers) {
    if (text.includes(marker)) failures.push(`${relative}: forbidden marker ${marker}`);
  }
  for (const pattern of config.forbiddenPatterns) {
    if (text.includes(pattern)) failures.push(`${relative}: forbidden pattern ${pattern}`);
  }
  text.split("\n").forEach((line, index) => {
    if (line.length > config.maximumLineLength) failures.push(`${relative}:${index + 1}: line exceeds ${config.maximumLineLength} characters`);
  });
  if (/\.prototype\s*=|Object\.defineProperty\([^,]+\.prototype/.test(text)) {
    failures.push(`${relative}: global prototype modification is forbidden`);
  }
}

await walk(root);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else console.log("Strict source lint checks passed.");
