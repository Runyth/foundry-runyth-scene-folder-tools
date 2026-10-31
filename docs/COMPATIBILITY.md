# Compatibility and Interoperability

## Foundry v13

The module uses public v13 APIs: ApplicationV2/HandlebarsApplicationMixin, DialogV2 confirmation, generic document context options, render/close hooks, document permissions, batch document updates, client/user/world settings, keybindings, and Folder creation.

No private method is invoked. No Foundry prototype or browser drag API is patched.

## Game systems

The module only reads Scene identity/name/folder and updates the Scene `folder` field. It is independent of D&D 5e data and does not open or inject into Actor, Item, token, roll, or sheet applications.

## Directory modifications

- Context options are appended and marked to prevent duplicate insertion.
- Header and inline buttons use module-specific classes.
- Click handling is delegated from the rendered Scene Directory only.
- Every rerender aborts old listeners and destroys the prior auto-scroll controller.
- Pop-out and primary sidebar Scene directories are treated independently.

## Themes and sizing

The UI relies on inherited Foundry colors, `color-mix`, flexible layout, semantic controls, responsive single-column fallback, visible focus, and non-color selection indicators. The Scene-folder filter is an in-window bounded panel with internal scrolling rather than a browser-native menu whose size and positioning vary between hosts.

## libWrapper

Not used and not required.

## Known platform limitation

Native HTML drag event delivery varies by browser and host conditions. Auto-scroll is optional. Context-menu, folder-picker, and organizer workflows do not depend on it and remain the authoritative reliable paths.

## Runtime validation

Automated checks run without proprietary Foundry runtime files. Complete in-Foundry verification is specified in `docs/MANUAL-TESTS.md` and must be performed in a licensed v13 installation before deployment.
