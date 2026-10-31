// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { MODULE_ID, ROOT_FOLDER_ID, SETTINGS } from "../constants.js";
import { buildFolderModel, folderPath } from "../services/folder-model.js";

export function escapeHtml(value) {
  const text = String(value ?? "");
  if (globalThis.foundry?.utils?.escapeHTML) return globalThis.foundry.utils.escapeHTML(text);
  return text.replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
}

export function localize(key, data = undefined) {
  if (data) return globalThis.game?.i18n?.format(key, data) ?? key;
  return globalThis.game?.i18n?.localize(key) ?? key;
}

export function folderLabel(folderId, folders) {
  const model = buildFolderModel(folders);
  return folderPath(folderId, model, localize("SFT.Destination.Root"));
}

export async function confirmSceneMove(sceneNames, destinationName) {
  const isBulk = sceneNames.length > 1;
  const settingKey = isBulk ? SETTINGS.CONFIRM_BULK : SETTINGS.CONFIRM_SINGLE;
  if (!globalThis.game?.settings?.get(MODULE_ID, settingKey)) return true;

  const countText = localize(isBulk ? "SFT.Confirm.BulkText" : "SFT.Confirm.SingleText", {
    count: sceneNames.length,
    destination: destinationName,
    scene: sceneNames[0] ?? ""
  });
  const list = sceneNames.map((name) => `<li>${escapeHtml(name)}</li>`).join("");
  const details = isBulk
    ? `<details><summary>${escapeHtml(localize("SFT.Confirm.SceneList"))}</summary><ul>${list}</ul></details>`
    : "";
  return globalThis.foundry.applications.api.DialogV2.confirm({
    window: { title: localize("SFT.Confirm.Title") },
    content: `<p>${escapeHtml(countText)}</p>${details}`,
    modal: true,
    rejectClose: false
  });
}

export function notifyMoveResult(result, notifier) {
  if (result.moved.length === 0 && result.failures.length === 0) {
    notifier.success("SFT.Notify.NoChanges", { count: result.skipped.length });
    return;
  }
  if (result.moved.length > 0 && result.failures.length === 0) {
    notifier.success(result.operation === "undo" ? "SFT.Notify.UndoSuccess" : "SFT.Notify.MoveSuccess", {
      count: result.moved.length
    });
    return;
  }
  const details = summarizeFailures(result.failures);
  if (result.moved.length > 0 && result.failures.length > 0) {
    notifier.warn(result.operation === "undo" ? "SFT.Notify.UndoPartial" : "SFT.Notify.MovePartial", {
      moved: result.moved.length,
      failed: result.failures.length,
      details
    });
    return;
  }
  notifier.error(result.operation === "undo" ? "SFT.Notify.UndoFailed" : "SFT.Notify.MoveFailed", {
    failed: result.failures.length,
    details
  });
}

function summarizeFailures(failures) {
  const maximumNames = 5;
  const names = failures
    .slice(0, maximumNames)
    .map((failure) => failure.sceneName || localize("SFT.Notify.UnknownScene"));
  const remaining = Math.max(0, failures.length - names.length);
  const visible = names.join(", ");
  return remaining > 0
    ? localize("SFT.Notify.FailureDetailsMore", { scenes: visible, remaining })
    : localize("SFT.Notify.FailureDetails", { scenes: visible });
}

export function normalizeDestinationId(value) {
  return value === ROOT_FOLDER_ID ? null : value;
}

export function destinationData(ids, model, rootLabel) {
  return ids
    .map((id) => {
      if (id === ROOT_FOLDER_ID) return { id, name: rootLabel, path: rootLabel, isRoot: true };
      const node = model.nodes.get(id);
      return node ? { id: node.id, name: node.name, path: node.path, isRoot: false } : null;
    })
    .filter(Boolean);
}

export function readPosition(key) {
  if (!globalThis.game?.settings?.get(MODULE_ID, SETTINGS.REMEMBER_POSITION)) return {};
  try {
    return globalThis.game.settings.get(MODULE_ID, key) ?? {};
  } catch {
    return {};
  }
}

export function createPositionSaver(key) {
  let timer = null;
  return (position) => {
    if (!globalThis.game?.settings?.get(MODULE_ID, SETTINGS.REMEMBER_POSITION)) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const safePosition = Object.fromEntries(
        ["top", "left", "width", "height"].filter((field) => Number.isFinite(position[field])).map((field) => [field, position[field]])
      );
      globalThis.game.settings.set(MODULE_ID, key, safePosition).catch(() => undefined);
    }, 200);
  };
}
