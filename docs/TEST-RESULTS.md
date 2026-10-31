# Test and Validation Results

Release: `runyth-scene-folder-tools` 1.1.1

Validation date: 2026-07-31

## Automated quality gates

| Gate | Result |
|---|---|
| Structured formatting and final-newline checks | Passed |
| JavaScript syntax, forbidden-marker, unsafe-pattern, prototype-patch, and line-length linting | Passed |
| TypeScript `checkJs` and local module-resolution validation | Passed |
| Automated tests | 83 passed, 0 failed, 16 suites |
| English/German key parity and used-key coverage | Passed |
| Release build path validation | Passed |
| Install/source archive content inspection | Passed |
| Clean extracted-install manifest and runtime-path inspection | Passed |

The automated test suite covers move transactions, root and bulk moves, partial failures, concurrency guards, data preservation, bounded undo, folder models, persistence, permissions, organizer state, non-rerendering selection updates, recursive Scene-folder filtering, 240-folder searchable filter modeling, bounded filter-panel layout, two-pane scroll restoration, Scene/folder sorting, settings-menu construction with a getter-only ApplicationV2 state, ApplicationV2 listener cleanup, debounced search, scoped auto-scroll, localization, and the public API.

## Runtime test status

A licensed Foundry VTT runtime is not installed in the artifact-build environment. The repository therefore includes the complete Foundry v13 manual test matrix in `docs/MANUAL-TESTS.md`, but those checkbox results are intentionally not represented as executed. Before public deployment, extract the install ZIP into a clean licensed Foundry v13 installation and complete the relevant matrix.
