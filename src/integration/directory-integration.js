// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { MODULE_ID, SETTINGS } from "../constants.js";
import { AutoScrollController } from "./auto-scroll-controller.js";
import { openFolderPicker, openOrganizer } from "../ui/open-apps.js";
import { localize } from "../ui/ui-helpers.js";

function isSceneDirectory(app) {
  return app?.documentName === "Scene" || app?.collection?.documentName === "Scene" || app?.constructor?.name === "SceneDirectory";
}

function elementFrom(app, html) {
  if (app?.element instanceof HTMLElement) return app.element;
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  return null;
}

export function extractSceneId(target) {
  const element = target instanceof HTMLElement ? target : target?.[0] instanceof HTMLElement ? target[0] : null;
  if (!element) return null;
  const entry = /** @type {HTMLElement} */ (
    element.closest("[data-document-id], [data-entry-id], [data-scene-id], .directory-item") ?? element
  );
  return entry.dataset.documentId ?? entry.dataset.entryId ?? entry.dataset.sceneId ?? entry.dataset.entityId ?? null;
}

export class DirectoryIntegration {
  constructor({ adapter, permissions, logger }) {
    this.adapter = adapter;
    this.permissions = permissions;
    this.logger = logger;
    this.hookIds = [];
    this.instances = new WeakMap();
    this.activeApps = new Set();
  }

  install() {
    this.hookIds.push(["getDocumentContextOptions", globalThis.Hooks.on("getDocumentContextOptions", (app, options) => {
      this.#addContextOption(app, options);
    })]);
    this.hookIds.push(["renderApplicationV2", globalThis.Hooks.on("renderApplicationV2", (app, html) => {
      this.#onRender(app, html);
    })]);
    this.hookIds.push(["renderSceneDirectory", globalThis.Hooks.on("renderSceneDirectory", (app, html) => {
      this.#onRender(app, html);
    })]);
    this.hookIds.push(["closeApplicationV2", globalThis.Hooks.on("closeApplicationV2", (app) => this.#cleanup(app))]);
  }

  uninstall() {
    for (const app of [...this.activeApps]) this.#cleanup(app);
    for (const [hook, id] of this.hookIds) globalThis.Hooks.off(hook, id);
    this.hookIds = [];
  }

  #addContextOption(app, options) {
    if (!isSceneDirectory(app) || !Array.isArray(options)) return;
    if (options.some((option) => option.sceneFolderToolsAction)) return;
    options.push({
      sceneFolderToolsAction: true,
      name: localize("SFT.Context.MoveToFolder"),
      icon: '<i class="fa-solid fa-folder-tree" aria-hidden="true"></i>',
      condition: (target) => {
        const scene = this.adapter.getScene(extractSceneId(target));
        return this.permissions.canMoveScene(scene);
      },
      callback: (target) => {
        const sceneId = extractSceneId(target);
        const scene = this.adapter.getScene(sceneId);
        if (!scene || !this.permissions.canMoveScene(scene)) return;
        const folderId = typeof scene.folder === "string" ? scene.folder : scene.folder?.id ?? null;
        openFolderPicker({ sceneIds: [sceneId], move: true, initialFolderId: folderId }).catch((error) => {
          this.logger.error("Unable to open the folder picker", error);
        });
      }
    });
  }

  #onRender(app, html) {
    if (!isSceneDirectory(app)) return;
    const root = elementFrom(app, html);
    if (!root) return;
    this.#cleanup(app);
    if (!this.permissions.canUseOrganizer()) return;

    const controller = new AbortController();
    const state = { controller, autoScroll: null };
    this.instances.set(app, state);
    this.activeApps.add(app);
    this.#injectOrganizerButton(root);
    if (globalThis.game.settings.get(MODULE_ID, SETTINGS.QUICK_MOVE)) this.#injectQuickButtons(root);

    root.addEventListener("click", (event) => this.#onClick(event, root), { signal: controller.signal });
    if (globalThis.game.settings.get(MODULE_ID, SETTINGS.AUTO_SCROLL)) {
      const scrollContainer = this.#findScrollContainer(root);
      if (scrollContainer) {
        state.autoScroll = new AutoScrollController({
          container: scrollContainer,
          getZoneSize: () => globalThis.game.settings.get(MODULE_ID, SETTINGS.AUTO_SCROLL_ZONE),
          getMaxSpeed: () => globalThis.game.settings.get(MODULE_ID, SETTINGS.AUTO_SCROLL_SPEED)
        });
        state.autoScroll.attach();
      }
    }
  }

  #cleanup(app) {
    const state = this.instances.get(app);
    if (!state) return;
    state.controller.abort();
    state.autoScroll?.destroy();
    this.instances.delete(app);
    this.activeApps.delete(app);
  }

  #injectOrganizerButton(root) {
    if (root.querySelector(".sft-open-organizer")) return;
    const host = root.querySelector(".directory-header .header-actions, .directory-header, header.directory-header");
    if (!host) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sft-open-organizer";
    button.dataset.action = "sft-open-organizer";
    button.title = localize("SFT.Directory.OpenOrganizerHint");
    button.setAttribute("aria-label", localize("SFT.Directory.OpenOrganizer"));
    button.innerHTML = `<i class="fa-solid fa-folder-tree" aria-hidden="true"></i><span>${localize("SFT.Directory.OrganizerButton")}</span>`;
    host.append(button);
  }

