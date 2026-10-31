// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { ROOT_FOLDER_ID, UNDO_TTL_MS } from "../constants.js";
import { SceneFolderToolsError } from "../core/errors.js";

function sceneFolderId(scene) {
  const value = scene?.folder;
  if (!value) return null;
  return typeof value === "string" ? value : value.id ?? null;
}

function uniqueSceneIds(sceneIds) {
  if (!Array.isArray(sceneIds)) {
    throw new SceneFolderToolsError("INVALID_SCENE_IDS", "sceneIds must be an array of Scene IDs.");
  }
  const ids = [...new Set(sceneIds)];
  if (ids.some((id) => typeof id !== "string" || id.trim().length === 0)) {
    throw new SceneFolderToolsError("INVALID_SCENE_ID", "Every Scene ID must be a non-empty string.");
  }
  return ids;
}

function normalizeFolderId(folderId) {
  if (folderId === null || folderId === undefined || folderId === ROOT_FOLDER_ID) return null;
  if (typeof folderId !== "string" || folderId.trim().length === 0) {
    throw new SceneFolderToolsError("INVALID_FOLDER_ID", "folderId must be a Scene Folder ID or null.");
  }
  return folderId;
}

export class MoveService {
  constructor({ adapter, permissions, destinationStore, logger, now = () => Date.now() }) {
    this.adapter = adapter;
    this.permissions = permissions;
    this.destinationStore = destinationStore;
    this.logger = logger;
    this.now = now;
    this.lockedSceneIds = new Set();
    this.undoState = null;
  }

  get canUndo() {
    if (!this.undoState) return false;
    if (this.now() - this.undoState.createdAt > UNDO_TTL_MS) {
      this.undoState = null;
      return false;
    }
    return true;
  }

  getLastUndoSummary() {
    if (!this.canUndo) return null;
    return {
      sceneCount: this.undoState.entries.length,
      createdAt: this.undoState.createdAt
    };
  }

  async moveScene(sceneId, folderId, options = {}) {
    return this.moveScenes([sceneId], folderId, options);
  }

  async moveScenes(sceneIds, folderId, { recordUndo = true, operation = "move" } = {}) {
    const ids = uniqueSceneIds(sceneIds);
    const destinationId = normalizeFolderId(folderId);
    const result = this.#baseResult(ids, destinationId, operation);
    if (ids.length === 0) return result;

    if (destinationId) {
      const destination = this.adapter.getFolder(destinationId);
      if (!destination) return this.#failAll(result, ids, "FOLDER_NOT_FOUND");
      if (destination.type !== "Scene") return this.#failAll(result, ids, "INVALID_FOLDER_TYPE");
    }

    const candidates = [];
    for (const sceneId of ids) {
      const scene = this.adapter.getScene(sceneId);
      if (!scene) {
        result.failures.push({ sceneId, code: "SCENE_NOT_FOUND" });
        continue;
      }
      if (!this.permissions.canMoveScene(scene)) {
        result.failures.push({ sceneId, sceneName: scene.name, code: "PERMISSION_DENIED" });
        continue;
      }
      if (this.lockedSceneIds.has(sceneId)) {
        result.failures.push({ sceneId, sceneName: scene.name, code: "SCENE_BUSY" });
        continue;
      }
      const fromFolderId = sceneFolderId(scene);
      if (fromFolderId === destinationId) {
        result.skipped.push({ sceneId, sceneName: scene.name, code: "ALREADY_IN_DESTINATION" });
        continue;
      }
      candidates.push({ scene, sceneId, sceneName: scene.name, fromFolderId, toFolderId: destinationId });
    }

    if (candidates.length === 0) {
      result.ok = result.failures.length === 0;
      this.#emitResult(result);
      return result;
    }

    for (const candidate of candidates) this.lockedSceneIds.add(candidate.sceneId);
    try {
      const updates = candidates.map((candidate) => ({ _id: candidate.sceneId, folder: destinationId }));
      const applied = await this.#applyUpdates(candidates, updates, result);
      result.moved.push(...applied);
      result.ok = result.failures.length === 0;

      if (recordUndo && applied.length > 0) {
        this.undoState = {
          createdAt: this.now(),
          entries: applied.map(({ sceneId, sceneName, fromFolderId, toFolderId }) => ({
            sceneId,
            sceneName,
            fromFolderId,
            toFolderId
          }))
        };
      }

      if (applied.length > 0) {
        const validFolderIds = this.adapter.getSceneFolders().map((folder) => folder.id);
        try {
          await this.destinationStore.remember(destinationId, validFolderIds);
        } catch (error) {
          this.logger.warn("The Scene move succeeded, but the recent destination could not be recorded.", error);
        }
      }
      result.undoAvailable = this.canUndo;
      this.#emitResult(result);
      return result;
    } finally {
      for (const candidate of candidates) this.lockedSceneIds.delete(candidate.sceneId);
    }
  }

  async undoLastMove() {
    if (!this.canUndo) {
      return {
        ok: false,
        operation: "undo",
        requested: 0,
        folderId: null,
        moved: [],
        skipped: [],
        failures: [{ sceneId: null, code: "NO_UNDO_AVAILABLE" }],
        undoAvailable: false
      };
    }

    const undo = this.undoState;
    this.undoState = null;
    const result = this.#baseResult(
      undo.entries.map((entry) => entry.sceneId),
      null,
      "undo"
    );
    const candidates = [];

