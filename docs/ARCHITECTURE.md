# Architecture

## Design goals

The module keeps reliable explicit workflows independent from the optional drag enhancement. It never patches Foundry internals and never clones, freezes, or recursively traverses Foundry Documents.

## Layers

| Layer | Files | Responsibility |
|---|---|---|
| Bootstrap | `src/main.js` | Registers lifecycle hooks, creates dependencies, exposes the API, and coalesces external document refreshes. |
| Foundry adapter | `src/core/foundry-adapter.js` | Small boundary around public Scene/Folder collections and document operations. |
| Permissions | `src/services/permission-service.js` | Requires a GM-level user and Foundry Scene update or Folder creation permission. |
| Folder model | `src/services/folder-model.js` | Builds cycle-safe plain-data trees, paths, recursive subtrees, hierarchy-aware ordering, search results, and depth validation. |
| Move transaction | `src/services/move-service.js` | Validation, locks, batch updates, post-update verification, fallback, structured results, and bounded undo. |
| Destination persistence | `src/services/destination-store.js` | Sanitizes per-user/per-world recent and favorite folder IDs without retaining Documents. |
| Folder creation | `src/services/folder-service.js` | Creates only `Scene` folders after permission, parent, and depth validation. |
| ApplicationV2 UI | `src/ui/*` | Organizer, folder picker, large-folder filter model, pane scroll-state restoration, selection state, focus/listener lifecycle, and position persistence. |
| Directory integration | `src/integration/directory-integration.js` | Context menu, directory header button, optional quick controls, and lifecycle cleanup. |
| Drag enhancement | `src/integration/auto-scroll-controller.js` | Scoped drag tracking and requestAnimationFrame scrolling. |
| Public surface | `src/api.js` | Stable structured API without exposing internal UI classes. |
| Settings/keybindings | `src/settings.js`, `src/keybindings.js` | Correct scopes, configuration, and unassigned actions. |

## Move transaction

1. Validate input shape and normalize root to `null`.
2. Resolve the destination folder and verify `type === "Scene"`.
3. Resolve each Scene, verify GM-level update permission, and reject busy Scenes.
4. Capture only `{sceneId, sceneName, fromFolderId, toFolderId}`.
5. Submit one supported batch update containing only `_id` and `folder`.
6. Re-read every Scene to verify that the requested destination was retained.
7. If the batch throws, retain already-applied results and retry only the remainder individually.
8. Produce one structured result with moved, skipped, and failed entries.
9. Store one in-memory undo record with a 30-minute TTL.

The update payload never contains Scene content, embedded documents, navigation state, ownership, sorting, or system data.

## Concurrency

A Set of active Scene IDs prevents overlapping local operations and duplicate confirmation submission. UI controls are disabled while an operation is active. Documents and destinations are resolved again at execution time, every update is verified afterward, and undo refuses to overwrite a Scene whose folder changed after the recorded move. Another client can still update the same Scene concurrently; the structured result reports when the requested destination was not retained.

## Persistence

Recent and favorite destinations use Foundry v13 `user` scope, which is specific to one user in one world and follows that user across devices. Deleted folder IDs are removed when state is read. Persistence failures are logged and surfaced without converting a successful Scene move into a failed move.

## Performance

- Folder trees use plain objects and iterative traversal.
- Document references are not retained after context preparation.
- Directory controls use one delegated click listener per rendered directory.
- Search rendering and external document refreshes are debounced.
- Auto-scroll performs no world scans on pointer movement.
- Application rerenders abort prior DOM listeners before installing replacements.
- The large-folder filter renders plain folder data once per organizer context and filters the bounded in-window option list without world scans or rerenders on each keystroke.

## v14 migration boundary

Foundry-specific behavior is concentrated in the adapter, ApplicationV2 subclasses, hook integration, settings, and keybindings. Service and model modules run against injected adapters and plain data, allowing v14 compatibility changes without redesigning transactions or UI state.

## Organizer selection and scroll stability

Scene selection is updated in place. Checkbox, pointer, and keyboard interactions change the `OrganizerState` selection set and synchronize only checkbox state, row selection styling, ARIA state, summaries, and the move-button disabled state. They do not rerender the ApplicationV2 window, preventing list scroll resets and unnecessary folder-tree reconstruction.

Operations that genuinely require a rerender capture the independent Scene and folder pane scroll offsets and restore them after rendering. This includes Scene sorting, destination-folder sorting, refreshes, moves, and folder creation. Search input remains debounced and also uses the scroll-preserving render path.

## Recursive filtering and ordering

The Scene-folder filter resolves a selected folder to a plain-data subtree ID set using an iterative traversal. Scene filtering then checks only normalized folder IDs and never retains Foundry document references.

Scene sorting supports name, folder path, and Foundry directory order in both directions. Destination-folder sorting preserves the hierarchy while ordering siblings by name, Foundry order, favorite status, or recent-use rank.

## Large Scene-folder filter

The recursive Scene-folder filter is not a native select. It uses a bounded in-flow panel with its own scroll container, a search field, path-aware token matching, and plain-data option rows. More than 200 folders can be represented without allowing a browser dropdown or the organizer window to exceed the available viewport. The control preserves `All folders` and `Root only`, exposes full paths for duplicate names, and closes back to a compact single-line value after selection.
