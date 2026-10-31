// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { MODULE_ID, SETTINGS, VERSION } from "./constants.js";
import { createApi } from "./api.js";
import { FoundryAdapter } from "./core/foundry-adapter.js";
import { Logger } from "./core/logger.js";
import { Notifier } from "./core/notifier.js";
import { setRuntime } from "./core/runtime.js";
import { DirectoryIntegration } from "./integration/directory-integration.js";
import { registerKeybindings } from "./keybindings.js";
import { registerSettings } from "./settings.js";
import { DestinationStore } from "./services/destination-store.js";
import { FolderService } from "./services/folder-service.js";
import { MoveService } from "./services/move-service.js";
import { PermissionService } from "./services/permission-service.js";
import { refreshApplications } from "./ui/app-registry.js";

let directoryIntegration;
let externalRefreshTimer = null;
const documentHooks = [];

Hooks.once("init", () => {
  registerSettings();
  registerKeybindings();
});

Hooks.once("ready", async () => {
  const adapter = new FoundryAdapter();
  const logger = new Logger();
  const notifier = new Notifier();
  const permissions = new PermissionService(adapter);
  const destinationStore = new DestinationStore({
    read: () => game.settings.get(MODULE_ID, SETTINGS.DESTINATIONS),
    write: (value) => game.settings.set(MODULE_ID, SETTINGS.DESTINATIONS, value),
    getLimit: () => game.settings.get(MODULE_ID, SETTINGS.RECENT_LIMIT),
    onWriteError: (error) => logger.warn("Could not persist recent or favorite Scene folders.", error)
  });
  const folderService = new FolderService({ adapter, permissions, destinationStore, logger });
  const moveService = new MoveService({ adapter, permissions, destinationStore, logger });
  const runtime = { adapter, logger, notifier, permissions, destinationStore, folderService, moveService };
  setRuntime(runtime);

  const module = game.modules.get(MODULE_ID);
  if (module) module.api = createApi();

  directoryIntegration = new DirectoryIntegration({ adapter, permissions, logger });
  directoryIntegration.install();

  const refresh = (document) => {
    if (!["Scene", "Folder"].includes(document?.documentName)) return;
    clearTimeout(externalRefreshTimer);
    externalRefreshTimer = setTimeout(() => {
      externalRefreshTimer = null;
      refreshApplications().catch(() => undefined);
    }, 100);
  };
  documentHooks.push(["createDocument", Hooks.on("createDocument", refresh)]);
  documentHooks.push(["updateDocument", Hooks.on("updateDocument", refresh)]);
  documentHooks.push(["deleteDocument", Hooks.on("deleteDocument", refresh)]);
  globalThis.addEventListener?.("beforeunload", cleanup, { once: true });

  logger.info(`Ready v${VERSION}`);
});

function cleanup() {
  clearTimeout(externalRefreshTimer);
  externalRefreshTimer = null;
  directoryIntegration?.uninstall();
  directoryIntegration = undefined;
  for (const [hook, id] of documentHooks.splice(0)) Hooks.off(hook, id);
}
