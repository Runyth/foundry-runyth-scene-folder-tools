// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
export class PermissionService {
  constructor(adapter) {
    this.adapter = adapter;
  }

  canMoveScene(scene, user = this.adapter.user) {
    if (!scene || !user?.isGM) return false;
    try {
      return Boolean(scene.canUserModify?.(user, "update"));
    } catch {
      return Boolean(user.isGM);
    }
  }

  canCreateFolder(user = this.adapter.user) {
    if (!user?.isGM) return false;
    try {
      return this.adapter.canCreateFolder(user);
    } catch {
      return Boolean(user.isGM);
    }
  }

  canUseOrganizer(user = this.adapter.user) {
    if (!user?.isGM) return false;
    if (this.canCreateFolder(user)) return true;
    return this.adapter.getScenes().some((scene) => this.canMoveScene(scene, user));
  }
}
