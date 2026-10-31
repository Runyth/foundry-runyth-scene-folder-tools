// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import {
  ALL_SCENE_FOLDERS_ID,
  FOLDER_SORT_MODES,
  ROOT_FOLDER_ID,
  SORT_MODES
} from "../constants.js";
import { folderSubtreeIds } from "../services/folder-model.js";

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export class OrganizerState {
  constructor({
    sceneSearch = "",
    folderSearch = "",
    sort = SORT_MODES.NAME,
    folderSort = FOLDER_SORT_MODES.NAME,
    sceneFolderFilterId = ALL_SCENE_FOLDERS_ID,
    sceneFolderFilterSearch = "",
    sceneFolderFilterOpen = false
  } = {}) {
    this.sceneSearch = sceneSearch;
    this.folderSearch = folderSearch;
    this.sort = normalizeValue(sort, SORT_MODES, SORT_MODES.NAME);
    this.folderSort = normalizeValue(folderSort, FOLDER_SORT_MODES, FOLDER_SORT_MODES.NAME);
    this.sceneFolderFilterId = sceneFolderFilterId ?? ALL_SCENE_FOLDERS_ID;
    this.sceneFolderFilterSearch = String(sceneFolderFilterSearch ?? "");
    this.sceneFolderFilterOpen = Boolean(sceneFolderFilterOpen);
    this.selectedSceneIds = new Set();
    this.selectedFolderId = null;
    this.expandedFolderIds = new Set();
    this.lastSelectionAnchor = null;
    this.busy = false;
  }

  setSceneSearch(value) {
    this.sceneSearch = String(value ?? "");
  }

  setFolderSearch(value) {
    this.folderSearch = String(value ?? "");
  }

  setSceneFolderFilterSearch(value) {
    this.sceneFolderFilterSearch = String(value ?? "");
  }

  setSceneFolderFilterOpen(open) {
    this.sceneFolderFilterOpen = Boolean(open);
  }

  setSort(value) {
    if (Object.values(SORT_MODES).includes(value)) this.sort = value;
  }

  setFolderSort(value) {
    if (Object.values(FOLDER_SORT_MODES).includes(value)) this.folderSort = value;
  }

  setSceneFolderFilter(folderId, folderModel) {
    const normalized = folderId || ALL_SCENE_FOLDERS_ID;
    if (
      normalized === ALL_SCENE_FOLDERS_ID ||
      normalized === ROOT_FOLDER_ID ||
      folderModel.nodes.has(normalized)
    ) {
      this.sceneFolderFilterId = normalized;
    } else {
      this.sceneFolderFilterId = ALL_SCENE_FOLDERS_ID;
    }
  }

  selectFolder(folderId) {
    this.selectedFolderId = folderId ?? null;
  }

  toggleFolderExpanded(folderId) {
    if (this.expandedFolderIds.has(folderId)) this.expandedFolderIds.delete(folderId);
    else this.expandedFolderIds.add(folderId);
  }

  toggleScene(sceneId, { checked = false, shift = false, visibleIds = [] } = {}) {
    if (shift && this.#hasVisibleAnchor(visibleIds)) {
      this.#applyRange(sceneId, checked, visibleIds);
    } else if (checked) {
      this.selectedSceneIds.add(sceneId);
    } else {
      this.selectedSceneIds.delete(sceneId);
    }
    this.lastSelectionAnchor = sceneId;
  }

  selectSceneByPointer(sceneId, { shift = false, additive = false, visibleIds = [] } = {}) {
    if (shift && this.#hasVisibleAnchor(visibleIds)) {
      this.#applyRange(sceneId, true, visibleIds);
    } else if (additive) {
      if (this.selectedSceneIds.has(sceneId)) this.selectedSceneIds.delete(sceneId);
      else this.selectedSceneIds.add(sceneId);
    } else {
      this.selectedSceneIds.clear();
      this.selectedSceneIds.add(sceneId);
    }
    this.lastSelectionAnchor = sceneId;
  }

  selectAllVisible(visibleIds) {
    for (const id of visibleIds) this.selectedSceneIds.add(id);
  }

  clearSelection() {
    this.selectedSceneIds.clear();
    this.lastSelectionAnchor = null;
  }

  pruneSelection(validIds) {
    const valid = new Set(validIds);
    for (const id of this.selectedSceneIds) {
      if (!valid.has(id)) this.selectedSceneIds.delete(id);
    }
    if (this.lastSelectionAnchor && !valid.has(this.lastSelectionAnchor)) this.lastSelectionAnchor = null;
  }

  #hasVisibleAnchor(visibleIds) {
    return Boolean(this.lastSelectionAnchor && visibleIds.includes(this.lastSelectionAnchor));
  }

  #applyRange(sceneId, selected, visibleIds) {
    const start = visibleIds.indexOf(this.lastSelectionAnchor);
    const end = visibleIds.indexOf(sceneId);
    const [low, high] = start <= end ? [start, end] : [end, start];
    for (const id of visibleIds.slice(low, high + 1)) {
      if (selected) this.selectedSceneIds.add(id);
      else this.selectedSceneIds.delete(id);
    }
  }
}

