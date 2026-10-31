// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { rm } from "node:fs/promises";

await Promise.all([
  rm(new URL("../dist", import.meta.url), { recursive: true, force: true }),
  rm(new URL("../artifacts", import.meta.url), { recursive: true, force: true }),
  rm(new URL("../coverage", import.meta.url), { recursive: true, force: true })
]);
