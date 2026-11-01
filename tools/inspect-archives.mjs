// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { readReleaseMetadata } from "./release-metadata.mjs";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const metadata = await readReleaseMetadata(root);
const {
  moduleId,
  version,
  manifest,
  installFilename,
  sourceFilename,
  documentationFilename,
  checksumFilename,
  sourceRootName
} = metadata;
const installZip = path.join(root, "artifacts", installFilename);
const sourceZip = path.join(root, "artifacts", sourceFilename);
const checksumsFile = path.join(root, "artifacts", checksumFilename);
await Promise.all([access(installZip), access(sourceZip), access(checksumsFile)]);

const { stdout: installList } = await execFileAsync("unzip", ["-Z1", installZip]);
const installEntries = installList.trim().split("\n").filter(Boolean);
const roots = new Set(installEntries.map((entry) => entry.split("/")[0]).filter(Boolean));
if (roots.size !== 1 || !roots.has(moduleId)) throw new Error("Install ZIP must contain exactly one correctly named root directory.");
if (installEntries.some((entry) => !entry.startsWith(`${moduleId}/`))) {
  throw new Error(`Install ZIP contains entries outside the ${moduleId} root directory.`);
}
const runtimePaths = [
  "module.json",
  ...(manifest.esmodules ?? []),
  ...(manifest.scripts ?? []),
  ...(manifest.styles ?? []),
  ...(manifest.languages ?? []).map((language) => language.path),
  "templates/organizer.hbs",
  "templates/folder-picker.hbs"
];
for (const required of runtimePaths.map((entry) => `${moduleId}/${entry}`)) {
  if (!installEntries.includes(required)) throw new Error(`Install ZIP is missing ${required}.`);
}
if (installEntries.some((entry) => /(?:^|\/)(?:node_modules|tests|docs|coverage)(?:\/|$)|package(?:-lock)?\.json$/.test(entry))) {
  throw new Error("Install ZIP contains source-only files.");
}

const { stdout: manifestText } = await execFileAsync("unzip", ["-p", installZip, `${moduleId}/module.json`]);
const archiveManifest = JSON.parse(manifestText);
if (archiveManifest.id !== moduleId || archiveManifest.version !== version) {
  throw new Error("Install manifest identity does not match source release metadata.");
}

const { stdout: sourceList } = await execFileAsync("unzip", ["-Z1", sourceZip]);
for (const requiredFragment of [
  "package.json",
  "package-lock.json",
  "module.json",
  "src/main.js",
  "tests/move-service.test.js",
  "docs/ARCHITECTURE.md",
  ".github/workflows/quality.yml"
]) {
  if (!sourceList.includes(`${sourceRootName}/${requiredFragment}`)) throw new Error(`Source ZIP is missing ${requiredFragment}.`);
}
if (/(?:^|\/)(?:node_modules|dist|artifacts|coverage|\.git)(?:\/|$)/m.test(sourceList)) {
  throw new Error("Source ZIP contains excluded generated content.");
}

const extractionRoot = await mkdtemp(path.join(os.tmpdir(), `${moduleId}-inspect-`));
try {
  await execFileAsync("unzip", ["-q", installZip, "-d", extractionRoot]);
  const extractedModule = path.join(extractionRoot, moduleId);
  const extractedManifest = JSON.parse(await readFile(path.join(extractedModule, "module.json"), "utf8"));
  for (const relativePath of runtimePaths) await access(path.join(extractedModule, relativePath));
  if (extractedManifest.id !== path.basename(extractedModule)) {
    throw new Error("Extracted directory name does not match the manifest ID.");
  }
} finally {
  await rm(extractionRoot, { recursive: true, force: true });
}

const checksumText = await readFile(checksumsFile, "utf8");
if (!checksumText.includes(installFilename) || !checksumText.includes(sourceFilename) || !checksumText.includes(documentationFilename)) {
  throw new Error("Checksum file does not cover the three release archives.");
}
console.log(`Install entries: ${installEntries.length}`);
console.log("Archive and extracted-install inspection passed.");
