// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { FOLDER_SORT_MODES, MODULE_ID, SETTINGS, SORT_MODES } from "../constants.js";
import { getRuntime } from "../core/runtime.js";
import {
  buildFolderModel,
  expandFolderAncestors,
  flattenFolderModel,
  folderPath
} from "../services/folder-model.js";
import { ListenerManager } from "./listener-manager.js";
import {
  normalizeSearchText,
  prepareSceneFolderFilterItems,
  sceneFolderFilterLabel,
  sceneFolderFilterSearchTextMatches
} from "./scene-folder-filter-model.js";
import { captureScrollState, restoreScrollState } from "./scroll-state.js";
import { OrganizerState, prepareSceneRows } from "./organizer-state.js";
import { registerApplication, setOrganizer, unregisterApplication } from "./app-registry.js";
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

export class SceneOrganizer extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "runyth-scene-folder-tools-organizer",
    classes: ["runyth-scene-folder-tools", "sft-organizer"],
    tag: "section",
    position: { width: 980, height: 720 },
    window: { icon: "fa-solid fa-folder-tree", resizable: true }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/organizer.hbs` }
  };

  constructor(options = {}) {
    const applicationOptions = /** @type {any} */ (options);
    super({
      ...applicationOptions,
      position: { ...readPosition(SETTINGS.ORGANIZER_POSITION), ...(applicationOptions.position ?? {}) }
    });
    const defaultSort = globalThis.game.settings.get(MODULE_ID, SETTINGS.ORGANIZER_SORT) ?? SORT_MODES.NAME;
    const defaultFolderSort =
      globalThis.game.settings.get(MODULE_ID, SETTINGS.ORGANIZER_FOLDER_SORT) ?? FOLDER_SORT_MODES.NAME;
    this.organizerState = new OrganizerState({ sort: defaultSort, folderSort: defaultFolderSort });
    this.listeners = new ListenerManager();
    this.searchRenderScheduler = new SearchRenderScheduler({ app: this });
    this.confirming = false;
    this.pendingScrollState = null;
    this.focusSceneFolderFilterSearchAfterRender = false;
    this.focusSceneFolderFilterToggleAfterRender = false;
    this.savePosition = createPositionSaver(SETTINGS.ORGANIZER_POSITION);
    registerApplication(this);
    setOrganizer(this);
  }

  get title() {
    return localize("SFT.Organizer.Title");
  }

  async _prepareContext(options) {
    const runtime = getRuntime();
    const folders = runtime.folderService.getFolders();
    const folderModel = buildFolderModel(folders);
    if (this.organizerState.selectedFolderId && !folderModel.nodes.has(this.organizerState.selectedFolderId)) {
      this.organizerState.selectFolder(null);
    }
    this.organizerState.setSceneFolderFilter(this.organizerState.sceneFolderFilterId, folderModel);
    expandFolderAncestors(this.organizerState.selectedFolderId, folderModel, this.organizerState.expandedFolderIds);
    const destinationState = await runtime.destinationStore.getState(folders.map((folder) => folder.id));
    const movableScenes = runtime.adapter.getScenes().filter((scene) => runtime.permissions.canMoveScene(scene));
    this.organizerState.pruneSelection(movableScenes.map((scene) => scene.id));
    const sceneRows = prepareSceneRows(movableScenes, folderModel, this.organizerState);
    const rootLabel = localize("SFT.Destination.Root");
    const folderRows = flattenFolderModel(folderModel, {
      search: this.organizerState.folderSearch,
      expanded: this.organizerState.expandedFolderIds,
      currentFolderId: this.organizerState.selectedFolderId,
      favoriteIds: destinationState.favorites,
      recentIds: destinationState.recent,
      sort: this.organizerState.folderSort
    }).map((row) => ({ ...row, displayName: row.isRoot ? rootLabel : row.name, indent: row.depth * 16 }));
    const selectedDestination = folderPath(this.organizerState.selectedFolderId, folderModel, rootLabel);

    return {
      ...(await super._prepareContext(options)),
      sceneRows,
      folderRows,
      sceneFolderFilterItems: prepareSceneFolderFilterItems(
        folderModel,
        this.organizerState.sceneFolderFilterId,
        {
          allFolders: localize("SFT.Filter.AllFolders"),
          rootOnly: localize("SFT.Filter.RootOnly")
        }
      ),
      sceneFolderFilterLabel: sceneFolderFilterLabel(
        this.organizerState.sceneFolderFilterId,
        folderModel,
        {
          allFolders: localize("SFT.Filter.AllFolders"),
          rootOnly: localize("SFT.Filter.RootOnly")
        }
      ),
      sceneFolderFilterSearch: this.organizerState.sceneFolderFilterSearch,
      sceneFolderFilterOpen: this.organizerState.sceneFolderFilterOpen,
      sceneSortOptions: prepareSceneSortOptions(this.organizerState.sort),
      folderSortOptions: prepareFolderSortOptions(this.organizerState.folderSort),
      selectedCount: this.organizerState.selectedSceneIds.size,
      selectedDestination,
      sceneSearch: this.organizerState.sceneSearch,
      folderSearch: this.organizerState.folderSearch,
      favorites: destinationData(destinationState.favorites, folderModel, rootLabel),
      recents: destinationData(destinationState.recent, folderModel, rootLabel),
      busy: this.organizerState.busy,
      moveDisabled: this.organizerState.busy || this.organizerState.selectedSceneIds.size === 0,
      undoDisabled: this.organizerState.busy || !runtime.moveService.canUndo,
      canCreateFolder: runtime.permissions.canCreateFolder(),
      hasScenes: sceneRows.length > 0,
      hasFolders: folderRows.length > 0,
      noSceneFolders: folders.length === 0,
      noMatchingFolders: Boolean(this.organizerState.folderSearch.trim()) && folderRows.length === 1
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const signal = this.listeners.reset();
    const element = this.element;
    element.addEventListener("input", (event) => this.#onInput(event), { signal });
    element.addEventListener("change", (event) => this.#onChange(event), { signal });
    element.addEventListener("click", (event) => this.#onClick(event), { signal });
    element.addEventListener("keydown", (event) => this.#onKeyDown(event), { signal });
    this.#restoreScrollState();
    this.#applySceneFolderFilterSearch();
    if (this.focusSceneFolderFilterSearchAfterRender) {
      this.focusSceneFolderFilterSearchAfterRender = false;
      this.element.querySelector('[name="sceneFolderFilterSearch"]')?.focus();
    } else if (this.focusSceneFolderFilterToggleAfterRender) {
      this.focusSceneFolderFilterToggleAfterRender = false;
      this.element.querySelector('[data-action="toggle-scene-folder-filter"]')?.focus();
    }
  }

  _onPosition(position) {
    super._onPosition(position);
    this.savePosition(position);
  }

  async _onClose(options) {
    this.searchRenderScheduler.cancel();
    this.listeners.abort();
    unregisterApplication(this);
    await super._onClose(options);
  }

  focusSceneSearch() {
    this.element?.querySelector('[name="sceneSearch"]')?.focus();
  }

  updateSceneSelection({ sceneId, checked = false, shift = false, additive = false, source = "pointer" }) {
    const visibleIds = this.#visibleSceneIds();
    if (source === "checkbox") {
      this.organizerState.toggleScene(sceneId, { checked, shift, visibleIds });
    } else {
      this.organizerState.selectSceneByPointer(sceneId, { shift, additive, visibleIds });
    }
    this.#syncSelectionDom();
  }

  async renderPreservingScroll(options = { force: true }) {
    this.pendingScrollState = captureScrollState(this.element);
    return this.render(options);
  }

  async updateSceneSort(value) {
    this.organizerState.setSort(value);
    await globalThis.game.settings.set(MODULE_ID, SETTINGS.ORGANIZER_SORT, this.organizerState.sort);
    await this.renderPreservingScroll({ force: true });
  }

  async updateFolderSort(value) {
    this.organizerState.setFolderSort(value);
    await globalThis.game.settings.set(
      MODULE_ID,
      SETTINGS.ORGANIZER_FOLDER_SORT,
      this.organizerState.folderSort
    );
    await this.renderPreservingScroll({ force: true });
  }

  async moveSelected() {
    if (this.organizerState.busy || this.confirming || this.organizerState.selectedSceneIds.size === 0) {
      return false;
    }
    const runtime = getRuntime();
    const sceneIds = [...this.organizerState.selectedSceneIds];
    const sceneNames = sceneIds.map((id) => {
      const scene = runtime.adapter.getScene(id);
      return scene && runtime.permissions.canMoveScene(scene)
        ? scene.name
        : localize("SFT.Notify.UnknownScene");
    });
    const folders = runtime.folderService.getFolders();
    const destinationName = folderPath(
      this.organizerState.selectedFolderId,
      buildFolderModel(folders),
      localize("SFT.Destination.Root")
    );
    this.confirming = true;
    try {
      if (!(await confirmSceneMove(sceneNames, destinationName))) return false;
    } finally {
      this.confirming = false;
    }

    this.organizerState.busy = true;
    await this.renderPreservingScroll({ force: true });
    try {
      const result = await runtime.moveService.moveScenes(sceneIds, this.organizerState.selectedFolderId);
      notifyMoveResult(result, runtime.notifier);
      if (result.moved.length > 0) this.organizerState.clearSelection();
      return result.ok;
    } finally {
      this.organizerState.busy = false;
      await this.renderPreservingScroll({ force: true });
    }
  }

  #onInput(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.name === "sceneSearch") this.organizerState.setSceneSearch(target.value);
    else if (target.name === "folderSearch") this.organizerState.setFolderSearch(target.value);
    else if (target.name === "sceneFolderFilterSearch") {
      this.organizerState.setSceneFolderFilterSearch(target.value);
      this.#applySceneFolderFilterSearch();
      return;
    } else return;
    this.searchRenderScheduler.schedule({
      inputName: target.name,
      selectionStart: target.selectionStart,
      selectionEnd: target.selectionEnd
    });
  }

  async #onChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    if (target.name === "sceneSort") {
      await this.updateSceneSort(target.value);
    } else if (target.name === "folderSort") {
      await this.updateFolderSort(target.value);
    }
  }

  async #onClick(event) {
    const checkbox =
      event.target instanceof HTMLInputElement && event.target.name === "sceneSelection"
        ? event.target
        : null;
    if (checkbox) {
      event.stopPropagation();
      this.updateSceneSelection({
        sceneId: checkbox.value,
        checked: checkbox.checked,
        shift: Boolean(event.shiftKey),
        source: "checkbox"
      });
      return;
    }

    const target = event.target instanceof Element ? event.target : null;
    const sceneRow = target?.closest(".sft-scene-row[data-scene-id]");
    if (sceneRow && this.element.contains(sceneRow) && !target.closest("button, input, select, a")) {
      event.preventDefault();
      this.updateSceneSelection({
        sceneId: sceneRow.dataset.sceneId,
        shift: Boolean(event.shiftKey),
        additive: Boolean(event.ctrlKey || event.metaKey)
      });
      return;
    }

    const button = target?.closest("button[data-action]");
    if (!button || !this.element.contains(button)) return;
    event.preventDefault();
    const action = button.dataset.action;
    if (action === "select-all") {
      this.organizerState.selectAllVisible(this.#visibleSceneIds());
      this.#syncSelectionDom();
      return;
    }
    if (action === "clear-selection") {
      this.organizerState.clearSelection();
      this.#syncSelectionDom();
      return;
    }
    if (action === "toggle-scene-folder-filter") {
      const opening = !this.organizerState.sceneFolderFilterOpen;
      this.organizerState.setSceneFolderFilterOpen(opening);
      this.focusSceneFolderFilterSearchAfterRender = opening;
      this.focusSceneFolderFilterToggleAfterRender = !opening;
    } else if (action === "select-scene-folder-filter") {
      const model = buildFolderModel(getRuntime().folderService.getFolders());
      this.organizerState.setSceneFolderFilter(button.dataset.folderId, model);
      this.organizerState.setSceneFolderFilterOpen(false);
      this.organizerState.setSceneFolderFilterSearch("");
      this.focusSceneFolderFilterToggleAfterRender = true;
    } else if (action === "select-folder" || action === "select-destination-chip") {
      this.organizerState.selectFolder(normalizeDestinationId(button.dataset.folderId));
    } else if (action === "toggle-folder") {
      this.organizerState.toggleFolderExpanded(button.dataset.folderId);
    } else if (action === "favorite-folder") {
      await this.#toggleFavorite(button.dataset.folderId, button.dataset.favorite !== "true");
    } else if (action === "move-selected") {
      await this.moveSelected();
      return;
    } else if (action === "undo") {
      await this.#undo();
      return;
    } else if (action === "create-folder") {
      await this.#createFolder();
      return;
    } else if (action !== "refresh") {
      return;
    }
    await this.renderPreservingScroll({ force: true });
  }

  async #onKeyDown(event) {
    const target = event.target instanceof Element ? event.target : null;
    const filterPanel = target?.closest(".sft-scene-folder-filter-panel");
    if (filterPanel && event.key === "Escape") {
      event.preventDefault();
      this.organizerState.setSceneFolderFilterOpen(false);
      this.focusSceneFolderFilterToggleAfterRender = true;
      await this.renderPreservingScroll({ force: true });
      return;
    }
    const sceneList = target?.closest(".sft-scene-list");
    if (!sceneList || !this.element.contains(sceneList)) return;
    if ((event.ctrlKey || event.metaKey) && String(event.key).toLocaleLowerCase() === "a") {
      event.preventDefault();
      this.organizerState.selectAllVisible(this.#visibleSceneIds());
      this.#syncSelectionDom();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      this.organizerState.clearSelection();
      this.#syncSelectionDom();
      return;
    }
    if (target.closest("input, select, button, a")) return;
    const row = target.closest(".sft-scene-row[data-scene-id]");
    if (!row || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    this.updateSceneSelection({
      sceneId: row.dataset.sceneId,
      shift: Boolean(event.shiftKey),
      additive: Boolean(event.ctrlKey || event.metaKey)
    });
  }

  #visibleSceneIds() {
    return Array.from(this.element.querySelectorAll('input[name="sceneSelection"]')).map(
      (input) => input.value
    );
  }

  #syncSelectionDom() {
    for (const checkbox of this.element.querySelectorAll('input[name="sceneSelection"]')) {
      const selected = this.organizerState.selectedSceneIds.has(checkbox.value);
      checkbox.checked = selected;
      const row = checkbox.closest(".sft-scene-row");
      row?.classList.toggle("is-selected", selected);
      row?.setAttribute("aria-selected", String(selected));
    }
    const count = this.organizerState.selectedSceneIds.size;
    const selectionSummary = this.element.querySelector("[data-selection-summary]");
    if (selectionSummary) {
      selectionSummary.textContent = localize("SFT.Organizer.SelectedScenes", { count });
    }
    const moveSummary = this.element.querySelector("[data-move-summary]");
    if (moveSummary) {
      moveSummary.textContent = localize("SFT.Organizer.MoveSummary", {
        count,
        destination: moveSummary.dataset.destination ?? localize("SFT.Destination.Root")
      });
    }
    const moveButton = this.element.querySelector('button[data-action="move-selected"]');
    if (moveButton) moveButton.disabled = this.organizerState.busy || count === 0;
  }

  #restoreScrollState() {
    const state = this.pendingScrollState;
    this.pendingScrollState = null;
    restoreScrollState(this.element, state);
  }

  #applySceneFolderFilterSearch() {
    if (!this.element) return;
    const query = normalizeSearchText(this.organizerState.sceneFolderFilterSearch);
    let visibleCount = 0;
    for (const option of this.element.querySelectorAll("[data-scene-folder-filter-option]")) {
      const visible = sceneFolderFilterSearchTextMatches(option.dataset.searchText, query);
      option.hidden = !visible;
      if (visible) visibleCount += 1;
    }
    const emptyState = this.element.querySelector("[data-scene-folder-filter-empty]");
    if (emptyState) emptyState.hidden = visibleCount > 0;
  }

  async #toggleFavorite(folderId, favorite) {
    const runtime = getRuntime();
    const validIds = runtime.folderService.getFolders().map((folder) => folder.id);
    const state = await runtime.destinationStore.setFavorite(folderId, favorite, validIds);
    if (!state.persisted) runtime.notifier.error("SFT.Error.DESTINATION_SAVE_FAILED");
  }

  async #createFolder() {
    if (this.organizerState.busy) return;
    const input = this.element.querySelector('[name="newFolderName"]');
    const name = input?.value ?? "";
    const runtime = getRuntime();
    this.organizerState.busy = true;
    await this.renderPreservingScroll({ force: true });
    try {
      const result = await runtime.folderService.create({
        name,
        parentFolderId: this.organizerState.selectedFolderId
      });
      if (result.ok) {
        this.organizerState.selectFolder(result.folder.id);
        if (result.folder.parentFolderId) {
          this.organizerState.expandedFolderIds.add(result.folder.parentFolderId);
        }
        runtime.notifier.success("SFT.Notify.FolderCreated", { name: result.folder.name });
      } else {
        runtime.notifier.error(`SFT.Error.${result.code}`);
      }
    } catch (error) {
      runtime.notifier.error(`SFT.Error.${error.code ?? "CREATE_FAILED"}`);
    } finally {
      this.organizerState.busy = false;
      await this.renderPreservingScroll({ force: true });
    }
  }

  async #undo() {
    if (this.organizerState.busy) return;
    const runtime = getRuntime();
    this.organizerState.busy = true;
    await this.renderPreservingScroll({ force: true });
    try {
      const result = await runtime.moveService.undoLastMove();
      notifyMoveResult(result, runtime.notifier);
    } finally {
      this.organizerState.busy = false;
      await this.renderPreservingScroll({ force: true });
    }
  }
}

function prepareSceneSortOptions(selectedValue) {
  return [
    [SORT_MODES.NAME, "SFT.Sort.SceneNameAsc"],
    [SORT_MODES.NAME_DESC, "SFT.Sort.SceneNameDesc"],
    [SORT_MODES.FOLDER, "SFT.Sort.SceneFolderAsc"],
    [SORT_MODES.FOLDER_DESC, "SFT.Sort.SceneFolderDesc"],
    [SORT_MODES.DIRECTORY, "SFT.Sort.SceneDirectoryAsc"],
    [SORT_MODES.DIRECTORY_DESC, "SFT.Sort.SceneDirectoryDesc"]
  ].map(([value, key]) => ({ value, label: localize(key), selected: selectedValue === value }));
}

function prepareFolderSortOptions(selectedValue) {
  return [
    [FOLDER_SORT_MODES.NAME, "SFT.Sort.FolderNameAsc"],
    [FOLDER_SORT_MODES.NAME_DESC, "SFT.Sort.FolderNameDesc"],
    [FOLDER_SORT_MODES.DIRECTORY, "SFT.Sort.FolderDirectory"],
    [FOLDER_SORT_MODES.FAVORITES, "SFT.Sort.FolderFavorites"],
    [FOLDER_SORT_MODES.RECENTS, "SFT.Sort.FolderRecents"]
  ].map(([value, key]) => ({ value, label: localize(key), selected: selectedValue === value }));
}