    for (const entry of undo.entries) {
      const scene = this.adapter.getScene(entry.sceneId);
      if (!scene) {
        result.failures.push({ sceneId: entry.sceneId, sceneName: entry.sceneName, code: "SCENE_NOT_FOUND" });
        continue;
      }
      if (!this.permissions.canMoveScene(scene)) {
        result.failures.push({ sceneId: entry.sceneId, sceneName: entry.sceneName, code: "PERMISSION_DENIED" });
        continue;
      }
      if (sceneFolderId(scene) !== entry.toFolderId) {
        result.failures.push({
          sceneId: entry.sceneId,
          sceneName: entry.sceneName,
          code: "SCENE_CHANGED_SINCE_MOVE"
        });
        continue;
      }
      if (entry.fromFolderId) {
        const previousFolder = this.adapter.getFolder(entry.fromFolderId);
        if (!previousFolder) {
          result.failures.push({ sceneId: entry.sceneId, sceneName: entry.sceneName, code: "PREVIOUS_FOLDER_NOT_FOUND" });
          continue;
        }
        if (previousFolder.type !== "Scene") {
          result.failures.push({ sceneId: entry.sceneId, sceneName: entry.sceneName, code: "INVALID_FOLDER_TYPE" });
          continue;
        }
      }
      if (this.lockedSceneIds.has(entry.sceneId)) {
        result.failures.push({ sceneId: entry.sceneId, sceneName: entry.sceneName, code: "SCENE_BUSY" });
        continue;
      }
      candidates.push({
        scene,
        sceneId: entry.sceneId,
        sceneName: entry.sceneName,
        fromFolderId: sceneFolderId(scene),
        toFolderId: entry.fromFolderId
      });
    }

    for (const candidate of candidates) this.lockedSceneIds.add(candidate.sceneId);
    try {
      const updates = candidates.map((candidate) => ({ _id: candidate.sceneId, folder: candidate.toFolderId }));
      result.moved.push(...(await this.#applyUpdates(candidates, updates, result)));
      result.ok = result.failures.length === 0;
      result.undoAvailable = false;
      this.#emitResult(result);
      return result;
    } finally {
      for (const candidate of candidates) this.lockedSceneIds.delete(candidate.sceneId);
    }
  }

  clearUndo() {
    this.undoState = null;
  }

  async #applyUpdates(candidates, updates, result) {
    try {
      await this.adapter.updateScenes(updates);
      return this.#verifyApplied(candidates, result);
    } catch (batchError) {
      this.logger.warn("Batch Scene folder update failed; verifying and retrying remaining Scenes individually.", batchError);
      const applied = [];
      for (const candidate of candidates) {
        const current = this.adapter.getScene(candidate.sceneId);
        if (current && sceneFolderId(current) === candidate.toFolderId) {
          applied.push(this.#appliedResult(candidate));
          continue;
        }
        try {
          await this.adapter.updateScene({ _id: candidate.sceneId, folder: candidate.toFolderId });
          const updated = this.adapter.getScene(candidate.sceneId);
          if (updated && sceneFolderId(updated) === candidate.toFolderId) {
            applied.push(this.#appliedResult(candidate));
          } else {
            result.failures.push({
              sceneId: candidate.sceneId,
              sceneName: candidate.sceneName,
              code: updated ? "UPDATE_NOT_APPLIED" : "SCENE_NOT_FOUND"
            });
          }
        } catch (error) {
          result.failures.push({
            sceneId: candidate.sceneId,
            sceneName: candidate.sceneName,
            code: "UPDATE_FAILED",
            error: error.message
          });
        }
      }
      return applied;
    }
  }

  #verifyApplied(candidates, result) {
    const applied = [];
    for (const candidate of candidates) {
      const current = this.adapter.getScene(candidate.sceneId);
      if (current && sceneFolderId(current) === candidate.toFolderId) {
        applied.push(this.#appliedResult(candidate));
      } else {
        result.failures.push({
          sceneId: candidate.sceneId,
          sceneName: candidate.sceneName,
          code: current ? "UPDATE_NOT_APPLIED" : "SCENE_NOT_FOUND"
        });
      }
    }
    return applied;
  }

  #appliedResult(candidate) {
    return {
      sceneId: candidate.sceneId,
      sceneName: candidate.sceneName,
      fromFolderId: candidate.fromFolderId,
      toFolderId: candidate.toFolderId
    };
  }

  #baseResult(ids, folderId, operation) {
    return {
      ok: false,
      operation,
      requested: ids.length,
      folderId,
      moved: [],
      skipped: [],
      failures: [],
      undoAvailable: this.canUndo
    };
  }

  #failAll(result, sceneIds, code) {
    result.failures.push(
      ...sceneIds.map((sceneId) => ({
        sceneId,
        sceneName: this.adapter.getScene(sceneId)?.name,
        code
      }))
    );
    result.ok = false;
    this.#emitResult(result);
    return result;
  }

  #emitResult(result) {
    const hook = result.failures.length > 0 ? "moveFailure" : "moveSuccess";
    this.adapter.emitHook(hook, result);
    this.logger.debug(`Move operation completed: ${result.operation}`, {
      requested: result.requested,
      moved: result.moved.length,
      failures: result.failures.length
    });
  }
}
