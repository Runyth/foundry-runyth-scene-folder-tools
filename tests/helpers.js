// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
export function makeScene(id, name, folder = null, canUpdate = true, extra = {}) {
  return {
    id,
    name,
    folder,
    canUserModify: () => canUpdate,
    ...extra
  };
}

export function makeFolder(id, name, type = "Scene", folder = null, depth = 0) {
  return { id, name, type, folder, depth };
}

export function makeMoveHarness({ scenes = [], folders = [], failBatch = false, failIndividual = new Set(), now } = {}) {
  const sceneMap = new Map(scenes.map((scene) => [scene.id, scene]));
  const folderMap = new Map(folders.map((folder) => [folder.id, folder]));
  const emitted = [];
  const updatePayloads = [];
  const adapter = {
    user: { id: "gm", isGM: true },
    getScene: (id) => sceneMap.get(id) ?? null,
    getScenes: () => [...sceneMap.values()],
    getFolder: (id) => folderMap.get(id) ?? null,
    getSceneFolders: () => [...folderMap.values()].filter((folder) => folder.type === "Scene"),
    updateScenes: async (updates) => {
      updatePayloads.push(structuredClone(updates));
      if (failBatch) throw new Error("batch failed");
      for (const update of updates) sceneMap.get(update._id).folder = update.folder;
      return updates.map((update) => sceneMap.get(update._id));
    },
    updateScene: async (update) => {
      if (failIndividual.has(update._id)) throw new Error(`failed ${update._id}`);
      sceneMap.get(update._id).folder = update.folder;
      return sceneMap.get(update._id);
    },
    emitHook: (name, payload) => emitted.push({ name, payload }),
    getFolderMaxDepth: () => 3,
    localize: (key) => (key === "SFT.Destination.Root" ? "Root" : key)
  };
  const permissions = {
    canMoveScene: (scene) => scene.canUserModify(adapter.user, "update"),
    canCreateFolder: () => true
  };
  const destinationStore = {
    remembered: [],
    remember: async (folderId) => destinationStore.remembered.push(folderId)
  };
  const logger = { debug: () => undefined, warn: () => undefined, error: () => undefined };
  return { adapter, permissions, destinationStore, logger, sceneMap, folderMap, emitted, updatePayloads, now };
}
