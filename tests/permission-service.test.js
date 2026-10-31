// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { describe, expect, it } from "./vitest-shim.js";
import { PermissionService } from "../src/services/permission-service.js";

function harness({ user, canModify = true, canCreate = true, scenes = [] }) {
  const adapter = {
    user,
    canCreateFolder: () => canCreate,
    getScenes: () => scenes
  };
  return new PermissionService(adapter);
}

describe("PermissionService", () => {
  it("rejects ordinary players even when they own a Scene", () => {
    const player = { id: "player", isGM: false };
    const scene = { canUserModify: () => true };
    const permissions = harness({ user: player, scenes: [scene] });
    expect(permissions.canMoveScene(scene)).toBe(false);
    expect(permissions.canCreateFolder()).toBe(false);
    expect(permissions.canUseOrganizer()).toBe(false);
  });

  it("supports Assistant GM and GM users when document permissions allow", () => {
    const assistant = { id: "assistant", isGM: true };
    const scene = { canUserModify: () => true };
    const permissions = harness({ user: assistant, scenes: [scene], canCreate: false });
    expect(permissions.canMoveScene(scene)).toBe(true);
    expect(permissions.canUseOrganizer()).toBe(true);
  });

  it("still enforces Scene update permission for GM-level users", () => {
    const assistant = { id: "assistant", isGM: true };
    const scene = { canUserModify: () => false };
    const permissions = harness({ user: assistant, scenes: [scene], canCreate: false });
    expect(permissions.canMoveScene(scene)).toBe(false);
    expect(permissions.canUseOrganizer()).toBe(false);
  });
});
