// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { describe, expect, it, vi } from "./vitest-shim.js";
import { ListenerManager } from "../src/ui/listener-manager.js";

describe("ListenerManager", () => {
  it("aborts listeners from the previous ApplicationV2 render", () => {
    const button = document.createElement("button");
    const handler = vi.fn();
    const manager = new ListenerManager();
    button.addEventListener("click", handler, { signal: manager.reset() });
    button.click();
    button.addEventListener("click", handler, { signal: manager.reset() });
    button.click();
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("aborts listeners when the application closes", () => {
    const button = document.createElement("button");
    const handler = vi.fn();
    const manager = new ListenerManager();
    button.addEventListener("click", handler, { signal: manager.reset() });
    manager.abort();
    button.click();
    expect(handler).not.toHaveBeenCalled();
  });
});
