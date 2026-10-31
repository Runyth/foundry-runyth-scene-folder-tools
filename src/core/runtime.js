// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
let runtime;

export function setRuntime(value) {
  runtime = value;
}

export function getRuntime() {
  if (!runtime) throw new Error("Scene Folder Tools runtime is not ready.");
  return runtime;
}
