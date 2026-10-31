// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { MODULE_ID } from "../constants.js";

function documentClass(name) {
  const globalClass = globalThis[name];
  return globalClass?.implementation ?? globalThis.CONFIG?.[name]?.documentClass ?? globalClass;
}

export class FoundryAdapter {
  get user() {
    return globalThis.game?.user;
  }

  get worldId() {
    return globalThis.game?.world?.id ?? "unknown-world";
  }

  getScene(id) {
    return globalThis.game?.scenes?.get(id) ?? null;
  }

  getScenes() {
    return Array.from(globalThis.game?.scenes ?? []);
  }

  getFolder(id) {
    return globalThis.game?.folders?.get(id) ?? null;
  }

  getSceneFolders() {
    return Array.from(globalThis.game?.folders ?? []).filter((folder) => folder.type === "Scene");
  }

  async updateScenes(updates) {
    const SceneClass = documentClass("Scene");
    if (!SceneClass?.updateDocuments) throw new Error("Scene.updateDocuments is unavailable.");
    return SceneClass.updateDocuments(updates, { render: true });
  }

  async updateScene(update) {
    const scene = this.getScene(update._id);
    if (!scene) throw new Error(`Scene ${update._id} no longer exists.`);
    return scene.update({ folder: update.folder ?? null }, { render: true });
  }

  canCreateFolder(user) {
    const FolderClass = documentClass("Folder");
    if (!FolderClass?.canUserCreate) return Boolean(user?.isGM);
    return Boolean(FolderClass.canUserCreate(user));
  }

  async createFolder(data) {
    const FolderClass = documentClass("Folder");
    if (!FolderClass?.create) throw new Error("Folder.create is unavailable.");
    return FolderClass.create(data, { render: true });
  }

  getFolderMaxDepth() {
    return Number(globalThis.CONST?.FOLDER_MAX_DEPTH ?? 3);
  }

  emitHook(name, payload) {
    globalThis.Hooks?.callAll(`${MODULE_ID}.${name}`, payload);
  }

  localize(key) {
    return globalThis.game?.i18n?.localize(key) ?? key;
  }

  format(key, data) {
    return globalThis.game?.i18n?.format(key, data) ?? key;
  }
}
