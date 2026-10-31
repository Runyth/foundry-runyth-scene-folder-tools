// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { API_VERSION, ROOT_FOLDER_ID } from "./constants.js";
import { SceneFolderToolsError } from "./core/errors.js";
import { getRuntime } from "./core/runtime.js";
import { buildFolderModel, folderPath } from "./services/folder-model.js";
import { openFolderPicker, openOrganizer } from "./ui/open-apps.js";
import { refreshApplications } from "./ui/app-registry.js";

function requireOrganizerPermission() {
  const runtime = getRuntime();
  if (!runtime.permissions.canUseOrganizer()) {
    throw new SceneFolderToolsError("PERMISSION_DENIED", "The current user cannot organize Scenes.");
  }
  return runtime;
}

export function createApi() {
  return Object.freeze({
    apiVersion: API_VERSION,
    openOrganizer: async (options = {}) => {
      requireOrganizerPermission();
      return openOrganizer(options);
    },
    openFolderPicker: async (options = {}) => {
      requireOrganizerPermission();
      return openFolderPicker(options);
    },
    moveScene: (sceneId, folderId) => getRuntime().moveService.moveScene(sceneId, folderId),
    moveScenes: (sceneIds, folderId) => getRuntime().moveService.moveScenes(sceneIds, folderId),
    moveScenesToRoot: (sceneIds) => getRuntime().moveService.moveScenes(sceneIds, null),
    createSceneFolder: async (data) => {
      const result = await getRuntime().folderService.create(data);
      if (result.ok) await refreshApplications();
      return result;
    },
    getSceneFolders: async ({ search = "", includeRoot = true } = {}) => {
      const runtime = requireOrganizerPermission();
      const folders = runtime.folderService.getFolders();
      const model = buildFolderModel(folders);
      const rootLabel = runtime.adapter.localize("SFT.Destination.Root");
      const query = String(search).trim().toLocaleLowerCase();
      const result = folders
        .map((folder) => ({ ...folder, path: folderPath(folder.id, model, rootLabel) }))
        .filter((folder) => !query || `${folder.name} ${folder.path}`.toLocaleLowerCase().includes(query));
      if (includeRoot) {
        result.unshift({ id: ROOT_FOLDER_ID, name: rootLabel, path: rootLabel, parentId: null, type: "Scene", depth: 0 });
      }
      return result;
    },
    getRecentFolders: async () => {
      const runtime = requireOrganizerPermission();
      const folders = runtime.folderService.getFolders();
      const state = await runtime.destinationStore.getState(folders.map((folder) => folder.id));
      return state.recent;
    },
    setFavoriteFolder: async (folderId, favorite = true) => {
      const runtime = requireOrganizerPermission();
      const folders = runtime.folderService.getFolders();
      if (!folders.some((folder) => folder.id === folderId)) {
        return { ok: false, code: "FOLDER_NOT_FOUND", favorites: [] };
      }
      const state = await runtime.destinationStore.setFavorite(folderId, Boolean(favorite), folders.map((folder) => folder.id));
      await refreshApplications();
      return {
        ok: state.persisted,
        code: state.persisted ? null : "DESTINATION_SAVE_FAILED",
        favorites: state.favorites
      };
    },
    undoLastMove: () => getRuntime().moveService.undoLastMove()
  });
}
