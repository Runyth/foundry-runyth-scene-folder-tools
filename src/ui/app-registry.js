// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
const applications = new Set();
let organizer = null;

export function registerApplication(app) {
  applications.add(app);
}

export function unregisterApplication(app) {
  applications.delete(app);
  if (organizer === app) organizer = null;
}

export function setOrganizer(app) {
  organizer = app;
  registerApplication(app);
}

export function getOrganizer() {
  return organizer;
}

export async function refreshApplications() {
  const pending = [];
  for (const app of applications) {
    if (!app.rendered) continue;
    pending.push(app.render({ force: true }).catch(() => undefined));
  }
  await Promise.all(pending);
}
