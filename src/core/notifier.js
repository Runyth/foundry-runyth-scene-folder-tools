// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
export class Notifier {
  constructor(ui = globalThis.ui, i18n = globalThis.game?.i18n) {
    this.ui = ui;
    this.i18n = i18n;
  }

  t(key, data = {}) {
    return Object.keys(data).length > 0
      ? this.i18n?.format(key, data) ?? key
      : this.i18n?.localize(key) ?? key;
  }

  success(key, data) {
    this.ui?.notifications?.info(this.t(key, data));
  }

  warn(key, data) {
    this.ui?.notifications?.warn(this.t(key, data));
  }

  error(key, data) {
    this.ui?.notifications?.error(this.t(key, data));
  }
}
