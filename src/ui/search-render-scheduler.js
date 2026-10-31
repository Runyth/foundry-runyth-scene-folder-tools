// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
export class SearchRenderScheduler {
  constructor({ app, delay = 150, setTimer = globalThis.setTimeout, clearTimer = globalThis.clearTimeout }) {
    this.app = app;
    this.delay = delay;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.timer = null;
  }

  schedule({ inputName, selectionStart = null, selectionEnd = null }) {
    this.cancel();
    this.timer = this.setTimer(async () => {
      this.timer = null;
      if (!this.app.rendered) return;
      if (typeof this.app.renderPreservingScroll === "function") {
        await this.app.renderPreservingScroll({ force: true });
      } else {
        await this.app.render({ force: true });
      }
      const replacement = this.app.element?.querySelector(`[name="${inputName}"]`);
      replacement?.focus();
      if (typeof replacement?.setSelectionRange === "function") {
        const fallback = String(replacement.value ?? "").length;
        replacement.setSelectionRange(selectionStart ?? fallback, selectionEnd ?? fallback);
      }
    }, this.delay);
  }

  cancel() {
    if (this.timer === null) return;
    this.clearTimer(this.timer);
    this.timer = null;
  }
}
