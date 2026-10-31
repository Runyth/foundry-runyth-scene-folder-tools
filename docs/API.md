# Public API

Access:

```javascript
game.modules.get("runyth-scene-folder-tools")?.api
```

`apiVersion` is `"1.0.0"`.

All organizer and folder-browsing methods require a Foundry user for whom `user.isGM` is true, which includes Gamemaster and Assistant Gamemaster roles, plus the applicable Scene or Folder permission. Ordinary players cannot use the organizer API even if they own another document.

## Error and result contract

Malformed argument shapes and unauthorized organizer/folder-browsing calls throw `SceneFolderToolsError`. Validly shaped move and create operations return structured results and do not throw for ordinary missing-document, permission, concurrency, or update failures.

Move result shape:

```javascript
{
  ok: true,
  operation: "move",
  requested: 2,
  folderId: "folder-id-or-null",
  moved: [{ sceneId, sceneName, fromFolderId, toFolderId }],
  skipped: [{ sceneId, sceneName, code }],
  failures: [{ sceneId, sceneName, code, error? }],
  undoAvailable: true
}
```

## Methods

### `openOrganizer(options?)`

Opens or focuses the singleton Scene Organizer ApplicationV2 window. Returns the application instance.

### `openFolderPicker(options?)`

Options:

- `sceneIds?: string[]`
- `move?: boolean` — when true, at least one Scene ID is required and confirmation moves those Scenes.
- `initialFolderId?: string | null`
- `allowCreate?: boolean`

Returns:

```javascript
{ confirmed, folderId, moveResult }
```

With `move: false`, complementary modules can obtain a selected folder without copying the UI.

### `moveScene(sceneId, folderId)`

Moves one Scene. `folderId` may be `null` or `"__root__"` for root.

### `moveScenes(sceneIds, folderId)`

Moves unique Scene IDs in one transaction.

### `moveScenesToRoot(sceneIds)`

Moves Scenes to root.

### `createSceneFolder(data)`

`data` contains `{ name, parentFolderId? }`. Creates only a `Scene` folder.

### `getSceneFolders(options?)`

Returns plain folder data with paths. Options: `{ search?: string, includeRoot?: boolean }`.

### `getRecentFolders()`

Returns sanitized destination IDs stored for the current user in the current world. Root is represented by `"__root__"`.

### `setFavoriteFolder(folderId, favorite?)`

Sets or clears a favorite and returns `{ ok, code, favorites }`. A settings-write failure returns `ok: false` and `code: "DESTINATION_SAVE_FAILED"`.

### `undoLastMove()`

Attempts the bounded, client-local undo record and returns a move result with `operation: "undo"`.

## Hooks

The module emits:

- `runyth-scene-folder-tools.moveSuccess`
- `runyth-scene-folder-tools.moveFailure`
- `runyth-scene-folder-tools.folderCreated`

Move hooks receive the structured move result. The folder hook receives plain folder identity data.
