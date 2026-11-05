// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { MODULE_ID, SETTINGS } from "../constants.js";

export const FLEET_UI_CLASS = "sft-fleet-ui";

export function isStockFoundryLook() {
  try {
    return Boolean(globalThis.game?.settings?.get(MODULE_ID, SETTINGS.STOCK_LOOK));
  } catch {
    return false;
  }
}

export function applyUiLook(element, stock = isStockFoundryLook()) {
  element?.classList?.toggle(FLEET_UI_CLASS, !stock);
}

export function enforceUiLook() {
  const stock = isStockFoundryLook();
  for (const element of globalThis.document?.querySelectorAll?.(".runyth-scene-folder-tools") ?? []) {
    applyUiLook(element, stock);
  }
  return stock;
}
