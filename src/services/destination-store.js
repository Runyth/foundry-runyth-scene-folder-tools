// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { ROOT_FOLDER_ID } from "../constants.js";

export class DestinationStore {
  constructor({ read, write, getLimit, onWriteError = (_error) => undefined }) {
    this.read = read;
    this.write = write;
    this.getLimit = getLimit;
    this.onWriteError = onWriteError;
  }

  async getState(validFolderIds = []) {
    const valid = new Set([ROOT_FOLDER_ID, ...validFolderIds]);
    const raw = (await this.read()) ?? {};
    const recent = unique(raw.recent).filter((id) => valid.has(id));
    const favorites = unique(raw.favorites).filter((id) => valid.has(id) && id !== ROOT_FOLDER_ID);
    if (!sameArray(recent, raw.recent) || !sameArray(favorites, raw.favorites)) {
      await this.#safeWrite({ recent, favorites });
    }
    return { recent, favorites };
  }

  async remember(folderId, validFolderIds = []) {
    const state = await this.getState(validFolderIds);
    const id = folderId ?? ROOT_FOLDER_ID;
    const limit = Math.max(0, Number(this.getLimit() ?? 5));
    const recent = [id, ...state.recent.filter((entry) => entry !== id)].slice(0, limit);
    const persisted = await this.#safeWrite({ ...state, recent });
    return { recent, persisted };
  }

  async setFavorite(folderId, favorite, validFolderIds = []) {
    if (!folderId || folderId === ROOT_FOLDER_ID) {
      return { ...(await this.getState(validFolderIds)), persisted: true };
    }
    const state = await this.getState(validFolderIds);
    const favorites = favorite
      ? unique([...state.favorites, folderId])
      : state.favorites.filter((entry) => entry !== folderId);
    const persisted = await this.#safeWrite({ ...state, favorites });
    return { ...state, favorites, persisted };
  }

  async #safeWrite(value) {
    try {
      await this.write(value);
      return true;
    } catch (error) {
      this.onWriteError(error);
      return false;
    }
  }
}

function unique(value) {
  return [...new Set(Array.isArray(value) ? value.filter((item) => typeof item === "string") : [])];
}

function sameArray(left = [], right = []) {
  return Array.isArray(right) && left.length === right.length && left.every((item, index) => item === right[index]);
}
