// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { access, cp, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readReleaseMetadata } from "./release-metadata.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { moduleId, manifest } = await readReleaseMetadata(root);
const output = path.join(root, "dist", moduleId);
await rm(path.join(root, "dist"), { recursive: true, force: true });
await mkdir(output, { recursive: true });

await cp(path.join(root, "src"), path.join(output, "scripts"), { recursive: true });
for (const directory of ["templates", "styles", "lang"]) {
  await cp(path.join(root, directory), path.join(output, directory), { recursive: true });
}
await cp(path.join(root, "module.json"), path.join(output, "module.json"));
await cp(path.join(root, "LICENSE"), path.join(output, "LICENSE"));

const runtimePaths = [
  ...(manifest.esmodules ?? []),
  ...(manifest.scripts ?? []),
  ...(manifest.styles ?? []),
  ...(manifest.languages ?? []).map((language) => language.path),
  "templates/organizer.hbs",
  "templates/folder-picker.hbs"
];
for (const relativePath of runtimePaths) await access(path.join(output, relativePath));

const mainSource = await readFile(path.join(root, "src", "constants.js"), "utf8");
if (!mainSource.includes(`MODULE_ID = "${moduleId}"`)) {
  throw new Error("Source MODULE_ID does not match module.json.");
}
if (!mainSource.includes(`VERSION = "${manifest.version}"`)) {
  throw new Error("Source VERSION does not match module.json.");
}

console.log(`Built ${output}`);
