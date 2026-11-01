// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { getOrganizer } from "./app-registry.js";
import { SceneOrganizer } from "./scene-organizer.js";
import { openFolderPicker } from "./folder-picker.js";

export async function openOrganizer(options = {}) {
  let organizer = getOrganizer();
  if (!organizer) organizer = new SceneOrganizer(options);
  await organizer.render({ force: true });
  organizer.bringToFront?.();
  return organizer;
}

export { openFolderPicker };
