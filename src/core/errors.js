// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
export class SceneFolderToolsError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "SceneFolderToolsError";
    this.code = code;
    this.details = details;
  }
}
