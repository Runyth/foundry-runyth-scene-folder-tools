// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { describe, expect, it } from "./vitest-shim.js";
import { DestinationStore } from "../src/services/destination-store.js";
import { ROOT_FOLDER_ID } from "../src/constants.js";

function harness(initial = {}, limit = 3) {
  let state = structuredClone(initial);
  const store = new DestinationStore({
    read: async () => state,
    write: async (value) => {
      state = structuredClone(value);
    },
    getLimit: () => limit
  });
  return { store, get state() { return state; } };
}

describe("DestinationStore", () => {
  it("removes deleted recent folders", async () => {
    const test = harness({ recent: ["valid", "deleted", ROOT_FOLDER_ID], favorites: [] });
    expect((await test.store.getState(["valid"])).recent).toEqual(["valid", ROOT_FOLDER_ID]);
  });

  it("retains recent folders in most-recent-first order and enforces the limit", async () => {
    const test = harness({ recent: ["a", "b"], favorites: [] }, 2);
    await test.store.remember("c", ["a", "b", "c"]);
    expect(test.state.recent).toEqual(["c", "a"]);
  });

  it("supports root as a recent destination", async () => {
    const test = harness({ recent: [], favorites: [] });
    await test.store.remember(null, []);
    expect(test.state.recent).toEqual([ROOT_FOLDER_ID]);
  });

  it("adds and removes favorite folders", async () => {
    const test = harness({ recent: [], favorites: [] });
    await test.store.setFavorite("a", true, ["a"]);
    expect(test.state.favorites).toEqual(["a"]);
    await test.store.setFavorite("a", false, ["a"]);
    expect(test.state.favorites).toEqual([]);
  });

  it("does not favorite the root destination", async () => {
    const test = harness({ recent: [], favorites: [] });
    await test.store.setFavorite(ROOT_FOLDER_ID, true, []);
    expect(test.state.favorites).toEqual([]);
  });

  it("does not throw when destination settings cannot be persisted", async () => {
    const errors = [];
    const store = new DestinationStore({
      read: async () => ({ recent: [], favorites: [] }),
      write: async () => {
        throw new Error("settings unavailable");
      },
      getLimit: () => 3,
      onWriteError: (error) => errors.push(error.message)
    });

    expect(await store.remember("a", ["a"])).toEqual({ recent: ["a"], persisted: false });
    expect(await store.setFavorite("a", true, ["a"])).toEqual({
      recent: [],
      favorites: ["a"],
      persisted: false
    });
    expect(errors).toEqual(["settings unavailable", "settings unavailable"]);
  });
});
