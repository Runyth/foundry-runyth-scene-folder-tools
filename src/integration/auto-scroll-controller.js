// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
export class AutoScrollController {
  constructor({
    container,
    getZoneSize,
    getMaxSpeed,
    reducedMotion = () => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false,
    requestFrame = (callback) => globalThis.requestAnimationFrame(callback),
    cancelFrame = (id) => globalThis.cancelAnimationFrame(id)
  }) {
    this.container = container;
    this.getZoneSize = getZoneSize;
    this.getMaxSpeed = getMaxSpeed;
    this.reducedMotion = reducedMotion;
    this.requestFrame = requestFrame;
    this.cancelFrame = cancelFrame;
    this.controller = null;
    this.frameId = null;
    this.direction = 0;
    this.intensity = 0;
    this.lastTimestamp = null;
    this.dragging = false;
  }

  attach() {
    this.destroy();
    this.controller = new AbortController();
    const signal = this.controller.signal;
    this.container.addEventListener("dragstart", (event) => this.#onDragStart(event), { capture: true, signal });
    this.container.addEventListener("dragover", (event) => this.#onDragOver(event), { signal });
    this.container.addEventListener("dragleave", (event) => this.#onDragLeave(event), { signal });
    this.container.addEventListener("drop", () => this.stop(), { signal });
    this.container.addEventListener("dragend", () => this.stop(), { capture: true, signal });
  }

  destroy() {
    this.controller?.abort();
    this.controller = null;
    this.stop();
  }

  stop() {
    this.dragging = false;
    this.direction = 0;
    this.intensity = 0;
    this.lastTimestamp = null;
    if (this.frameId !== null) this.cancelFrame(this.frameId);
    this.frameId = null;
  }

  updatePointer(clientY) {
    const rect = this.container.getBoundingClientRect();
    const zone = Math.max(16, Number(this.getZoneSize()));
    const topDistance = clientY - rect.top;
    const bottomDistance = rect.bottom - clientY;

    if (topDistance >= 0 && topDistance < zone) {
      this.direction = -1;
      this.intensity = 1 - topDistance / zone;
    } else if (bottomDistance >= 0 && bottomDistance < zone) {
      this.direction = 1;
      this.intensity = 1 - bottomDistance / zone;
    } else {
      this.direction = 0;
      this.intensity = 0;
    }

    if (this.direction === 0) {
      if (this.frameId !== null) this.cancelFrame(this.frameId);
      this.frameId = null;
      this.lastTimestamp = null;
      return;
    }
    if (this.frameId === null) this.frameId = this.requestFrame((timestamp) => this.#tick(timestamp));
  }

  beginDrag(target) {
    const element = target instanceof Element ? target : null;
    const entry = element?.closest("[data-document-id], [data-entry-id], [data-folder-id], .directory-item");
    this.dragging = Boolean(entry && this.container.contains(entry));
    return this.dragging;
  }

  #onDragStart(event) {
    this.beginDrag(event.target);
  }

  #onDragOver(event) {
    if (!this.dragging) return;
    this.updatePointer(event.clientY);
  }

  #onDragLeave(event) {
    const related = event.relatedTarget;
    if (!(related instanceof Node) || !this.container.contains(related)) this.stop();
  }

  #tick(timestamp) {
    this.frameId = null;
    if (!this.dragging || this.direction === 0) return;
    const elapsed = this.lastTimestamp === null ? 16 : Math.min(50, timestamp - this.lastTimestamp);
    this.lastTimestamp = timestamp;
    const maxSpeed = Math.max(20, Number(this.getMaxSpeed()));
    const curve = this.reducedMotion() ? Math.max(0.35, this.intensity) : this.intensity * this.intensity;
    const delta = this.direction * maxSpeed * curve * (elapsed / 1000);
    this.container.scrollTop += delta;
    this.frameId = this.requestFrame((nextTimestamp) => this.#tick(nextTimestamp));
  }
}
