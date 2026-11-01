// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const ignored = new Set(["node_modules", "dist", "artifacts", "coverage", ".git"]);
const extensions = new Set([".js", ".mjs", ".json", ".md", ".hbs", ".css", ".yml", ".d.ts"]);
const failures = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute);
    else if (extensions.has(path.extname(entry.name)) || entry.name.endsWith(".d.ts")) await check(absolute);
  }
}

async function check(file) {
  const text = await readFile(file, "utf8");
  const relative = path.relative(root, file);
  if (text.length > 0 && !text.endsWith("\n")) failures.push(`${relative}: missing final newline`);
  const lines = text.split("\n");
  lines.forEach((line, index) => {
    if (/\s+$/.test(line)) failures.push(`${relative}:${index + 1}: trailing whitespace`);
    if (line.includes("\t") && relative !== "package-lock.json") failures.push(`${relative}:${index + 1}: tab character`);
  });
  if (file.endsWith(".json")) {
    try {
      JSON.parse(text);
    } catch (error) {
      failures.push(`${relative}: invalid JSON: ${error.message}`);
    }
  }
}

await walk(root);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else console.log("Formatting and structured-file checks passed.");
