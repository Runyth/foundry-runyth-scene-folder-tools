// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { describe, expect, it } from "./vitest-shim.js";
import { captureScrollState, restoreScrollState } from "../src/ui/scroll-state.js";

function makeRoot(regions) {
  return {
    querySelectorAll: () => regions
  };
}

describe("organizer scroll state", () => {
  it("captures and restores both independently scrolling organizer panes", () => {
    const scenes = { dataset: { scrollKey: "scenes" }, scrollTop: 725, scrollLeft: 4 };
    const folders = { dataset: { scrollKey: "folders" }, scrollTop: 315, scrollLeft: 0 };
    const state = captureScrollState(makeRoot([scenes, folders]));

    scenes.scrollTop = 0;
    scenes.scrollLeft = 0;
    folders.scrollTop = 0;
    restoreScrollState(makeRoot([scenes, folders]), state);

    expect(scenes.scrollTop).toBe(725);
    expect(scenes.scrollLeft).toBe(4);
    expect(folders.scrollTop).toBe(315);
  });

  it("ignores missing roots and newly introduced scroll regions safely", () => {
    expect(captureScrollState(null)).toBeNull();
    const state = { scenes: { top: 120, left: 0 } };
    const folders = { dataset: { scrollKey: "folders" }, scrollTop: 20, scrollLeft: 0 };
    restoreScrollState(makeRoot([folders]), state);
    expect(folders.scrollTop).toBe(20);
  });
});
