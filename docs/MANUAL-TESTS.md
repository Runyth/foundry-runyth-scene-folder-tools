# Manual Test Checklist

Record Foundry build, browser, system, world, user role, language, enabled modules, and result for every run.

## Environments

- [ ] Fresh Foundry v13 world.
- [ ] D&D 5e v13 world.
- [ ] World with hundreds/thousands of Scenes.
- [ ] At least 240 Scene folders and maximum supported nesting.
- [ ] Standard sidebar and popped-out Scenes Directory.
- [ ] Compact sidebar and custom theme.
- [ ] Browser zoom: 80%, 100%, 125%, 150%.
- [ ] Narrow and short organizer/picker windows.
- [ ] English and German.
- [ ] GM, Assistant GM with permitted operations, and player.
- [ ] With other modules adding Scene context-menu entries.
- [ ] With Tidy 5e Sheets enabled; verify no sheet injection.

## Reliable move workflows

- [ ] Context menu moves a Scene to an off-screen folder.
- [ ] Context menu moves a deeply nested Scene to root.
- [ ] Picker search reveals matching descendants and ancestors.
- [ ] Picker identifies current and selected folders.
- [ ] Picker cancel performs no update.
- [ ] Quick-move enabled/disabled; ordinary Scene activation remains intact.
- [ ] Organizer header button appears once after rerenders and reopening.
- [ ] Settings menu opens organizer without an ApplicationV2 `state` assignment error.
- [ ] API opens organizer and picker.

## Organizer

- [ ] Independent pane scrolling.
- [ ] Scene search and recursive Scene-folder filter.
- [ ] Open the Scene-folder filter with 200+ folders; verify the organizer and browser viewport do not overflow.
- [ ] Search the Scene-folder filter by partial name, multiple words, and ancestor path; verify full paths disambiguate duplicate names.
- [ ] Use keyboard Tab/Shift+Tab and Escape in the Scene-folder filter panel.
- [ ] All folders, Root only, parent-folder, and nested-folder filtering.
- [ ] All six Scene sorting modes.
- [ ] All five destination-folder ordering modes.
- [ ] Scroll far down the Scene pane, change every folder ordering mode, and verify both pane scroll offsets remain unchanged.
- [ ] Checkbox, plain click, Ctrl/Cmd-click, Shift-click range, Ctrl/Cmd+A, Enter/Space, Escape, Select All Visible, and Clear Selection.
- [ ] Selecting Scenes far down the list never resets either pane's scroll position.
- [ ] Newly created folders align consistently with existing folders at the same hierarchy depth.
- [ ] Hidden filtered selections remain clearly counted.
- [ ] Move 1, 20, and 100 Scenes.
- [ ] Root destination.
- [ ] Empty Scene/folder search states.
- [ ] External create/update/delete refreshes open applications.
- [ ] Double-click move cannot submit twice.

## Folder creation

- [ ] Blank name rejected.
- [ ] Root and nested parent selection.
- [ ] Duplicate names follow Foundry behavior.
- [ ] Maximum depth rejected or handled by Foundry.
- [ ] Created folder is selected and revealed.
- [ ] Assistant GM and player permissions.

## Recent/favorite destinations

- [ ] Root and folders appear in recents after moves.
- [ ] Configured limit is enforced.
- [ ] Favorite toggle updates picker and organizer.
- [ ] Deleted destinations disappear without errors.
- [ ] Persistence survives reload within the world.

## Undo

- [ ] Undo single and bulk moves.
- [ ] Undo to root and nested folders.
- [ ] Delete a previous folder before undo; incomplete result is reported.
- [ ] Delete a Scene before undo; incomplete result is reported.
- [ ] Undo expires after the bounded TTL and does not persist across reload.

## Drag auto-scroll

- [ ] Enabled and disabled.
- [ ] Top and bottom activation zones.
- [ ] Faster movement nearer the edge.
- [ ] Stops on leaving zone, drop, drag end, directory close, reload, and module disable.
- [ ] No duplicate timers after rerender.
- [ ] No effect in Actor, Item, Journal, roll, sheet, or dialog applications.
- [ ] Reduced-motion preference.
- [ ] Ordinary scrolling and drag-and-drop remain functional.

## Packaging

- [ ] Extract install ZIP into `Data/modules`.
- [ ] Exactly one `runyth-scene-folder-tools` root directory.
- [ ] Foundry loads `scripts/main.js`, stylesheet, templates, and language files without 404 or MIME errors.
- [ ] Version is consistent in manifest, source package, archives, and release notes.
