// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { describe, expect, it } from "./vitest-shim.js";
import { SORT_MODES } from "../src/constants.js";
import { registerSettings } from "../src/settings.js";

describe("SceneOrganizer ApplicationV2 integration", () => {
  it("opens through the registered settings menu without assigning ApplicationV2.state", async () => {
    const menus = [];
    globalThis.game = {
      i18n: {
        localize: (key) => key
      },
      settings: {
        get: (_moduleId, key) => {
          if (key === "organizerSort") return SORT_MODES.NAME;
          if (key === "rememberWindowPosition") return false;
          return undefined;
        },
        register: () => undefined,
        registerMenu: (_moduleId, _key, data) => menus.push(data),
        set: async () => undefined
      }
    };

    registerSettings();
    expect(menus).toHaveLength(1);

    const OrganizerMenu = menus[0].type;
    const organizer = new OrganizerMenu();
    await organizer.render({ force: true });

    expect(organizer.rendered).toBe(true);
    expect(organizer.state).toBe(2);
    expect(organizer.organizerState.sort).toBe(SORT_MODES.NAME);
  });
});