  #injectQuickButtons(root) {
    const entries = root.querySelectorAll(
      [
        'li.directory-item.document[data-entry-id]',
        'li.directory-item.document[data-document-id]',
        '.directory-item[data-entry-id]:not(.folder)',
        '.directory-item[data-document-id]:not(.folder)'
      ].join(', ')
    );
    for (const entry of entries) {
      const sceneId = extractSceneId(entry);
      const scene = this.adapter.getScene(sceneId);
      if (!scene || !this.permissions.canMoveScene(scene) || entry.querySelector(".sft-quick-move")) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "sft-quick-move";
      button.dataset.action = "sft-quick-move";
      button.dataset.sceneId = sceneId;
      button.title = localize("SFT.Directory.QuickMoveHint");
      button.setAttribute("aria-label", localize("SFT.Directory.QuickMoveFor", { scene: scene.name }));
      button.innerHTML = '<i class="fa-solid fa-folder-arrow-down" aria-hidden="true"></i>';
      entry.append(button);
    }
  }

  async #onClick(event, root) {
    const button = event.target instanceof Element ? event.target.closest("button[data-action]") : null;
    if (!button || !root.contains(button)) return;
    if (button.dataset.action === "sft-open-organizer") {
      event.preventDefault();
      event.stopPropagation();
      await openOrganizer();
      return;
    }
    if (button.dataset.action !== "sft-quick-move") return;
    event.preventDefault();
    event.stopPropagation();
    if (button.disabled) return;
    const scene = this.adapter.getScene(button.dataset.sceneId);
    if (!scene || !this.permissions.canMoveScene(scene)) return;
    const folderId = typeof scene.folder === "string" ? scene.folder : scene.folder?.id ?? null;
    button.disabled = true;
    try {
      await openFolderPicker({ sceneIds: [scene.id], move: true, initialFolderId: folderId });
    } finally {
      if (button.isConnected) button.disabled = false;
    }
  }

  #findScrollContainer(root) {
    const candidates = [
      root.querySelector(".directory-list"),
      root.querySelector(".directory-content"),
      root.querySelector('[data-application-part="directory"]'),
      root
    ].filter(Boolean);
    return candidates.find((element) => {
      const style = getComputedStyle(element);
      return ["auto", "scroll"].includes(style.overflowY) || element.scrollHeight > element.clientHeight;
    }) ?? candidates[0] ?? null;
  }
}
