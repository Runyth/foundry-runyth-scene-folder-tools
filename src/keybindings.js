// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { MODULE_ID, SETTINGS } from "./constants.js";
import { getRuntime } from "./core/runtime.js";
import { getOrganizer } from "./ui/app-registry.js";
import { openOrganizer } from "./ui/open-apps.js";
import { notifyMoveResult } from "./ui/ui-helpers.js";

function enabled() {
  return globalThis.game.settings.get(MODULE_ID, SETTINGS.ENABLE_KEYBINDINGS);
}

export function registerKeybindings() {
  register("openOrganizer", "SFT.Keybindings.OpenOrganizer.Name", "SFT.Keybindings.OpenOrganizer.Hint", async () => {
    if (!enabled() || !getRuntime().permissions.canUseOrganizer()) return false;
    await openOrganizer();
    return true;
  });
  register("moveSelected", "SFT.Keybindings.MoveSelected.Name", "SFT.Keybindings.MoveSelected.Hint", async () => {
    if (!enabled()) return false;
    const organizer = getOrganizer();
    if (!organizer?.rendered) return false;
    return organizer.moveSelected();
  });
  register("focusSceneSearch", "SFT.Keybindings.FocusSceneSearch.Name", "SFT.Keybindings.FocusSceneSearch.Hint", () => {
    if (!enabled()) return false;
    const organizer = getOrganizer();
    if (!organizer?.rendered) return false;
    organizer.focusSceneSearch();
    return true;
  });
  register("undoLastMove", "SFT.Keybindings.UndoLastMove.Name", "SFT.Keybindings.UndoLastMove.Hint", async () => {
    if (!enabled()) return false;
    const runtime = getRuntime();
    const result = await runtime.moveService.undoLastMove();
    notifyMoveResult(result, runtime.notifier);
    return result.moved.length > 0;
  });
}

function register(name, nameKey, hintKey, onDown) {
  globalThis.game.keybindings.register(MODULE_ID, name, {
    name: nameKey,
    hint: hintKey,
    editable: [],
    restricted: false,
    precedence: globalThis.CONST.KEYBINDING_PRECEDENCE.NORMAL,
    onDown
  });
}
