// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { describe, expect, it } from "./vitest-shim.js";
import { FolderService } from "../src/services/folder-service.js";
import { makeFolder } from "./helpers.js";

function harness({ folders = [], canCreate = true, maxDepth = 3 } = {}) {
  const folderMap = new Map(folders.map((folder) => [folder.id, folder]));
  const created = [];
  const adapter = {
    getSceneFolders: () => [...folderMap.values()].filter((folder) => folder.type === "Scene"),
    getFolder: (id) => folderMap.get(id) ?? null,
    getFolderMaxDepth: () => maxDepth,
    createFolder: async (data) => {
      created.push(data);
      const folder = makeFolder("created", data.name, data.type, data.folder, data.folder ? 1 : 0);
      folderMap.set(folder.id, folder);
      return folder;
    },
    emitHook: () => undefined
  };
  return {
    adapter,
    permissions: { canCreateFolder: () => canCreate },
    destinationStore: {},
    logger: { debug: () => undefined, error: () => undefined },
    created
  };
}

describe("FolderService", () => {
  it("creates only a Scene folder with the selected parent", async () => {
    const test = harness({ folders: [makeFolder("p", "Parent")] });
    const result = await new FolderService(test).create({ name: "Child", parentFolderId: "p" });
    expect(result.ok).toBe(true);
    expect(test.created[0]).toEqual({ name: "Child", type: "Scene", folder: "p", sorting: "a" });
  });

  it("prevents blank names", async () => {
    const test = harness();
    await expect(new FolderService(test).create({ name: "   " })).rejects.toMatchObject({ code: "FOLDER_NAME_REQUIRED" });
  });

  it("handles permission failure", async () => {
    const result = await new FolderService(harness({ canCreate: false })).create({ name: "Folder" });
    expect(result).toEqual(expect.objectContaining({ ok: false, code: "PERMISSION_DENIED" }));
  });

  it("rejects missing and non-Scene parents", async () => {
    const missing = await new FolderService(harness()).create({ name: "Folder", parentFolderId: "missing" });
    expect(missing.code).toBe("FOLDER_NOT_FOUND");
    const wrong = await new FolderService(harness({ folders: [makeFolder("a", "Actors", "Actor")] })).create({
      name: "Folder",
      parentFolderId: "a"
    });
    expect(wrong.code).toBe("INVALID_FOLDER_TYPE");
  });

  it("validates Foundry folder-depth restrictions", async () => {
    const parent = makeFolder("p", "Deep", "Scene", null, 3);
    const result = await new FolderService(harness({ folders: [parent], maxDepth: 3 })).create({
      name: "Too Deep",
      parentFolderId: "p"
    });
    expect(result.code).toBe("FOLDER_DEPTH_EXCEEDED");
  });
});
