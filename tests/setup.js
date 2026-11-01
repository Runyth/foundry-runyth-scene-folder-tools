// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
class FakeElement extends EventTarget {
  constructor(tagName = "div") {
    super();
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.dataset = {};
    this.className = "";
    this.scrollTop = 0;
    this.scrollHeight = 1000;
    this.clientHeight = 400;
    this.value = "";
  }

  append(child) {
    child.parentNode = this;
    this.children.push(child);
  }

  contains(node) {
    if (node === this) return true;
    return this.children.some((child) => child.contains(node));
  }

  closest(selector) {
    if (selector.includes(".directory-item") && this.className.split(/\s+/).includes("directory-item")) return this;
    if (selector.includes("[data-entry-id]") && this.dataset.entryId) return this;
    if (selector.includes("[data-document-id]") && this.dataset.documentId) return this;
    return this.parentNode?.closest?.(selector) ?? null;
  }

  querySelector(selector) {
    if (selector === ".directory-item") {
      return this.children.find((child) => child.className.split(/\s+/).includes("directory-item")) ?? null;
    }
    return null;
  }

  querySelectorAll(selector) {
    const one = this.querySelector(selector);
    return one ? [one] : [];
  }

  click() {
    this.dispatchEvent(new Event("click", { bubbles: true }));
  }

  focus() {}
  setSelectionRange() {}

  set innerHTML(value) {
    this.children = [];
    if (String(value).includes("directory-item")) {
      const child = new FakeElement("div");
      child.className = "directory-item";
      child.dataset.entryId = "s1";
      this.append(child);
    }
  }

  get innerHTML() {
    return "";
  }

  getBoundingClientRect() {
    return { top: 0, bottom: 400, left: 0, right: 200, width: 200, height: 400 };
  }
}

class ApplicationV2 {
  constructor(options = {}) {
    this.options = options;
    this.position = options.position ?? {};
    this.rendered = false;
  }

  get state() {
    return this.rendered ? 2 : 0;
  }

  async render() {
    this.rendered = true;
    return this;
  }

  async close() {
    this.rendered = false;
    return this;
  }

  bringToFront() {}
  _onPosition() {}
  async _prepareContext() {
    return {};
  }
  async _onRender() {}
  async _onClose() {}
}

globalThis.Element = FakeElement;
globalThis.HTMLElement = FakeElement;
globalThis.Node = FakeElement;
globalThis.HTMLInputElement = FakeElement;
globalThis.HTMLSelectElement = FakeElement;
globalThis.document = {
  createElement: (tagName) => new FakeElement(tagName)
};
globalThis.getComputedStyle = () => ({ overflowY: "auto" });

globalThis.foundry = {
  applications: {
    api: {
      ApplicationV2,
      HandlebarsApplicationMixin: (Base) => class extends Base {},
      DialogV2: {
        confirm: async () => true
      }
    }
  },
  utils: {
    escapeHTML: (value) => String(value)
  }
};

globalThis.Hooks = {
  on: () => 1,
  once: () => 1,
  off: () => undefined,
  callAll: () => undefined
};

globalThis.CONST = {
  FOLDER_MAX_DEPTH: 3,
  KEYBINDING_PRECEDENCE: { NORMAL: 0 }
};
