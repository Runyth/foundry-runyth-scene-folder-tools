// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { describe, expect, it } from "./vitest-shim.js";
import { MoveService } from "../src/services/move-service.js";
import { makeFolder, makeMoveHarness, makeScene } from "./helpers.js";

describe("MoveService", () => {
  it("moves one Scene into a Scene folder", async () => {
    const harness = makeMoveHarness({
      scenes: [makeScene("s1", "One")],
      folders: [makeFolder("f1", "Folder")]
    });
    const service = new MoveService(harness);
    const result = await service.moveScene("s1", "f1");
    expect(result.ok).toBe(true);
    expect(harness.sceneMap.get("s1").folder).toBe("f1");
    expect(result.moved).toHaveLength(1);
  });

  it("moves a Scene to root", async () => {
    const harness = makeMoveHarness({
      scenes: [makeScene("s1", "One", "f1")],
      folders: [makeFolder("f1", "Folder")]
    });
    const service = new MoveService(harness);
    const result = await service.moveScene("s1", null);
    expect(result.ok).toBe(true);
    expect(harness.sceneMap.get("s1").folder).toBeNull();
  });

  it("moves multiple Scenes in one batch", async () => {
    const harness = makeMoveHarness({
      scenes: [makeScene("s1", "One"), makeScene("s2", "Two")],
      folders: [makeFolder("f1", "Folder")]
    });
    const service = new MoveService(harness);
    const result = await service.moveScenes(["s1", "s2"], "f1");
    expect(result.moved).toHaveLength(2);
    expect(harness.updatePayloads).toHaveLength(1);
    expect(harness.updatePayloads[0]).toEqual([
      { _id: "s1", folder: "f1" },
      { _id: "s2", folder: "f1" }
    ]);
  });

  it("rejects nonexistent Scenes", async () => {
    const harness = makeMoveHarness({ folders: [makeFolder("f1", "Folder")] });
    const result = await new MoveService(harness).moveScene("missing", "f1");
    expect(result.ok).toBe(false);
    expect(result.failures[0].code).toBe("SCENE_NOT_FOUND");
  });

  it("rejects nonexistent folders", async () => {
    const harness = makeMoveHarness({ scenes: [makeScene("s1", "One")] });
    const result = await new MoveService(harness).moveScene("s1", "missing");
    expect(result.ok).toBe(false);
    expect(result.failures.every((failure) => failure.code === "FOLDER_NOT_FOUND")).toBe(true);
  });

  it("rejects a non-Scene folder", async () => {
    const harness = makeMoveHarness({
      scenes: [makeScene("s1", "One")],
      folders: [makeFolder("f1", "Actor Folder", "Actor")]
    });
    const result = await new MoveService(harness).moveScene("s1", "f1");
    expect(result.failures[0].code).toBe("INVALID_FOLDER_TYPE");
  });

  it("reports permission failure", async () => {
    const harness = makeMoveHarness({
      scenes: [makeScene("s1", "One", null, false)],
      folders: [makeFolder("f1", "Folder")]
    });
    const result = await new MoveService(harness).moveScene("s1", "f1");
    expect(result.failures[0].code).toBe("PERMISSION_DENIED");
  });

  it("reports partial bulk failures after verified individual fallback", async () => {
    const harness = makeMoveHarness({
      scenes: [makeScene("s1", "One"), makeScene("s2", "Two")],
      folders: [makeFolder("f1", "Folder")],
      failBatch: true,
      failIndividual: new Set(["s2"])
    });
    const result = await new MoveService(harness).moveScenes(["s1", "s2"], "f1");
    expect(result.ok).toBe(false);
    expect(result.moved.map((entry) => entry.sceneId)).toEqual(["s1"]);
    expect(result.failures).toEqual([
      expect.objectContaining({ sceneId: "s2", code: "UPDATE_FAILED" })
    ]);
  });

  it("preserves unrelated Scene fields", async () => {
    const tokens = [{ _id: "t1", x: 100 }];
    const scene = makeScene("s1", "One", null, true, {
      tokens,
      walls: [{ _id: "w1" }],
      navigation: true,
      ownership: { default: 0 }
    });
    const before = structuredClone({ tokens: scene.tokens, walls: scene.walls, navigation: scene.navigation, ownership: scene.ownership });
    const harness = makeMoveHarness({ scenes: [scene], folders: [makeFolder("f1", "Folder")] });
    await new MoveService(harness).moveScene("s1", "f1");
    expect({ tokens: scene.tokens, walls: scene.walls, navigation: scene.navigation, ownership: scene.ownership }).toEqual(before);
    expect(harness.updatePayloads[0][0]).toEqual({ _id: "s1", folder: "f1" });
  });

  it("protects against double submission for the same Scene", async () => {
    let release;
    const harness = makeMoveHarness({
      scenes: [makeScene("s1", "One")],
      folders: [makeFolder("f1", "Folder")]
    });
    harness.adapter.updateScenes = async (updates) => {
      await new Promise((resolve) => {
        release = resolve;
      });
      for (const update of updates) harness.sceneMap.get(update._id).folder = update.folder;
    };
    const service = new MoveService(harness);
    const first = service.moveScene("s1", "f1");
    await Promise.resolve();
    const second = await service.moveScene("s1", "f1");
    expect(second.failures[0].code).toBe("SCENE_BUSY");
    release();
    expect((await first).ok).toBe(true);
  });

  it("undoes a single and bulk move", async () => {
    const harness = makeMoveHarness({
      scenes: [makeScene("s1", "One", "old"), makeScene("s2", "Two", null)],
      folders: [makeFolder("old", "Old"), makeFolder("new", "New")]
    });
    const service = new MoveService(harness);
    await service.moveScenes(["s1", "s2"], "new");
    const undo = await service.undoLastMove();
    expect(undo.ok).toBe(true);
    expect(harness.sceneMap.get("s1").folder).toBe("old");
    expect(harness.sceneMap.get("s2").folder).toBeNull();
  });

  it("reports incomplete undo after folder deletion", async () => {
    const harness = makeMoveHarness({
      scenes: [makeScene("s1", "One", "old"), makeScene("s2", "Two", null)],
      folders: [makeFolder("old", "Old"), makeFolder("new", "New")]
    });
    const service = new MoveService(harness);
    await service.moveScenes(["s1", "s2"], "new");
    harness.folderMap.delete("old");
    const undo = await service.undoLastMove();
    expect(undo.ok).toBe(false);
    expect(undo.failures).toEqual([
      expect.objectContaining({ sceneId: "s1", code: "PREVIOUS_FOLDER_NOT_FOUND" })
    ]);
    expect(harness.sceneMap.get("s2").folder).toBeNull();
  });


  it("does not overwrite a Scene moved elsewhere after the recorded move", async () => {
    const scene = makeScene("s1", "One");
    const f1 = makeFolder("f1", "First");
    const f2 = makeFolder("f2", "Second");
    const harness = makeMoveHarness({ scenes: [scene], folders: [f1, f2] });
    const service = new MoveService(harness);
    await service.moveScene("s1", "f1");
    scene.folder = "f2";
    const result = await service.undoLastMove();
    expect(result.failures[0].code).toBe("SCENE_CHANGED_SINCE_MOVE");
    expect(scene.folder).toBe("f2");
  });

  it("verifies that batch updates were retained", async () => {
    const scene = makeScene("s1", "One");
    const folder = makeFolder("f1", "Folder");
    const harness = makeMoveHarness({ scenes: [scene], folders: [folder] });
    harness.adapter.updateScenes = async () => [];
    const service = new MoveService(harness);
    const result = await service.moveScene("s1", "f1");
    expect(result.moved).toHaveLength(0);
    expect(result.failures[0].code).toBe("UPDATE_NOT_APPLIED");
  });

  it("keeps a successful move successful when recent destination persistence fails", async () => {
    const test = makeMoveHarness({ scenes: [makeScene("s1", "One")], folders: [makeFolder("f1", "Folder")] });
    test.destinationStore.remember = async () => {
      throw new Error("settings unavailable");
    };
    const result = await new MoveService(test).moveScene("s1", "f1");
    expect(result.ok).toBe(true);
    expect(result.moved).toHaveLength(1);
    expect(test.sceneMap.get("s1").folder).toBe("f1");
  });

  it("emits success and failure hooks with structured results", async () => {
    const harness = makeMoveHarness({
      scenes: [makeScene("s1", "One")],
      folders: [makeFolder("f1", "Folder")]
    });
    const service = new MoveService(harness);
    await service.moveScene("s1", "f1");
    await service.moveScene("missing", "f1");
    expect(harness.emitted.map((entry) => entry.name)).toEqual(["moveSuccess", "moveFailure"]);
    expect(harness.emitted[0].payload).toEqual(expect.objectContaining({ ok: true, moved: expect.any(Array) }));
  });
});
