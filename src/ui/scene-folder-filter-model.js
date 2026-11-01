// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import {
  ALL_SCENE_FOLDERS_ID,
  FOLDER_SORT_MODES,
  ROOT_FOLDER_ID
} from "../constants.js";
import { flattenFolderModel, folderPath } from "../services/folder-model.js";

export function prepareSceneFolderFilterItems(folderModel, selectedId, labels) {
  const rows = flattenFolderModel(folderModel, {
    expanded: new Set(folderModel.nodes.keys()),
    includeRoot: false,
    sort: FOLDER_SORT_MODES.NAME
  });
  return [
    createSpecialItem(ALL_SCENE_FOLDERS_ID, labels.allFolders, selectedId),
    createSpecialItem(ROOT_FOLDER_ID, labels.rootOnly, selectedId),
    ...rows.map((row) => ({
      id: row.id,
      name: row.name,
      path: row.path,
      searchText: normalizeSearchText(`${row.name} ${row.path}`),
      selected: selectedId === row.id,
      indent: Math.max(0, row.depth - 1) * 16,
      special: false
    }))
  ];
}

export function sceneFolderFilterLabel(folderId, folderModel, labels) {
  if (folderId === ALL_SCENE_FOLDERS_ID) return labels.allFolders;
  if (folderId === ROOT_FOLDER_ID) return labels.rootOnly;
  return folderPath(folderId, folderModel, labels.rootOnly) || labels.allFolders;
}

export function sceneFolderFilterItemMatches(item, query) {
  return sceneFolderFilterSearchTextMatches(item.searchText, query);
}

export function sceneFolderFilterSearchTextMatches(searchText, query) {
  const tokens = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  return tokens.every((token) => String(searchText ?? "").includes(token));
}

export function normalizeSearchText(value) {
  return String(value ?? "").trim().toLocaleLowerCase();
}

function createSpecialItem(id, label, selectedId) {
  return {
    id,
    name: label,
    path: "",
    searchText: normalizeSearchText(label),
    selected: selectedId === id,
    indent: 0,
    special: true
  };
}
