// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { SceneFolderToolsError } from "../core/errors.js";
import { validateFolderDepth } from "./folder-model.js";

export class FolderService {
  constructor({ adapter, permissions, destinationStore, logger }) {
    this.adapter = adapter;
    this.permissions = permissions;
    this.destinationStore = destinationStore;
    this.logger = logger;
  }

  getFolders() {
    return this.adapter.getSceneFolders().map((folder) => ({
      id: folder.id,
      name: folder.name,
      parentId: typeof folder.folder === "string" ? folder.folder : folder.folder?.id ?? null,
      type: folder.type,
      depth: folder.depth ?? 0
    }));
  }

  async create(data = {}) {
    const { name, parentFolderId = null } = /** @type {any} */ (data);
    const cleanName = String(name ?? "").trim();
    if (!cleanName) throw new SceneFolderToolsError("FOLDER_NAME_REQUIRED", "A folder name is required.");
    if (!this.permissions.canCreateFolder()) {
      return { ok: false, code: "PERMISSION_DENIED", folder: null };
    }

    let parent = null;
    if (parentFolderId) {
      parent = this.adapter.getFolder(parentFolderId);
      if (!parent) return { ok: false, code: "FOLDER_NOT_FOUND", folder: null };
      if (parent.type !== "Scene") return { ok: false, code: "INVALID_FOLDER_TYPE", folder: null };
    }

    const depth = validateFolderDepth(parent, this.adapter.getFolderMaxDepth());
    if (!depth.ok) return { ok: false, code: depth.code, folder: null };

    try {
      const folder = await this.adapter.createFolder({
        name: cleanName,
        type: "Scene",
        folder: parentFolderId ?? null,
        sorting: "a"
      });
      this.adapter.emitHook("folderCreated", { folderId: folder.id, name: folder.name, parentFolderId });
      this.logger.debug("Created Scene folder", { folderId: folder.id, parentFolderId });
      return { ok: true, code: null, folder: { id: folder.id, name: folder.name, parentFolderId } };
    } catch (error) {
      this.logger.error("Failed to create Scene folder", error);
      return { ok: false, code: "CREATE_FAILED", folder: null, error: error.message };
    }
  }
}
