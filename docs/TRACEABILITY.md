# Requirements Traceability

| Requirement | Implementation | Automated/manual verification |
|---|---|---|
| Context-menu move | `DirectoryIntegration`, `FolderPicker` | Integration review; manual context test |
| Searchable hierarchy/root/current folder | `folder-model.js`, picker template | Folder-model tests; manual picker test |
| Organizer ApplicationV2 | `SceneOrganizer` | UI-state/listener/search tests; manual matrix |
| Recursive Scene-folder filter | `folderSubtreeIds`, `prepareSceneRows`, bounded searchable filter panel | Recursive, Root-only, All-folders, 240-folder, path-search, and bounded-panel tests |
| Scene and folder ordering | Scene comparators, hierarchy-aware folder comparators, client defaults | Ascending/descending, directory, favorites, and recency tests |
| Scroll-stable selection and sorting | In-place selection synchronization plus reusable pane scroll snapshots | Selection, folder-sort render-path, and two-pane capture/restore regressions |
| Bulk selection and moves | `OrganizerState`, in-place selection synchronization, `MoveService` | State, no-rerender regression, and move-service tests |
| Scoped drag auto-scroll | `AutoScrollController` | Eight auto-scroll tests; manual browsers |
| Quick move | Delegated directory button | Manual enabled/disabled test |
| Recent/favorites | `DestinationStore`, v13 user setting | Persistence/deleted-folder/write-failure tests |
| Folder creation | `FolderService` | Folder-service/model tests; manual core duplicate behavior |
| Limited undo | `MoveService.undoLastMove` | Single, bulk, deleted-folder, and concurrent-change tests |
| GM/Assistant permissions | `PermissionService` | Player rejection, Assistant support, and document-permission tests |
| Settings/keybindings | `settings.js`, `keybindings.js` | Static validation and manual configuration |
| Window position/accessibility | ApplicationV2 classes and responsive CSS | Manual sizing, keyboard, focus, zoom, and themes |
| Directory isolation | `isSceneDirectory`, scoped listeners | Auto-scroll/listener tests; manual interference matrix |
| Public API/hooks | `api.js`, adapter hooks | API, validation, permission, persistence, and hook tests |
| Notifications/diagnostics | `Notifier`, `Logger` | Structured result tests; manual notification review |
| Data safety | `_id` + `folder` updates only | Unrelated-field preservation test |
| Concurrency | per-Scene locks, post-update verification, guarded undo | Duplicate-submit, retained-update, and changed-since-move tests |
| Performance | iterative tree/subtree filtering, bounded DOM folder search, delegated in-place selection, debounced search/refresh, RAF | 240-folder filter test, unit tests, and large-world manual test |
| Localization | `lang/en.json`, `lang/de.json` | Key parity and used-key coverage tests |
| Packaging | dynamic build/package/inspection scripts | Manifest/path, one-root, source-content, checksum, and extraction inspection |
