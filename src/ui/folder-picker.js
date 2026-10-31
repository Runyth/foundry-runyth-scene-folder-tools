// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { MODULE_ID, ROOT_FOLDER_ID, SETTINGS } from "../constants.js";
import { getRuntime } from "../core/runtime.js";
import { SceneFolderToolsError } from "../core/errors.js";
import { buildFolderModel, expandFolderAncestors, flattenFolderModel, folderPath } from "../services/folder-model.js";
import { ListenerManager } from "./listener-manager.js";
import { registerApplication, unregisterApplication } from "./app-registry.js";
import { SearchRenderScheduler } from "./search-render-scheduler.js";
import {
  confirmSceneMove,
  createPositionSaver,
  destinationData,
  localize,
  normalizeDestinationId,
  notifyMoveResult,
  readPosition
} from "./ui-helpers.js";

const { ApplicationV2, HandlebarsApplicationMixin } = globalThis.foundry.applications.api;

export class FolderPicker extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["runyth-scene-folder-tools", "sft-folder-picker"],
    tag: "section",
    position: { width: 560, height: 640 },
    window: { icon: "fa-solid fa-folder-open", resizable: true }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/folder-picker.hbs` }
  };

  constructor(config = {}) {
    const { sceneIds = [], move = false, initialFolderId = null, allowCreate = true, ...options } = /** @type {any} */ (config);
    super({ ...options, position: { ...readPosition(SETTINGS.PICKER_POSITION), ...(options.position ?? {}) } });
    if (!Array.isArray(sceneIds) || sceneIds.some((id) => typeof id !== "string" || id.trim().length === 0)) {
      throw new SceneFolderToolsError("INVALID_SCENE_IDS", "sceneIds must be an array of non-empty strings.");
    }
    if (move && sceneIds.length === 0) {
      throw new SceneFolderToolsError("INVALID_SCENE_IDS", "At least one Scene ID is required for a move.");
    }
    if (initialFolderId !== null && (typeof initialFolderId !== "string" || initialFolderId.trim().length === 0)) {
      throw new SceneFolderToolsError("INVALID_FOLDER_ID", "initialFolderId must be a folder ID or null.");
    }
    this.sceneIds = [...new Set(sceneIds)];
    this.move = Boolean(move);
    this.allowCreate = Boolean(allowCreate);
    this.selectedFolderId = initialFolderId ?? null;
    this.search = "";
    this.expandedFolderIds = new Set();
    this.busy = false;
    this.confirming = false;
    this.listeners = new ListenerManager();
    this.searchRenderScheduler = new SearchRenderScheduler({ app: this });
    this.savePosition = createPositionSaver(SETTINGS.PICKER_POSITION);
    this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.settled = false;
    this.resultPromise = new Promise((resolve) => {
      this.resolveResult = resolve;
    });
    registerApplication(this);
  }

  get title() {
    return localize(this.move ? "SFT.Picker.MoveTitle" : "SFT.Picker.Title");
  }

  async _prepareContext(options) {
    const runtime = getRuntime();
    const folders = runtime.folderService.getFolders();
    const model = buildFolderModel(folders);
    if (this.selectedFolderId && !model.nodes.has(this.selectedFolderId)) this.selectedFolderId = null;
    expandFolderAncestors(this.selectedFolderId, model, this.expandedFolderIds);
    const rootLabel = localize("SFT.Destination.Root");
    const destinationState = await runtime.destinationStore.getState(folders.map((folder) => folder.id));
    const scenes = this.sceneIds.map((id) => {
      const scene = runtime.adapter.getScene(id);
      return scene && runtime.permissions.canMoveScene(scene) ? scene : null;
    });
    const visibleScenes = scenes.filter(Boolean);
    const sceneNames = scenes.map((scene) => scene?.name ?? localize("SFT.Notify.UnknownScene"));
    const currentFolderIds = [
      ...new Set(visibleScenes.map((scene) => (typeof scene.folder === "string" ? scene.folder : scene.folder?.id ?? null)))
    ];
    const currentFolder = currentFolderIds.length === 1
      ? folderPath(currentFolderIds[0], model, rootLabel)
      : localize("SFT.Picker.MultipleCurrentFolders");
    const rows = flattenFolderModel(model, {
      search: this.search,
      expanded: this.expandedFolderIds,
      currentFolderId: this.selectedFolderId,
      favoriteIds: destinationState.favorites,
      recentIds: destinationState.recent
    }).map((row) => ({ ...row, displayName: row.isRoot ? rootLabel : row.name, indent: row.depth * 16 }));

    return {
      ...(await super._prepareContext(options)),
      sceneCount: this.sceneIds.length,
      sceneName: sceneNames[0] ?? localize("SFT.Picker.NoScene"),
      sceneNames,
      isBulk: this.sceneIds.length > 1,
      moving: this.move,
      currentFolder,
      selectedDestination: folderPath(this.selectedFolderId, model, rootLabel),
      folderRows: rows,
      favorites: destinationData(destinationState.favorites, model, rootLabel),
      recents: destinationData(destinationState.recent, model, rootLabel),
      search: this.search,
      busy: this.busy,
      allowCreate: this.allowCreate && runtime.permissions.canCreateFolder(),
      noSceneFolders: folders.length === 0,
      noMatchingFolders: Boolean(this.search.trim()) && rows.length === 1,
      confirmDisabled: this.busy || this.confirming
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const signal = this.listeners.reset();
    this.element.addEventListener("input", (event) => this.#onInput(event), { signal });
    this.element.addEventListener("click", (event) => this.#onClick(event), { signal });
  }

  _onPosition(position) {
    super._onPosition(position);
    this.savePosition(position);
  }

  async _onClose(options) {
    this.searchRenderScheduler.cancel();
    this.listeners.abort();
    unregisterApplication(this);
    if (!this.settled) this.#settle({ confirmed: false, folderId: null, moveResult: null });
    await super._onClose(options);
    if (this.returnFocus?.isConnected) this.returnFocus.focus();
    this.returnFocus = null;
  }

  #onInput(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.name !== "folderSearch") return;
    this.search = target.value;
    this.searchRenderScheduler.schedule({
      inputName: target.name,
      selectionStart: target.selectionStart,
      selectionEnd: target.selectionEnd
    });
  }

  async #onClick(event) {
    const button = event.target instanceof Element ? event.target.closest("button[data-action]") : null;
    if (!button || !this.element.contains(button)) return;
    event.preventDefault();
    const action = button.dataset.action;
    if (action === "select-folder" || action === "select-destination-chip") {
      this.selectedFolderId = normalizeDestinationId(button.dataset.folderId);
    } else if (action === "toggle-folder") {
      const id = button.dataset.folderId;
      if (this.expandedFolderIds.has(id)) this.expandedFolderIds.delete(id);
      else this.expandedFolderIds.add(id);
    } else if (action === "favorite-folder") {
      await this.#toggleFavorite(button.dataset.folderId, button.dataset.favorite !== "true");
    } else if (action === "create-folder") {
      await this.#createFolder();
      return;
    } else if (action === "confirm") {
      await this.#confirm();
      return;
    } else if (action === "cancel") {
      this.#settle({ confirmed: false, folderId: null, moveResult: null });
      await this.close();
      return;
    } else return;
    await this.render({ force: true });
  }

  async #confirm() {
    if (this.busy || this.confirming) return;
    const runtime = getRuntime();
    if (!this.move) {
      this.#settle({ confirmed: true, folderId: this.selectedFolderId, moveResult: null });
      await this.close();
      return;
    }

    const names = this.sceneIds.map((id) => {
      const scene = runtime.adapter.getScene(id);
      return scene && runtime.permissions.canMoveScene(scene)
        ? scene.name
        : localize("SFT.Notify.UnknownScene");
    });
    const destination = folderPath(
      this.selectedFolderId,
      buildFolderModel(runtime.folderService.getFolders()),
      localize("SFT.Destination.Root")
    );
    this.confirming = true;
    try {
      if (!(await confirmSceneMove(names, destination))) return;
    } finally {
      this.confirming = false;
    }

    this.busy = true;
    await this.render({ force: true });
    try {
      const result = await runtime.moveService.moveScenes(this.sceneIds, this.selectedFolderId);
      notifyMoveResult(result, runtime.notifier);
      this.#settle({ confirmed: result.moved.length > 0, folderId: this.selectedFolderId, moveResult: result });
      await this.close();
    } finally {
      this.busy = false;
    }
  }

  async #toggleFavorite(folderId, favorite) {
    const runtime = getRuntime();
    const validIds = runtime.folderService.getFolders().map((folder) => folder.id);
    const state = await runtime.destinationStore.setFavorite(folderId, favorite, validIds);
    if (!state.persisted) runtime.notifier.error("SFT.Error.DESTINATION_SAVE_FAILED");
  }

  async #createFolder() {
    if (this.busy) return;
    const input = this.element.querySelector('[name="newFolderName"]');
    const name = input?.value ?? "";
    const runtime = getRuntime();
    this.busy = true;
    await this.render({ force: true });
    try {
      const result = await runtime.folderService.create({
        name,
        parentFolderId: this.selectedFolderId
      });
      if (result.ok) {
        this.selectedFolderId = result.folder.id;
        if (result.folder.parentFolderId) this.expandedFolderIds.add(result.folder.parentFolderId);
        runtime.notifier.success("SFT.Notify.FolderCreated", { name: result.folder.name });
      } else runtime.notifier.error(`SFT.Error.${result.code}`);
    } catch (error) {
      runtime.notifier.error(`SFT.Error.${error.code ?? "CREATE_FAILED"}`);
    } finally {
      this.busy = false;
      await this.render({ force: true });
    }
  }

  #settle(result) {
    if (this.settled) return;
    this.settled = true;
    this.resolveResult(result);
  }
}

export async function openFolderPicker(options = {}) {
  const picker = new FolderPicker(options);
  await picker.render({ force: true });
  return picker.resultPromise;
}
