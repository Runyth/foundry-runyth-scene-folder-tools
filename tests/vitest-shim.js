// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import "./setup.js";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

const ASYMMETRIC = Symbol("asymmetric");

function isObject(value) {
  return value !== null && typeof value === "object";
}

function match(actual, expected, partial = false) {
  if (expected?.[ASYMMETRIC] === "any") {
    const Constructor = expected.value;
    if (Constructor === String) return typeof actual === "string";
    if (Constructor === Number) return typeof actual === "number";
    if (Constructor === Boolean) return typeof actual === "boolean";
    return actual instanceof Constructor;
  }
  if (expected?.[ASYMMETRIC] === "objectContaining") return match(actual, expected.value, true);
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) return false;
    return expected.every((value, index) => match(actual[index], value, false));
  }
  if (isObject(expected)) {
    if (!isObject(actual)) return false;
    const expectedKeys = Object.keys(expected);
    if (!partial && Object.keys(actual).length !== expectedKeys.length) return false;
    return expectedKeys.every((key) => key in actual && match(actual[key], expected[key], false));
  }
  return Object.is(actual, expected);
}

function buildMatchers(actual, invert = false) {
  const check = (condition, message) => {
    if (invert ? condition : !condition) throw new assert.AssertionError({ message });
  };
  return {
    get not() {
      return buildMatchers(actual, !invert);
    },
    get rejects() {
      return {
        async toMatchObject(expected) {
          let rejection;
          try {
            await actual;
          } catch (error) {
            rejection = error;
          }
          check(Boolean(rejection) && match(rejection, expected, true), "Expected promise rejection to match object");
        }
      };
    },
    toBe(expected) {
      check(Object.is(actual, expected), `Expected ${String(actual)} to be ${String(expected)}`);
    },
    toEqual(expected) {
      check(match(actual, expected, false), `Expected values to be deeply equal\nActual: ${JSON.stringify(actual)}\nExpected: ${JSON.stringify(expected)}`);
    },
    toMatchObject(expected) {
      check(match(actual, expected, true), "Expected object to contain matching fields");
    },
    toHaveLength(expected) {
      check(actual?.length === expected, `Expected length ${expected}, got ${actual?.length}`);
    },
    toBeNull() {
      check(actual === null, `Expected null, got ${String(actual)}`);
    },
    toBeGreaterThan(expected) {
      check(actual > expected, `Expected ${actual} > ${expected}`);
    },
    toBeLessThan(expected) {
      check(actual < expected, `Expected ${actual} < ${expected}`);
    },
    toHaveBeenCalledTimes(expected) {
      check(actual?.mock?.calls?.length === expected, `Expected ${expected} calls, got ${actual?.mock?.calls?.length}`);
    },
    toHaveBeenCalled() {
      check((actual?.mock?.calls?.length ?? 0) > 0, "Expected function to have been called");
    }
  };
}

export function expect(actual) {
  return buildMatchers(actual);
}

expect.objectContaining = (value) => ({ [ASYMMETRIC]: "objectContaining", value });
expect.any = (value) => ({ [ASYMMETRIC]: "any", value });

export const vi = {
  fn(implementation = () => undefined) {
    const fn = (...args) => {
      fn.mock.calls.push(args);
      return implementation(...args);
    };
    fn.mock = { calls: [] };
    return fn;
  }
};

export { beforeEach, describe, it };
