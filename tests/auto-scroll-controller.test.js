// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { describe, expect, it } from "./vitest-shim.js";
import { AutoScrollController } from "../src/integration/auto-scroll-controller.js";

function makeHarness({ reduced = false } = {}) {
  const container = document.createElement("div");
  container.innerHTML = '<div class="directory-item" data-entry-id="s1"></div>';
  Object.defineProperty(container, "scrollTop", { value: 100, writable: true });
  container.getBoundingClientRect = () => ({ top: 100, bottom: 500, left: 0, right: 200, width: 200, height: 400 });
  const frames = new Map();
  let nextId = 1;
  const controller = new AutoScrollController({
    container,
    getZoneSize: () => 50,
    getMaxSpeed: () => 500,
    reducedMotion: () => reduced,
    requestFrame: (callback) => {
      const id = nextId++;
      frames.set(id, callback);
      return id;
    },
    cancelFrame: (id) => frames.delete(id)
  });
  return {
    container,
    controller,
    frames,
    runFrame(timestamp = 16) {
      const [id, callback] = frames.entries().next().value ?? [];
      if (!callback) return;
      frames.delete(id);
      callback(timestamp);
    }
  };
}

describe("AutoScrollController", () => {
  it("activates near the top edge", () => {
    const test = makeHarness();
    test.controller.dragging = true;
    test.controller.updatePointer(105);
    test.runFrame();
    expect(test.container.scrollTop).toBeLessThan(100);
  });

  it("activates near the bottom edge", () => {
    const test = makeHarness();
    test.controller.dragging = true;
    test.controller.updatePointer(495);
    test.runFrame();
    expect(test.container.scrollTop).toBeGreaterThan(100);
  });

  it("does not activate outside the edge zones", () => {
    const test = makeHarness();
    test.controller.dragging = true;
    test.controller.updatePointer(300);
    expect(test.frames.size).toBe(0);
    expect(test.container.scrollTop).toBe(100);
  });

  it("stops immediately when drag ends", () => {
    const test = makeHarness();
    test.controller.dragging = true;
    test.controller.updatePointer(495);
    expect(test.frames.size).toBe(1);
    test.controller.stop();
    expect(test.frames.size).toBe(0);
    expect(test.controller.direction).toBe(0);
  });

  it("stops when the directory closes", () => {
    const test = makeHarness();
    test.controller.attach();
    test.controller.dragging = true;
    test.controller.updatePointer(495);
    test.controller.destroy();
    expect(test.frames.size).toBe(0);
    expect(test.controller.controller).toBeNull();
  });

  it("does not create duplicate frame timers", () => {
    const test = makeHarness();
    test.controller.dragging = true;
    test.controller.updatePointer(495);
    test.controller.updatePointer(490);
    expect(test.frames.size).toBe(1);
  });

  it("uses reduced-motion-safe controlled movement", () => {
    const normal = makeHarness({ reduced: false });
    normal.controller.dragging = true;
    normal.controller.updatePointer(140);
    normal.runFrame();

    const reduced = makeHarness({ reduced: true });
    reduced.controller.dragging = true;
    reduced.controller.updatePointer(140);
    reduced.runFrame();

    expect(Number.isFinite(normal.container.scrollTop)).toBe(true);
    expect(Number.isFinite(reduced.container.scrollTop)).toBe(true);
    expect(reduced.container.scrollTop).toBeLessThan(100);
  });

  it("only begins dragging from a scoped directory entry", () => {
    const test = makeHarness();
    const entry = test.container.querySelector(".directory-item");
    expect(test.controller.beginDrag(entry)).toBe(true);
    expect(test.controller.beginDrag(document.createElement("span"))).toBe(false);
  });
});
