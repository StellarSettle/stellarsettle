// @ts-nocheck -- vitest is added to package.json by the frontend test-setup PR
import { describe, expect, it } from "vitest";
import { computeHealthFactor, healthLevel } from "./loanHealth";
import { isPriceStale } from "./oracleStaleness";
import { pageCount, pageSlice } from "./liquidationPaging";

describe("loan manager helpers", () => {
  it("recomputes health when price or debt changes", () => {
    expect(computeHealthFactor(10, 2, 10)).toBe(2);
    expect(computeHealthFactor(10, 1, 10)).toBe(1);
    expect(computeHealthFactor(10, 1, 0)).toBe(Infinity);
  });
  it("classifies levels", () => {
    expect(healthLevel(2)).toBe("healthy");
    expect(healthLevel(1.2)).toBe("warning");
    expect(healthLevel(0.9)).toBe("danger");
  });
  it("detects staleness", () => {
    expect(isPriceStale(500, 100, 120)).toBe(true);
    expect(isPriceStale(150, 100, 120)).toBe(false);
  });
  it("paginates", () => {
    expect(pageCount(0)).toBe(1);
    expect(pageSlice([1, 2, 3], 1, 2)).toEqual([3]);
  });
});
