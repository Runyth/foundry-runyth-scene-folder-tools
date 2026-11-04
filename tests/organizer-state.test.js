// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { describe, expect, it } from "./vitest-shim.js";
import {
  ALL_SCENE_FOLDERS_ID,
  FOLDER_SORT_MODES,
  ROOT_FOLDER_ID,
  SORT_MODES
} from "../src/constants.js";
import { OrganizerState, prepareSceneRows } from "../src/ui/organizer-state.js";
import { buildFolderModel } from "../src/services/folder-model.js";
import { makeFolder, makeScene } from "./helpers.js";

const visibleIds = ["s1", "s2", "s3", "s4", "s5"];

describe("OrganizerState", () => {
  it("supports checkbox and Shift-range selection", () => {
    const state = new OrganizerState();
    state.toggleScene("s1", { checked: true, visibleIds });
    state.toggleScene("s3", { checked: true, shift: true, visibleIds });
    expect([...state.selectedSceneIds]).toEqual(["s1", "s2", "s3"]);
  });

  it("row-click checkbox semantics keep the existing multi-selection", () => {
    const state = new OrganizerState();
    state.toggleScene("s1", { checked: true, visibleIds });
    state.toggleScene("s2", { checked: true, visibleIds });
    // clicking a row toggles that row like its checkbox; the missed row is
    // never demoted to a single selection
    state.toggleScene("s4", { checked: !state.selectedSceneIds.has("s4"), visibleIds });
    expect([...state.selectedSceneIds]).toEqual(["s1", "s2", "s4"]);
    // clicking it again removes only that row
    state.toggleScene("s4", { checked: !state.selectedSceneIds.has("s4"), visibleIds });
    expect([...state.selectedSceneIds]).toEqual(["s1", "s2"]);
  });

  it("supports plain-click, modifier-click, and Shift-click range selection", () => {
    const state = new OrganizerState();
    state.selectSceneByPointer("s1", { visibleIds });
    state.selectSceneByPointer("s3", { additive: true, visibleIds });
    expect([...state.selectedSceneIds]).toEqual(["s1", "s3"]);

    state.selectSceneByPointer("s5", { shift: true, visibleIds });
    expect([...state.selectedSceneIds]).toEqual(["s1", "s3", "s4", "s5"]);

    state.selectSceneByPointer("s2", { visibleIds });
    expect([...state.selectedSceneIds]).toEqual(["s2"]);
  });

  it("selects all visible and clears selection", () => {
    const state = new OrganizerState();
    state.selectAllVisible(["s2", "s4"]);
    expect([...state.selectedSceneIds]).toEqual(["s2", "s4"]);
    state.clearSelection();
    expect(state.selectedSceneIds.size).toBe(0);
  });

  it("preserves selection when filtering changes", () => {
    const state = new OrganizerState();
    state.toggleScene("s1", { checked: true, visibleIds });
    state.setSceneSearch("Two");
    expect(state.selectedSceneIds.has("s1")).toBe(true);
  });

  it("retains valid Scene and folder sorting and ignores invalid values", () => {
    const state = new OrganizerState({ sort: SORT_MODES.FOLDER, folderSort: FOLDER_SORT_MODES.RECENTS });
    state.setSort("invalid");
    state.setFolderSort("invalid");
    expect(state.sort).toBe(SORT_MODES.FOLDER);
    expect(state.folderSort).toBe(FOLDER_SORT_MODES.RECENTS);
  });

  it("tracks disabled/busy UI state", () => {
    const state = new OrganizerState();
    expect(state.busy).toBe(false);
    state.busy = true;
    expect(state.busy).toBe(true);
  });

  it("filters Scene rows by name or current folder and reports empty state data", () => {
    const model = buildFolderModel([makeFolder("f1", "Town")]);
    const state = new OrganizerState({ sceneSearch: "Town" });
    expect(prepareSceneRows([makeScene("s1", "Market", "f1")], model, state)).toHaveLength(1);
    state.setSceneSearch("missing");
    expect(prepareSceneRows([makeScene("s1", "Market", "f1")], model, state)).toEqual([]);
  });

  it("filters recursively by a selected Scene folder", () => {
    const model = buildFolderModel([
      makeFolder("parent", "Parent"),
      makeFolder("child", "Child", "Scene", "parent", 1),
      makeFolder("other", "Other")
    ]);
    const state = new OrganizerState({ sceneFolderFilterId: "parent" });
    const rows = prepareSceneRows(
      [
        makeScene("s1", "Direct", "parent"),
        makeScene("s2", "Nested", "child"),
        makeScene("s3", "Elsewhere", "other"),
        makeScene("s4", "Unfiled", null)
      ],
      model,
      state
    );
    expect(rows.map((row) => row.id)).toEqual(["s1", "s2"]);
  });

  it("supports all-folders and root-only Scene filters", () => {
    const model = buildFolderModel([makeFolder("f1", "Folder")]);
    const scenes = [makeScene("s1", "Filed", "f1"), makeScene("s2", "Unfiled", null)];
    const state = new OrganizerState({ sceneFolderFilterId: ROOT_FOLDER_ID });
    expect(prepareSceneRows(scenes, model, state).map((row) => row.id)).toEqual(["s2"]);
    state.setSceneFolderFilter(ALL_SCENE_FOLDERS_ID, model);
    expect(prepareSceneRows(scenes, model, state).map((row) => row.id)).toEqual(["s1", "s2"]);
  });

  it("sorts Scenes by folder, descending name, and Foundry directory order", () => {
    const model = buildFolderModel([makeFolder("a", "Alpha"), makeFolder("b", "Beta")]);
    const scenes = [
      makeScene("s2", "A", "b", true, { sort: 200 }),
      makeScene("s1", "Z", "a", true, { sort: 100 })
    ];
    const state = new OrganizerState({ sort: SORT_MODES.FOLDER });
    expect(prepareSceneRows(scenes, model, state).map((row) => row.id)).toEqual(["s1", "s2"]);

    state.setSort(SORT_MODES.NAME_DESC);
    expect(prepareSceneRows(scenes, model, state).map((row) => row.id)).toEqual(["s1", "s2"]);

    state.setSort(SORT_MODES.DIRECTORY_DESC);
    expect(prepareSceneRows(scenes, model, state).map((row) => row.id)).toEqual(["s2", "s1"]);
  });
});
