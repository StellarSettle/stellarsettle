import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePagination } from "./usePagination";

describe("usePagination", () => {
  it("splits items into pages and clamps when items shrink", () => {
    const { result, rerender } = renderHook(({ items }) => usePagination(items, 2), { initialProps: { items: [1, 2, 3, 4, 5] } });
    expect(result.current.pageCount).toBe(3);
    expect(result.current.pageItems).toEqual([1, 2]);
    act(() => result.current.setPage(3));
    expect(result.current.pageItems).toEqual([5]);
    rerender({ items: [1, 2] });
    expect(result.current.page).toBe(1);
    expect(result.current.pageItems).toEqual([1, 2]);
  });
});
