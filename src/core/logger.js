// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { MODULE_ID, SETTINGS } from "../constants.js";

export class Logger {
  constructor(settings = globalThis.game?.settings) {
    this.settings = settings;
  }

  get debugEnabled() {
    try {
      return Boolean(this.settings?.get(MODULE_ID, SETTINGS.DEBUG));
    } catch {
      return false;
    }
  }

  debug(message, data) {
    if (!this.debugEnabled) return;
    if (data === undefined) console.debug(`[${MODULE_ID}] ${message}`);
    else console.debug(`[${MODULE_ID}] ${message}`, data);
  }

  info(message, data) {
    if (data === undefined) console.info(`[${MODULE_ID}] ${message}`);
    else console.info(`[${MODULE_ID}] ${message}`, data);
  }

  warn(message, data) {
    if (data === undefined) console.warn(`[${MODULE_ID}] ${message}`);
    else console.warn(`[${MODULE_ID}] ${message}`, data);
  }

  error(message, error) {
    console.error(`[${MODULE_ID}] ${message}`, error);
  }
}
