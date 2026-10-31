// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "./vitest-shim.js";

async function filesRecursively(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await filesRecursively(absolute)));
    else result.push(absolute);
  }
  return result;
}

describe("localization", () => {
  it("keeps English and German keys in parity", async () => {
    const en = JSON.parse(await readFile("lang/en.json", "utf8"));
    const de = JSON.parse(await readFile("lang/de.json", "utf8"));
    expect(Object.keys(de).sort()).toEqual(Object.keys(en).sort());
  });

  it("defines every literal localization key used by source and templates", async () => {
    const en = JSON.parse(await readFile("lang/en.json", "utf8"));
    const files = [...(await filesRecursively("src")), ...(await filesRecursively("templates"))];
    const used = new Set();
    for (const file of files) {
      const text = await readFile(file, "utf8");
      for (const match of text.matchAll(/["'](SFT\.[A-Za-z0-9.]+)["']/g)) used.add(match[1]);
    }
    const missing = [...used].filter((key) => !(key in en));
    expect(missing).toEqual([]);
  });
});
