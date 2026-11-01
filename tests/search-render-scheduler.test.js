// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { describe, expect, it, vi } from "./vitest-shim.js";
import { SearchRenderScheduler } from "../src/ui/search-render-scheduler.js";

describe("SearchRenderScheduler", () => {
  it("coalesces rapid search input into one rerender and restores focus", async () => {
    let scheduled;
    const clearTimer = vi.fn();
    const input = { value: "forest", focus: vi.fn(), setSelectionRange: vi.fn() };
    const app = {
      rendered: true,
      render: vi.fn(async () => undefined),
      element: { querySelector: () => input }
    };
    const scheduler = new SearchRenderScheduler({
      app,
      setTimer: (callback) => {
        scheduled = callback;
        return 7;
      },
      clearTimer
    });

    scheduler.schedule({ inputName: "sceneSearch", selectionStart: 2, selectionEnd: 2 });
    scheduler.schedule({ inputName: "sceneSearch", selectionStart: 6, selectionEnd: 6 });
    expect(clearTimer).toHaveBeenCalledTimes(1);
    await scheduled();
    expect(app.render).toHaveBeenCalledTimes(1);
    expect(input.focus).toHaveBeenCalledTimes(1);
    expect(input.setSelectionRange).toHaveBeenCalledTimes(1);
  });

  it("does not rerender a closed ApplicationV2 instance", async () => {
    let scheduled;
    const app = { rendered: false, render: vi.fn(), element: null };
    const scheduler = new SearchRenderScheduler({
      app,
      setTimer: (callback) => {
        scheduled = callback;
        return 1;
      },
      clearTimer: () => undefined
    });
    scheduler.schedule({ inputName: "folderSearch" });
    await scheduled();
    expect(app.render).toHaveBeenCalledTimes(0);
  });
});
