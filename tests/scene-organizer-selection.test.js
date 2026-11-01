// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { describe, expect, it, vi } from "./vitest-shim.js";
import { FOLDER_SORT_MODES, SORT_MODES } from "../src/constants.js";
import { SceneOrganizer } from "../src/ui/scene-organizer.js";

describe("SceneOrganizer selection rendering", () => {
  it("updates checkbox selection without rerendering or resetting the list scroll position", () => {
    globalThis.game = {
      settings: {
        get: (_moduleId, key) => {
          if (key === "organizerSort") return SORT_MODES.NAME;
          if (key === "organizerFolderSort") return FOLDER_SORT_MODES.NAME;
          if (key === "rememberWindowPosition") return false;
          return undefined;
        }
      }
    };
    const sceneList = { scrollTop: 640 };
    const checkbox = {
      value: "s1",
      checked: false,
      closest: () => null
    };
    const organizer = new SceneOrganizer();
    organizer.element = {
      querySelectorAll: (selector) => (selector.includes("sceneSelection") ? [checkbox] : []),
      querySelector: () => null
    };
    organizer.render = vi.fn();

    organizer.updateSceneSelection({ sceneId: "s1", checked: true, source: "checkbox" });

    expect(organizer.organizerState.selectedSceneIds.has("s1")).toBe(true);
    expect(checkbox.checked).toBe(true);
    expect(sceneList.scrollTop).toBe(640);
    expect(organizer.render).toHaveBeenCalledTimes(0);
  });
});
