// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { beforeEach, describe, expect, it } from "./vitest-shim.js";
import { createApi } from "../src/api.js";
import { setRuntime } from "../src/core/runtime.js";
import { MoveService } from "../src/services/move-service.js";
import { makeFolder, makeMoveHarness, makeScene } from "./helpers.js";

let harness;
let api;

beforeEach(() => {
  harness = makeMoveHarness({
    scenes: [makeScene("s1", "One"), makeScene("s2", "Two", null, false)],
    folders: [makeFolder("f1", "Folder")]
  });
  const moveService = new MoveService(harness);
  setRuntime({
    ...harness,
    moveService,
    folderService: {
      getFolders: () => harness.adapter.getSceneFolders(),
      create: async (data) => ({ ok: true, folder: { id: "new", name: data.name, parentFolderId: data.parentFolderId ?? null } })
    },
    destinationStore: {
      getState: async () => ({ recent: ["f1"], favorites: [] }),
      setFavorite: async (_id, favorite) => ({ recent: [], favorites: favorite ? ["f1"] : [], persisted: true })
    },
    permissions: { ...harness.permissions, canUseOrganizer: () => true },
    notifier: { success: () => undefined, warn: () => undefined, error: () => undefined }
  });
  api = createApi();
});

describe("public API", () => {
  it("exposes an API version", () => {
    expect(api.apiVersion).toBe("1.0.0");
  });

  it("returns structured results for valid calls", async () => {
    const result = await api.moveScene("s1", "f1");
    expect(result).toEqual(expect.objectContaining({ ok: true, requested: 1, moved: expect.any(Array) }));
  });

  it("rejects invalid IDs", async () => {
    await expect(api.moveScenes([""], "f1")).rejects.toMatchObject({ code: "INVALID_SCENE_ID" });
  });

  it("supports root moves", async () => {
    await api.moveScene("s1", "f1");
    const result = await api.moveScenesToRoot(["s1"]);
    expect(result.ok).toBe(true);
    expect(harness.sceneMap.get("s1").folder).toBeNull();
  });

  it("returns permission failures without bypassing Foundry", async () => {
    const result = await api.moveScene("s2", "f1");
    expect(result.failures[0].code).toBe("PERMISSION_DENIED");
  });

  it("returns plain folder data and recent destinations", async () => {
    const folders = await api.getSceneFolders();
    expect(folders.some((folder) => folder.id === "f1" && folder.type === "Scene")).toBe(true);
    expect(await api.getRecentFolders()).toEqual(["f1"]);
  });


  it("rejects folder browsing for unauthorized users", async () => {
    const runtime = {
      ...harness,
      permissions: { ...harness.permissions, canUseOrganizer: () => false },
      moveService: new MoveService(harness),
      folderService: { getFolders: () => harness.adapter.getSceneFolders() },
      destinationStore: { getState: async () => ({ recent: [], favorites: [] }) }
    };
    setRuntime(runtime);
    const restrictedApi = createApi();
    await expect(restrictedApi.getSceneFolders()).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
  });

  it("validates favorite folder IDs", async () => {
    expect(await api.setFavoriteFolder("missing", true)).toEqual({ ok: false, code: "FOLDER_NOT_FOUND", favorites: [] });
    expect(await api.setFavoriteFolder("f1", true)).toEqual({ ok: true, code: null, favorites: ["f1"] });
  });

  it("reports favorite persistence failures", async () => {
    const runtime = {
      ...harness,
      moveService: new MoveService(harness),
      folderService: { getFolders: () => harness.adapter.getSceneFolders() },
      destinationStore: {
        setFavorite: async () => ({ recent: [], favorites: ["f1"], persisted: false })
      },
      permissions: { ...harness.permissions, canUseOrganizer: () => true }
    };
    setRuntime(runtime);
    const failingApi = createApi();
    expect(await failingApi.setFavoriteFolder("f1", true)).toEqual({
      ok: false,
      code: "DESTINATION_SAVE_FAILED",
      favorites: ["f1"]
    });
  });
});
