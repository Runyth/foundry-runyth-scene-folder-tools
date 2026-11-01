// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { readReleaseMetadata } from "./release-metadata.mjs";
import "./build.mjs";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const metadata = await readReleaseMetadata(root);
const {
  moduleId,
  installFilename,
  sourceFilename,
  documentationFilename,
  checksumFilename,
  sourceRootName,
  documentationRootName
} = metadata;
const artifacts = path.join(root, "artifacts");
const installZip = path.join(artifacts, installFilename);
const sourceZip = path.join(artifacts, sourceFilename);
const documentationZip = path.join(artifacts, documentationFilename);
const checksumsFile = path.join(artifacts, checksumFilename);
await mkdir(artifacts, { recursive: true });
await Promise.all([rm(installZip, { force: true }), rm(sourceZip, { force: true }), rm(documentationZip, { force: true }), rm(checksumsFile, { force: true })]);

await execFileAsync("zip", ["-X", "-q", "-r", installZip, moduleId], {
  cwd: path.join(root, "dist")
});
const staging = await mkdtemp(path.join(os.tmpdir(), `${moduleId}-package-`));
try {
  const stagedSource = path.join(staging, sourceRootName);
  await cp(root, stagedSource, {
    recursive: true,
    filter: (source) => {
      const relative = path.relative(root, source);
      return !["node_modules", "dist", "artifacts", "coverage", ".git"].some((part) => relative === part || relative.startsWith(`${part}${path.sep}`));
    }
  });
  await execFileAsync("zip", ["-X", "-q", "-r", sourceZip, sourceRootName], { cwd: staging });
  const stagedDocs = path.join(staging, documentationRootName);
  await mkdir(stagedDocs, { recursive: true });
  for (const name of ["README.md", "CHANGELOG.md", "LICENSE", "SECURITY.md", "CONTRIBUTING.md"]) {
    await cp(path.join(root, name), path.join(stagedDocs, name));
  }
  await cp(path.join(root, "docs"), path.join(stagedDocs, "docs"), { recursive: true });
  await execFileAsync("zip", ["-X", "-q", "-r", documentationZip, documentationRootName], { cwd: staging });
} finally {
  await rm(staging, { recursive: true, force: true });
}

const checksumLines = [];
for (const file of [installZip, sourceZip, documentationZip]) {
  const digest = createHash("sha256").update(await readFile(file)).digest("hex");
  checksumLines.push(`${digest}  ${path.basename(file)}`);
}
await writeFile(checksumsFile, `${checksumLines.join("\n")}\n`, "utf8");
console.log(`Created ${installZip}`);
console.log(`Created ${sourceZip}`);
console.log(`Created ${checksumsFile}`);
