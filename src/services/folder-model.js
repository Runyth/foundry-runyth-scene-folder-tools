// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { FOLDER_SORT_MODES, ROOT_FOLDER_ID } from "../constants.js";

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export function parentIdOf(folder) {
  const value = folder?.parentId ?? folder?.folder;
  if (!value) return null;
  return typeof value === "string" ? value : value.id ?? null;
}

export function toFolderData(folder) {
  return {
    id: typeof folder?.id === "string" ? folder.id : "",
    name: String(folder.name ?? ""),
    parentId: parentIdOf(folder),
    type: folder.type ?? "Scene",
    depth: Number(folder.depth ?? 0),
    sort: Number.isFinite(Number(folder.sort)) ? Number(folder.sort) : 0
  };
}

export function buildFolderModel(folders) {
  const nodes = new Map();
  for (const raw of folders) {
    const folder = toFolderData(raw);
    if (!folder.id || folder.type !== "Scene") continue;
    nodes.set(folder.id, { ...folder, parentId: folder.parentId, children: [], path: "", safeDepth: 0 });
  }

  for (const node of nodes.values()) {
    if (!node.parentId || node.parentId === node.id || !nodes.has(node.parentId)) node.parentId = null;
  }

  for (const node of nodes.values()) {
    const seen = new Set([node.id]);
    let cursor = node.parentId;
    while (cursor) {
      if (seen.has(cursor)) {
        node.parentId = null;
        break;
      }
      seen.add(cursor);
      cursor = nodes.get(cursor)?.parentId ?? null;
    }
  }

  const roots = [];
  for (const node of nodes.values()) {
    if (node.parentId) nodes.get(node.parentId)?.children.push(node);
    else roots.push(node);
  }

  const sortNodes = (list) => list.sort(compareFolderName);
  sortNodes(roots);
  for (const node of nodes.values()) sortNodes(node.children);

  const stack = roots.map((node) => ({ node, parentPath: "", depth: 0 })).reverse();
  while (stack.length > 0) {
    const { node, parentPath, depth } = stack.pop();
    node.safeDepth = depth;
    node.path = parentPath ? `${parentPath} / ${node.name}` : node.name;
    for (let index = node.children.length - 1; index >= 0; index -= 1) {
      stack.push({ node: node.children[index], parentPath: node.path, depth: depth + 1 });
    }
  }

  return { nodes, roots };
}

function queryMatches(node, query) {
  if (!query) return true;
  return `${node.name} ${node.path}`.toLocaleLowerCase().includes(query);
}

export function flattenFolderModel(
  model,
  {
    search = "",
    expanded = new Set(),
    currentFolderId = null,
    favoriteIds = [],
    recentIds = [],
    includeRoot = true,
    sort = FOLDER_SORT_MODES.NAME
  } = {}
) {
  const query = search.trim().toLocaleLowerCase();
  const included = new Set();
  if (query) {
    for (const node of model.nodes.values()) {
      if (!queryMatches(node, query)) continue;
      included.add(node.id);
      let parent = node.parentId;
      while (parent) {
        included.add(parent);
        parent = model.nodes.get(parent)?.parentId ?? null;
      }
    }
  }

  const favoriteSet = new Set(favoriteIds);
  const recentSet = new Set(recentIds);
  const recentRank = new Map(recentIds.map((id, index) => [id, index]));
  const comparator = folderComparator(sort, favoriteSet, recentRank);
  const rows = [];
  if (includeRoot) {
    rows.push({
      id: ROOT_FOLDER_ID,
      name: "",
      path: "",
      depth: 0,
      ariaLevel: 1,
      hasChildren: false,
      expanded: false,
      selected: currentFolderId === null,
      favorite: favoriteSet.has(ROOT_FOLDER_ID),
      recent: recentSet.has(ROOT_FOLDER_ID),
      isRoot: true
    });
  }

  const orderedRoots = [...model.roots].sort(comparator);
  const stack = orderedRoots.map((node) => ({ node, ancestorsVisible: true })).reverse();
  while (stack.length > 0) {
    const { node, ancestorsVisible } = stack.pop();
    const visible = query ? included.has(node.id) : ancestorsVisible;
    if (!visible) continue;
    const isExpanded = query ? true : expanded.has(node.id);
    rows.push({
      id: node.id,
      name: node.name,
      path: node.path,
      depth: node.safeDepth + 1,
      ariaLevel: node.safeDepth + 2,
      hasChildren: node.children.length > 0,
      expanded: isExpanded,
      selected: currentFolderId === node.id,
      favorite: favoriteSet.has(node.id),
      recent: recentSet.has(node.id),
      isRoot: false
    });
    const childrenVisible = query ? true : isExpanded;
    const orderedChildren = [...node.children].sort(comparator);
    for (let index = orderedChildren.length - 1; index >= 0; index -= 1) {
      stack.push({ node: orderedChildren[index], ancestorsVisible: childrenVisible });
    }
  }
  return rows;
}

export function folderSubtreeIds(folderId, model) {
  const result = new Set();
  const root = model.nodes.get(folderId);
  if (!root) return result;
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (result.has(node.id)) continue;
    result.add(node.id);
    for (const child of node.children) stack.push(child);
  }
  return result;
}

export function expandFolderAncestors(folderId, model, expanded) {
  let parentId = model.nodes.get(folderId)?.parentId ?? null;
  while (parentId) {
    expanded.add(parentId);
    parentId = model.nodes.get(parentId)?.parentId ?? null;
  }
  return expanded;
}

export function folderPath(folderId, model, rootLabel = "Root") {
  if (!folderId || folderId === ROOT_FOLDER_ID) return rootLabel;
  return model.nodes.get(folderId)?.path ?? rootLabel;
}

export function filterFolders(folders, search) {
  const model = buildFolderModel(folders);
  return flattenFolderModel(model, { search, expanded: new Set(model.nodes.keys()), includeRoot: true });
}

export function validateFolderDepth(parentFolder, maxDepth) {
  if (!parentFolder) return { ok: true, depth: 0 };
  const depth = Number(parentFolder.depth ?? 0) + 1;
  return depth <= maxDepth
    ? { ok: true, depth }
    : { ok: false, depth, code: "FOLDER_DEPTH_EXCEEDED" };
}

function folderComparator(sortMode, favoriteSet, recentRank) {
  return (left, right) => {
    if (sortMode === FOLDER_SORT_MODES.NAME_DESC) return compareFolderName(right, left);
    if (sortMode === FOLDER_SORT_MODES.DIRECTORY) {
      return left.sort - right.sort || compareFolderName(left, right);
    }
    if (sortMode === FOLDER_SORT_MODES.FAVORITES) {
      const favoriteCompare = Number(favoriteSet.has(right.id)) - Number(favoriteSet.has(left.id));
      return favoriteCompare || compareFolderName(left, right);
    }
    if (sortMode === FOLDER_SORT_MODES.RECENTS) {
      const missingRank = Number.MAX_SAFE_INTEGER;
      const rankCompare = (recentRank.get(left.id) ?? missingRank) - (recentRank.get(right.id) ?? missingRank);
      return rankCompare || compareFolderName(left, right);
    }
    return compareFolderName(left, right);
  };
}

function compareFolderName(left, right) {
  return collator.compare(left.name, right.name) || left.id.localeCompare(right.id);
}