export function prepareSceneRows(scenes, folderModel, state) {
  const query = state.sceneSearch.trim().toLocaleLowerCase();
  const allowedFolderIds = allowedSceneFolderIds(state.sceneFolderFilterId, folderModel);
  const rows = scenes
    .map((scene, sourceIndex) => {
      const folderId = typeof scene.folder === "string" ? scene.folder : scene.folder?.id ?? null;
      const folderPathValue = folderId ? folderModel.nodes.get(folderId)?.path ?? "" : "";
      return {
        id: scene.id,
        name: scene.name,
        folderId,
        folderPath: folderPathValue,
        directoryOrder: Number.isFinite(Number(scene.sort)) ? Number(scene.sort) : sourceIndex,
        sourceIndex,
        selected: state.selectedSceneIds.has(scene.id)
      };
    })
    .filter((scene) => folderAllowed(scene.folderId, allowedFolderIds, state.sceneFolderFilterId))
    .filter((scene) => !query || `${scene.name} ${scene.folderPath}`.toLocaleLowerCase().includes(query));

  rows.sort(sceneComparator(state.sort));
  return rows;
}

function normalizeValue(value, values, fallback) {
  return Object.values(values).includes(value) ? value : fallback;
}

function allowedSceneFolderIds(filterId, folderModel) {
  if (filterId === ALL_SCENE_FOLDERS_ID || filterId === ROOT_FOLDER_ID) return null;
  return folderSubtreeIds(filterId, folderModel);
}

function folderAllowed(folderId, allowedFolderIds, filterId) {
  if (filterId === ALL_SCENE_FOLDERS_ID) return true;
  if (filterId === ROOT_FOLDER_ID) return folderId === null;
  return Boolean(folderId && allowedFolderIds?.has(folderId));
}

function sceneComparator(sortMode) {
  return (left, right) => {
    if (sortMode === SORT_MODES.NAME_DESC) return compareName(right, left);
    if (sortMode === SORT_MODES.FOLDER || sortMode === SORT_MODES.FOLDER_DESC) {
      const direction = sortMode === SORT_MODES.FOLDER_DESC ? -1 : 1;
      const folderCompare = collator.compare(left.folderPath, right.folderPath) * direction;
      return folderCompare || compareName(left, right);
    }
    if (sortMode === SORT_MODES.DIRECTORY || sortMode === SORT_MODES.DIRECTORY_DESC) {
      const direction = sortMode === SORT_MODES.DIRECTORY_DESC ? -1 : 1;
      const orderCompare = (left.directoryOrder - right.directoryOrder) * direction;
      return orderCompare || (left.sourceIndex - right.sourceIndex) * direction || compareName(left, right);
    }
    return compareName(left, right);
  };
}

function compareName(left, right) {
  return collator.compare(left.name, right.name) || left.id.localeCompare(right.id);
}
