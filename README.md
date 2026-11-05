# Scene Folder Tools

Scene Folder Tools is a game-system-independent Foundry VTT v13 module for moving existing Scenes into Scene folders without relying on long-distance drag-and-drop.

## Features

- **Move to Folder…** on every movable Scene's directory context menu.
- ApplicationV2 **Scene Organizer** with independent Scene and folder panes.
- Single and bulk moves, root-level moves, recursive Scene-folder filtering, advanced Scene/folder sorting, multi-selection, favorites, recent destinations, and folder creation.
- A compact optional quick-move button on Scene entries.
- Optional edge-triggered auto-scrolling scoped to the Scenes Directory.
- One-operation undo for single and bulk moves.
- GM/Assistant-GM role gating plus Foundry document permission checks.
- English and German localization.
- Public API at `game.modules.get("runyth-scene-folder-tools")?.api`.

## Compatibility

- Foundry Virtual Tabletop v13 stable.
- Uses the v13 ApplicationV2 and public document APIs.
- Game-system-independent; structurally compatible with D&D 5e because it does not read or modify system data or sheets.
- No required dependencies and no global monkey patches.

Official references used by the implementation:

- ApplicationV2: https://foundryvtt.com/api/v13/classes/foundry.applications.api.ApplicationV2.html
- DialogV2: https://foundryvtt.com/api/v13/classes/foundry.applications.api.DialogV2.html
- Document batch updates: https://foundryvtt.com/api/v13/classes/foundry.abstract.Document.html
- Hook events: https://foundryvtt.com/api/v13/modules/hookEvents.html
- Folder documents: https://foundryvtt.com/api/v13/classes/foundry.documents.Folder.html
- User roles: https://foundryvtt.com/api/v13/classes/foundry.documents.User.html
- Settings: https://foundryvtt.com/article/settings/
- Module development: https://foundryvtt.com/article/module-development/
- Localization: https://foundryvtt.com/article/localization/

## Installation

1. Stop Foundry VTT.
2. Extract `runyth-scene-folder-tools-v1.2.0.zip` into `FoundryVTT/Data/modules/`.
3. Confirm the resulting path is `FoundryVTT/Data/modules/runyth-scene-folder-tools/module.json`.
4. Start Foundry VTT, open the world, and enable **Scene Folder Tools** under **Manage Modules**.

## Usage

- Right-click a Scene and choose **Move to Folder…**.
- Click **Organizer** in the Scenes Directory header for bulk organization.
- Hover or focus a Scene entry and use the compact folder button, when enabled.
- Open **Configure Settings → Module Settings → Scene Organizer** as Gamemaster.
- Configure optional keybindings under Foundry's keybinding settings; none are assigned by default.

The organizer keeps filtered-out selections selected. Use **Clear Selection** when a filter change should intentionally reset the selection.

Selection shortcuts:

- Click a Scene row to select only that Scene.
- Ctrl/Cmd-click to toggle a Scene without clearing the current selection.
- Shift-click to select the visible range from the previous anchor Scene.
- Ctrl/Cmd+A selects all visible Scenes while focus is in the Scene list.
- Escape clears the selection.

The Scene-folder filter includes a selected folder recursively, including every nested subfolder. **Root only** shows unfiled Scenes. The filter opens as a bounded searchable panel rather than a native long dropdown, so hundreds of folder names and paths remain usable without overflowing the organizer or browser viewport.

## Development

Requirements: Node.js 22–26 and the `zip`/`unzip` command-line tools.

```text
npm ci
npm run quality
npm run build
npm run release:verify
```

The installable archive is produced from `dist/runyth-scene-folder-tools`. The source archive excludes dependencies, generated output, caches, and release artifacts. Release metadata and filenames are derived from `module.json` and `package.json` and validated for consistency.

## Validation status

Automated static, unit, localization, build, archive, checksum, and extracted-install checks are documented in [Test results](docs/TEST-RESULTS.md). A licensed Foundry runtime is not present in the build environment, so the complete [manual Foundry v13 checklist](docs/MANUAL-TESTS.md) is provided for runtime verification rather than falsely marked as executed.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Public API](docs/API.md)
- [Test results](docs/TEST-RESULTS.md)
- [Manual test checklist](docs/MANUAL-TESTS.md)
- [Compatibility and interoperability](docs/COMPATIBILITY.md)
- [Requirements traceability](docs/TRACEABILITY.md)
- [Contributing](CONTRIBUTING.md)
- [Release process](docs/RELEASING.md)

## Licence
Copyright © 2026  [Daniel Braniewski](https://brani.dev/)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
