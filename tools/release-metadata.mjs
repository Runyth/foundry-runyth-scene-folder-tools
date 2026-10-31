// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { readFile } from "node:fs/promises";
import path from "node:path";

export async function readReleaseMetadata(root) {
  const [manifestText, packageText] = await Promise.all([
    readFile(path.join(root, "module.json"), "utf8"),
    readFile(path.join(root, "package.json"), "utf8")
  ]);
  const manifest = JSON.parse(manifestText);
  const packageJson = JSON.parse(packageText);
  if (typeof manifest.id !== "string" || !manifest.id) throw new Error("module.json must define a non-empty id.");
  if (typeof manifest.version !== "string" || !manifest.version) {
    throw new Error("module.json must define a non-empty version.");
  }
  if (packageJson.name !== manifest.id) throw new Error("package.json name and module.json id differ.");
  if (packageJson.version !== manifest.version) throw new Error("package.json and module.json versions differ.");
  return {
    moduleId: manifest.id,
    version: manifest.version,
    manifest,
    packageJson,
    installFilename: `${manifest.id}-v${manifest.version}-mod.zip`,
    sourceFilename: `${manifest.id}-v${manifest.version}-src.zip`,
    documentationFilename: `${manifest.id}-v${manifest.version}-doc.zip`,
    checksumFilename: `${manifest.id}-v${manifest.version}-SHA256SUMS.txt`,
    sourceRootName: `${manifest.id}-v${manifest.version}-src`,
    documentationRootName: `${manifest.id}-v${manifest.version}-doc`
  };
}
