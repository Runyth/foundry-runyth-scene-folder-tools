// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { beforeEach, describe, expect, it } from "./vitest-shim.js";
import { MODULE_ID, SETTINGS } from "../src/constants.js";
import { registerSettings } from "../src/settings.js";
import { FLEET_UI_CLASS, applyUiLook, enforceUiLook, isStockFoundryLook } from "../src/ui/ui-look.js";

const originalGame = globalThis.game;
const originalHooks = globalThis.Hooks;
const originalDocument = globalThis.document;

let stockLook;

function fakeElement() {
  const classes = new Set();
  return {
    className: "runyth-scene-folder-tools",
    classList: {
      classes,
      toggle(name, force) {
        const active = force === undefined ? !classes.has(name) : Boolean(force);
        if (active) classes.add(name);
        else classes.delete(name);
        return active;
      },
      contains(name) {
        return classes.has(name);
      }
    },
    containsClass(name) {
      return classes.has(name);
    }
  };
}

describe("stock Foundry look toggle", () => {
  beforeEach(() => {
    stockLook = false;
    globalThis.game = {
      i18n: { localize: (key) => key },
      settings: {
        get: (_moduleId, key) => (key === SETTINGS.STOCK_LOOK ? stockLook : undefined),
        register: () => undefined,
        registerMenu: () => undefined
      }
    };
    globalThis.Hooks = { on: () => 77 };
    globalThis.document = { querySelectorAll: () => [] };
  });

  it("registers the stock toggle disabled by default on the client scope", () => {
    const registered = [];
    globalThis.game.settings.register = (_moduleId, key, data) => registered.push({ key, data });
    registerSettings();
    const entry = registered.find(({ key }) => key === SETTINGS.STOCK_LOOK);
    expect(entry.data.default).toBe(false);
    expect(entry.data.type).toBe(Boolean);
    expect(entry.data.config).toBe(true);
    expect(entry.data.scope).toBe("client");
    expect(registered.some(({ key }) => key === MODULE_ID)).toBe(false);
    expect(isStockFoundryLook()).toBe(false);
  });

  it("applies the fleet class while the stock look stays disabled", () => {
    const element = fakeElement();
    applyUiLook(element);
    expect(element.containsClass(FLEET_UI_CLASS)).toBe(true);
    expect(isStockFoundryLook()).toBe(false);
  });

  it("keeps the stock Foundry look verbatim when the toggle is enabled", () => {
    stockLook = true;
    expect(isStockFoundryLook()).toBe(true);
    const element = fakeElement();
    applyUiLook(element);
    expect(element.containsClass(FLEET_UI_CLASS)).toBe(false);
  });

  it("re-applies the resolved look from the module id on every open window", () => {
    const organizer = fakeElement();
    const picker = fakeElement();
    globalThis.document = { querySelectorAll: () => [organizer, picker] };
    enforceUiLook();
    expect(organizer.containsClass(FLEET_UI_CLASS)).toBe(true);
    expect(picker.containsClass(FLEET_UI_CLASS)).toBe(true);
    stockLook = true;
    enforceUiLook();
    expect(organizer.containsClass(FLEET_UI_CLASS)).toBe(false);
    expect(picker.containsClass(FLEET_UI_CLASS)).toBe(false);
    globalThis.document = { querySelectorAll: () => [] };
  });
});
