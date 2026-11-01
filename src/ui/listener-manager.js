// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
export class ListenerManager {
  constructor() {
    this.controller = null;
  }

  reset() {
    this.controller?.abort();
    this.controller = new AbortController();
    return this.controller.signal;
  }

  abort() {
    this.controller?.abort();
    this.controller = null;
  }
}
