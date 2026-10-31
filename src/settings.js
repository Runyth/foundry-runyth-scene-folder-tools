// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { FOLDER_SORT_MODES, MODULE_ID, SETTINGS, SORT_MODES } from "./constants.js";
import { SceneOrganizer } from "./ui/scene-organizer.js";

function t(key) {
  return globalThis.game.i18n.localize(key);
}

export function registerSettings() {
  globalThis.game.settings.registerMenu(MODULE_ID, "organizerMenu", {
    name: t("SFT.Settings.OrganizerMenu.Name"),
    label: t("SFT.Settings.OrganizerMenu.Label"),
    hint: t("SFT.Settings.OrganizerMenu.Hint"),
    icon: "fa-solid fa-folder-tree",
    type: SceneOrganizer,
    restricted: true
  });

  register(SETTINGS.AUTO_SCROLL, {
    name: t("SFT.Settings.AutoScroll.Name"),
    hint: t("SFT.Settings.AutoScroll.Hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });
  register(SETTINGS.QUICK_MOVE, {
    name: t("SFT.Settings.QuickMove.Name"),
    hint: t("SFT.Settings.QuickMove.Hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });
  register(SETTINGS.AUTO_SCROLL_ZONE, {
    name: t("SFT.Settings.AutoScrollZone.Name"),
    hint: t("SFT.Settings.AutoScrollZone.Hint"),
    scope: "client",
    config: true,
    type: Number,
    range: { min: 24, max: 120, step: 4 },
    default: 56
  });
  register(SETTINGS.AUTO_SCROLL_SPEED, {
    name: t("SFT.Settings.AutoScrollSpeed.Name"),
    hint: t("SFT.Settings.AutoScrollSpeed.Hint"),
    scope: "client",
    config: true,
    type: Number,
    range: { min: 100, max: 1200, step: 50 },
    default: 500
  });
  register(SETTINGS.CONFIRM_SINGLE, {
    name: t("SFT.Settings.ConfirmSingle.Name"),
    hint: t("SFT.Settings.ConfirmSingle.Hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: false
  });
  register(SETTINGS.CONFIRM_BULK, {
    name: t("SFT.Settings.ConfirmBulk.Name"),
    hint: t("SFT.Settings.ConfirmBulk.Hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });
  register(SETTINGS.RECENT_LIMIT, {
    name: t("SFT.Settings.RecentLimit.Name"),
    hint: t("SFT.Settings.RecentLimit.Hint"),
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0, max: 20, step: 1 },
    default: 6,
    restricted: true
  });
  register(SETTINGS.REMEMBER_POSITION, {
    name: t("SFT.Settings.RememberPosition.Name"),
    hint: t("SFT.Settings.RememberPosition.Hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });
  register(SETTINGS.ORGANIZER_SORT, {
    name: t("SFT.Settings.DefaultSort.Name"),
    hint: t("SFT.Settings.DefaultSort.Hint"),
    scope: "client",
    config: true,
    type: String,
    choices: {
      [SORT_MODES.NAME]: t("SFT.Sort.SceneNameAsc"),
      [SORT_MODES.NAME_DESC]: t("SFT.Sort.SceneNameDesc"),
      [SORT_MODES.FOLDER]: t("SFT.Sort.SceneFolderAsc"),
      [SORT_MODES.FOLDER_DESC]: t("SFT.Sort.SceneFolderDesc"),
      [SORT_MODES.DIRECTORY]: t("SFT.Sort.SceneDirectoryAsc"),
      [SORT_MODES.DIRECTORY_DESC]: t("SFT.Sort.SceneDirectoryDesc")
    },
    default: SORT_MODES.NAME
  });
  register(SETTINGS.ORGANIZER_FOLDER_SORT, {
    name: t("SFT.Settings.DefaultFolderSort.Name"),
    hint: t("SFT.Settings.DefaultFolderSort.Hint"),
    scope: "client",
    config: true,
    type: String,
    choices: {
      [FOLDER_SORT_MODES.NAME]: t("SFT.Sort.FolderNameAsc"),
      [FOLDER_SORT_MODES.NAME_DESC]: t("SFT.Sort.FolderNameDesc"),
      [FOLDER_SORT_MODES.DIRECTORY]: t("SFT.Sort.FolderDirectory"),
      [FOLDER_SORT_MODES.FAVORITES]: t("SFT.Sort.FolderFavorites"),
      [FOLDER_SORT_MODES.RECENTS]: t("SFT.Sort.FolderRecents")
    },
    default: FOLDER_SORT_MODES.NAME
  });
  register(SETTINGS.ENABLE_KEYBINDINGS, {
    name: t("SFT.Settings.EnableKeybindings.Name"),
    hint: t("SFT.Settings.EnableKeybindings.Hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });
  register(SETTINGS.DEBUG, {
    name: t("SFT.Settings.Debug.Name"),
    hint: t("SFT.Settings.Debug.Hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: false
  });
  register(SETTINGS.ORGANIZER_POSITION, {
    scope: "client",
    config: false,
    type: Object,
    default: {}
  });
  register(SETTINGS.PICKER_POSITION, {
    scope: "client",
    config: false,
    type: Object,
    default: {}
  });
  register(SETTINGS.DESTINATIONS, {
    scope: "user",
    config: false,
    type: Object,
    default: { recent: [], favorites: [] }
  });
}

function register(key, data) {
  globalThis.game.settings.register(MODULE_ID, key, data);
}
