// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { describe, expect, it, vi } from "./vitest-shim.js";
import { FOLDER_SORT_MODES, SORT_MODES } from "../src/constants.js";
import { SceneOrganizer } from "../src/ui/scene-organizer.js";

describe("SceneOrganizer folder sorting", () => {
  it("rerenders through the scroll-preserving path when folder sorting changes", async () => {
    const set = vi.fn(async () => undefined);
    globalThis.game = {
      settings: {
        get: (_moduleId, key) => {
          if (key === "organizerSort") return SORT_MODES.NAME;
          if (key === "organizerFolderSort") return FOLDER_SORT_MODES.NAME;
          if (key === "rememberWindowPosition") return false;
          return undefined;
        },
        set
      }
    };
    const organizer = new SceneOrganizer();
    organizer.render = vi.fn();
    organizer.renderPreservingScroll = vi.fn(async () => undefined);

    await organizer.updateFolderSort(FOLDER_SORT_MODES.RECENTS);

    expect(organizer.organizerState.folderSort).toBe(FOLDER_SORT_MODES.RECENTS);
    expect(set).toHaveBeenCalledTimes(1);
    expect(organizer.renderPreservingScroll).toHaveBeenCalledTimes(1);
    expect(organizer.render).toHaveBeenCalledTimes(0);
  });
});
