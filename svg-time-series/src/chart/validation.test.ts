import { describe, it, expect } from "vitest";
import {
  assertPositiveInteger,
  assertFiniteNumber,
  assertFiniteOrNaN,
} from "./validation.ts";

describe("assertPositiveInteger", () => {
  it("throws for non-positive or fractional values", () => {
    expect(() => {
      assertPositiveInteger(0, "value");
    }).toThrow(/positive integer/);
    expect(() => {
      assertPositiveInteger(-1, "value");
    }).toThrow(/positive integer/);
    expect(() => {
      assertPositiveInteger(1.5, "value");
    }).toThrow(/positive integer/);
  });

  it("succeeds for positive integers", () => {
    expect(() => {
      assertPositiveInteger(1, "value");
    }).not.toThrow();
    expect(() => {
      assertPositiveInteger(42, "value");
    }).not.toThrow();
  });
});

describe("assertFiniteNumber", () => {
  it("throws for NaN or Infinity", () => {
    expect(() => {
      assertFiniteNumber(NaN, "value");
    }).toThrow(/finite number/);
    expect(() => {
      assertFiniteNumber(Infinity, "value");
    }).toThrow(/finite number/);
    expect(() => {
      assertFiniteNumber(-Infinity, "value");
    }).toThrow(/finite number/);
  });

  it("succeeds for finite numbers", () => {
    expect(() => {
      assertFiniteNumber(123, "value");
    }).not.toThrow();
  });
});

describe("assertFiniteOrNaN", () => {
  it("throws for non-number or infinite values", () => {
    expect(() => {
      assertFiniteOrNaN(undefined as unknown as number, "value");
    }).toThrow(/finite number or NaN/);
    expect(() => {
      assertFiniteOrNaN(Infinity, "value");
    }).toThrow(/finite number or NaN/);
    expect(() => {
      assertFiniteOrNaN("foo" as unknown as number, "value");
    }).toThrow(/finite number or NaN/);
  });

  it("succeeds for finite numbers and NaN", () => {
    expect(() => {
      assertFiniteOrNaN(5, "value");
    }).not.toThrow();
    expect(() => {
      assertFiniteOrNaN(NaN, "value");
    }).not.toThrow();
  });
});
