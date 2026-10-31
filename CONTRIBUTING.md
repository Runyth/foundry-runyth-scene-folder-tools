# Contributing

## Prerequisites

- Node.js 22–26.
- `zip` and `unzip` on `PATH`.
- A legal Foundry VTT v13 installation for manual testing.

## Workflow

1. Create a focused branch.
2. Make cohesive changes in the appropriate layer.
3. Add or update tests and localization keys.
4. Run `npm run quality`.
5. Run `npm run package && npm run inspect:archives`.
6. Complete the relevant manual test matrix.

## Rules

- Use public Foundry APIs when available.
- Do not patch core prototypes or globally intercept drag behavior.
- Do not retain, deep-clone, or deep-freeze Foundry Documents.
- Keep visible strings localized in English and German.
- Keep install archives free of tests, build tooling, dependencies, caches, and source-only docs.
- Required behavior must not be represented only by TODOs or placeholders.
