// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "./vitest-shim.js";
import { ALL_SCENE_FOLDERS_ID, ROOT_FOLDER_ID } from "../src/constants.js";
import { buildFolderModel } from "../src/services/folder-model.js";
import {
  prepareSceneFolderFilterItems,
  sceneFolderFilterItemMatches,
  sceneFolderFilterLabel
} from "../src/ui/scene-folder-filter-model.js";
import { makeFolder } from "./helpers.js";

const labels = { allFolders: "All folders", rootOnly: "Root only" };

describe("large Scene-folder filter model", () => {
  it("builds a searchable filter list for more than 200 folders without truncating entries", () => {
    const folders = Array.from({ length: 240 }, (_, index) =>
      makeFolder(`folder-${index}`, `Folder ${String(index).padStart(3, "0")}`)
    );
    const model = buildFolderModel(folders);
    const items = prepareSceneFolderFilterItems(model, ALL_SCENE_FOLDERS_ID, labels);

    expect(items).toHaveLength(242);
    expect(items[0].id).toBe(ALL_SCENE_FOLDERS_ID);
    expect(items[1].id).toBe(ROOT_FOLDER_ID);
    expect(items.some((item) => item.id === "folder-239")).toBe(true);
  });

  it("searches both folder names and full paths and exposes the selected path as the control label", () => {
    const model = buildFolderModel([
      makeFolder("parent", "Settlements"),
      makeFolder("child", "Unsorted", "Scene", "parent", 1)
    ]);
    const items = prepareSceneFolderFilterItems(model, "child", labels);
    const child = items.find((item) => item.id === "child");

    expect(sceneFolderFilterItemMatches(child, "settlements unsorted")).toBe(true);
    expect(sceneFolderFilterItemMatches(child, "missing")).toBe(false);
    expect(sceneFolderFilterLabel("child", model, labels)).toBe("Settlements / Unsorted");
  });

  it("returns stable labels for the special all-folders and root-only filters", () => {
    const model = buildFolderModel([]);
    expect(sceneFolderFilterLabel(ALL_SCENE_FOLDERS_ID, model, labels)).toBe("All folders");
    expect(sceneFolderFilterLabel(ROOT_FOLDER_ID, model, labels)).toBe("Root only");
  });
  it("uses a bounded searchable panel instead of an unbounded native select", async () => {
    const [template, css] = await Promise.all([
      readFile(new URL("../templates/organizer.hbs", import.meta.url), "utf8"),
      readFile(new URL("../styles/runyth-scene-folder-tools.css", import.meta.url), "utf8")
    ]);

    expect(template.includes('name="sceneFolderFilterSearch"')).toBe(true);
    expect(template.includes('select name="sceneFolderFilter"')).toBe(false);
    expect(css.includes("max-height: min(18rem, 35vh)")).toBe(true);
    expect(css.includes(".sft-scene-folder-filter-options")).toBe(true);
    expect(css.includes("overflow: auto")).toBe(true);
  });

});
