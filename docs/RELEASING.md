# Release Process

1. Update `package.json`, `module.json`, `CHANGELOG.md`, and API version when required.
2. Run `npm ci` from a clean checkout.
3. Run `npm run quality`.
4. Run `npm run release:verify`.
5. Inspect `unzip -Z1 artifacts/runyth-scene-folder-tools-vX.Y.Z.zip`.
6. Extract the install ZIP into a clean Foundry v13 `Data/modules` directory and run the packaging/manual smoke tests.
7. Verify the generated `artifacts/SHA256SUMS.txt`.
8. Publish both the installable and source archives from the same commit.
9. Confirm release metadata uses the same version as `module.json`.

Every release, patch, compatibility update, and bug fix must provide both archives for the same source state unless explicitly waived.
