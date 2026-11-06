// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
export const MODULE_ID = "runyth-scene-folder-tools";
export const MODULE_TITLE = "Scene Folder Tools";
export const VERSION = "1.2.1";
export const API_VERSION = "1.0.0";
export const ROOT_FOLDER_ID = "__root__";
export const ALL_SCENE_FOLDERS_ID = "__all__";
export const UNDO_TTL_MS = 30 * 60 * 1000;

export const SETTINGS = Object.freeze({
  AUTO_SCROLL: "enableAutoScroll",
  QUICK_MOVE: "enableQuickMove",
  AUTO_SCROLL_ZONE: "autoScrollZone",
  AUTO_SCROLL_SPEED: "autoScrollSpeed",
  CONFIRM_SINGLE: "confirmSingleMove",
  CONFIRM_BULK: "confirmBulkMove",
  RECENT_LIMIT: "recentFolderLimit",
  REMEMBER_POSITION: "rememberWindowPosition",
  ORGANIZER_POSITION: "organizerPosition",
  PICKER_POSITION: "pickerPosition",
  ORGANIZER_SORT: "organizerSort",
  ORGANIZER_FOLDER_SORT: "organizerFolderSort",
  ENABLE_KEYBINDINGS: "enableKeybindings",
  DEBUG: "debugLogging",
  STOCK_LOOK: "stockFoundryLook",
  DESTINATIONS: "destinations"
});

export const SORT_MODES = Object.freeze({
  NAME: "name",
  NAME_DESC: "name-desc",
  FOLDER: "folder",
  FOLDER_DESC: "folder-desc",
  DIRECTORY: "directory",
  DIRECTORY_DESC: "directory-desc"
});

export const FOLDER_SORT_MODES = Object.freeze({
  NAME: "name",
  NAME_DESC: "name-desc",
  DIRECTORY: "directory",
  FAVORITES: "favorites",
  RECENTS: "recents"
});
