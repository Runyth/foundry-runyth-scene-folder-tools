// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { describe, expect, it } from "./vitest-shim.js";
import {
  buildFolderModel,
  filterFolders,
  flattenFolderModel,
  folderPath,
  folderSubtreeIds,
  validateFolderDepth
} from "../src/services/folder-model.js";
import { FOLDER_SORT_MODES, ROOT_FOLDER_ID } from "../src/constants.js";
import { makeFolder } from "./helpers.js";

describe("folder model", () => {
  const folders = [
    makeFolder("a", "Alpha"),
    makeFolder("b", "Beta", "Scene", "a", 1),
    makeFolder("c", "Child", "Scene", "b", 2),
    makeFolder("d", "Alpha", "Scene", null, 0)
  ];

  it("constructs nested folder trees and paths", () => {
    const model = buildFolderModel(folders);
    expect(model.roots.map((node) => node.id)).toEqual(["a", "d"]);
    expect(model.nodes.get("c").path).toBe("Alpha / Beta / Child");
  });

  it("includes a root destination", () => {
    const rows = flattenFolderModel(buildFolderModel(folders), { expanded: new Set(["a", "b"]) });
    expect(rows[0]).toEqual(expect.objectContaining({ id: ROOT_FOLDER_ID, isRoot: true }));
  });

  it("search filtering reveals matches and ancestors", () => {
    const rows = filterFolders(folders, "Child");
    expect(rows.map((row) => row.id)).toEqual(["__root__", "a", "b", "c"]);
  });

  it("sorts deterministically by name then ID", () => {
    const model = buildFolderModel([makeFolder("z", "Same"), makeFolder("a", "same"), makeFolder("n", "Natural 10"), makeFolder("m", "Natural 2")]);
    expect(model.roots.map((node) => node.id)).toEqual(["m", "n", "a", "z"]);
  });

  it("keeps duplicate names in different parents distinct", () => {
    const model = buildFolderModel([
      makeFolder("p1", "One"),
      makeFolder("p2", "Two"),
      makeFolder("x1", "Duplicate", "Scene", "p1", 1),
      makeFolder("x2", "Duplicate", "Scene", "p2", 1)
    ]);
    expect(model.nodes.get("x1").path).toBe("One / Duplicate");
    expect(model.nodes.get("x2").path).toBe("Two / Duplicate");
  });

  it("breaks malformed folder cycles safely", () => {
    const model = buildFolderModel([
      makeFolder("a", "A", "Scene", "b"),
      makeFolder("b", "B", "Scene", "a")
    ]);
    expect(model.roots.length).toBeGreaterThan(0);
    expect([...model.nodes.values()].every((node) => Number.isFinite(node.safeDepth))).toBe(true);
  });

  it("marks current, favorite, and recent folders", () => {
    const rows = flattenFolderModel(buildFolderModel(folders), {
      expanded: new Set(["a", "b"]),
      currentFolderId: "c",
      favoriteIds: ["c"],
      recentIds: ["b"]
    });
    expect(rows.find((row) => row.id === "c")).toEqual(expect.objectContaining({ selected: true, favorite: true }));
    expect(rows.find((row) => row.id === "b").recent).toBe(true);
  });

  it("returns all descendants for recursive Scene filtering", () => {
    const model = buildFolderModel(folders);
    expect([...folderSubtreeIds("a", model)].sort()).toEqual(["a", "b", "c"]);
    expect([...folderSubtreeIds("missing", model)]).toEqual([]);
  });

  it("orders folder siblings by descending name, Foundry order, favorites, and recency", () => {
    const sortable = [
      { ...makeFolder("a", "Alpha"), sort: 200 },
      { ...makeFolder("b", "Beta"), sort: 100 },
      { ...makeFolder("c", "Charlie"), sort: 300 }
    ];
    const model = buildFolderModel(sortable);
    const visible = new Set(model.nodes.keys());
    const ids = (sort, extra = {}) =>
      flattenFolderModel(model, { expanded: visible, includeRoot: false, sort, ...extra }).map((row) => row.id);

    expect(ids(FOLDER_SORT_MODES.NAME_DESC)).toEqual(["c", "b", "a"]);
    expect(ids(FOLDER_SORT_MODES.DIRECTORY)).toEqual(["b", "a", "c"]);
    expect(ids(FOLDER_SORT_MODES.FAVORITES, { favoriteIds: ["c"] })).toEqual(["c", "a", "b"]);
    expect(ids(FOLDER_SORT_MODES.RECENTS, { recentIds: ["b", "c"] })).toEqual(["b", "c", "a"]);
  });

  it("returns root for unknown and null folder paths", () => {
    const model = buildFolderModel(folders);
    expect(folderPath(null, model, "Root")).toBe("Root");
    expect(folderPath("missing", model, "Root")).toBe("Root");
  });

  it("validates folder depth", () => {
    expect(validateFolderDepth(makeFolder("p", "Parent", "Scene", null, 1), 3).ok).toBe(true);
    expect(validateFolderDepth(makeFolder("p", "Parent", "Scene", null, 3), 3)).toEqual(
      expect.objectContaining({ ok: false, code: "FOLDER_DEPTH_EXCEEDED" })
    );
  });
});
