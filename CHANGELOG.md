# Changelog

## 1.1.4 — 2026-11-01

- Attributed the source licence headers to the same holder the README Licence chapter names so every module surface carries the same copyright holder.

- All notable changes are documented here. The project follows Semantic Versioning.

## 1.1.3 — 2026-11-01

- Moved the repository tooling from `scripts/` into `tools/` so packaging and validation live at the standard Runyth module-structure path; `scripts/main.js` remains the only runtime script.
- Preserved all behaviour, storage, and migration contracts; this patch changes repository layout only and requires no content migration.

## 1.1.2 — 2026-10-31

- Licensed the program under AGPL-3.0-or-later.
- Aligned the unpublished module id with `runyth-scene-folder-tools`.
- Published install, source, and documentation archives as `-mod`, `-src`, and `-doc`.

## 1.1.1 — 2026-07-31

- Replaced the native Scene-folder filter select with a bounded, searchable folder panel designed for worlds with 200 or more Scene folders.
- Added full folder paths, internal scrolling, token-based name/path search, keyboard focus, and a clear no-results state to the Scene-folder filter.

- Preserved the Scene pane and folder pane scroll offsets when changing the destination-folder sort mode.
- Added dedicated scroll-state regression coverage so unrelated organizer rerenders cannot silently reset either pane.

## 1.1.0 — 2026-07-31

- Added recursive Scene-folder filtering in the organizer, including All folders and Root-only views.
- Added six Scene sorting modes: name ascending/descending, current folder ascending/descending, and Foundry directory order forward/reversed.
- Added five destination-folder ordering modes: hierarchy name ascending/descending, Foundry folder order, favorites first, and recently used first.
- Added conventional row selection: plain click, Ctrl/Cmd-click, Shift-click range selection, Ctrl/Cmd+A, Enter/Space, and Escape.
- Added a client setting for the default destination-folder ordering.

- Renamed the visible root destination from “Root (No Folder)” to “Root”.
- Normalized destination-folder labels to consistent left alignment while preserving hierarchy indentation.
- Expanded the organizer window default size to accommodate the new controls.

- Fixed Scene-list scrolling jumping to the top after each checkbox or row selection by updating selection state in place without rerendering ApplicationV2.
- Preserved both organizer pane scroll positions across refreshes and other necessary rerenders.

## 1.0.1 — 2026-07-31

- Fixed the Scene Organizer failing to open from Configure Settings because its internal UI model attempted to overwrite Foundry v13 ApplicationV2's read-only `state` property.
- Added a runtime-faithful regression test that instantiates the organizer through the registered settings-menu type while `ApplicationV2.state` is getter-only.

## 1.0.0 — 2026-07-29

- Scene context-menu folder picker.
- ApplicationV2 Scene Organizer with independent panes, bulk selection, search, sorting, root moves, and folder creation.
- Optional inline quick-move controls and scoped drag auto-scroll.
- Recent and favorite destinations with per-user, per-world persistence.
- Limited single-operation undo.
- Permission-aware GM and Assistant GM workflows.
- Configurable client/world settings and unassigned keybindings.
- Public API version 1.0.0 and module hooks.
- English and German localization.
- Automated service, model, permission, state, auto-scroll, API, localization, build, extraction, and packaging validation.
