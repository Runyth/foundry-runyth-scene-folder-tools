// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
export function captureScrollState(root) {
  if (!root) return null;
  return Object.fromEntries(
    Array.from(root.querySelectorAll("[data-scroll-key]")).map((region) => [
      region.dataset.scrollKey,
      { top: region.scrollTop, left: region.scrollLeft }
    ])
  );
}

export function restoreScrollState(root, state) {
  if (!root || !state) return;
  for (const region of root.querySelectorAll("[data-scroll-key]")) {
    const position = state[region.dataset.scrollKey];
    if (!position) continue;
    region.scrollTop = position.top;
    region.scrollLeft = position.left;
  }
}
