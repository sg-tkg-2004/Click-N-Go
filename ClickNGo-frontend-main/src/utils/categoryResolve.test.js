import { describe, it, expect, vi, beforeEach } from "vitest";
import { slugifyName, resolveCategoryIdForRouteParam, invalidateCategoriesCache } from "./categoryResolve";

vi.mock("./api", () => ({
  fetchWithAuth: vi.fn(),
}));

import { fetchWithAuth } from "./api";

beforeEach(() => {
  invalidateCategoriesCache();
  vi.mocked(fetchWithAuth).mockReset();
});

describe("slugifyName", () => {
  it("lowercases and strips non-alphanumeric", () => {
    expect(slugifyName("Sports & Gaming")).toBe("sportsgaming");
  });
});

describe("resolveCategoryIdForRouteParam", () => {
  it("returns category id when route slug matches API slug", async () => {
    vi.mocked(fetchWithAuth).mockResolvedValueOnce({
      data: [{ id: "cat-uuid-1", name: "Grooming", slug: "grooming" }],
    });
    await expect(resolveCategoryIdForRouteParam("grooming")).resolves.toBe("cat-uuid-1");
  });

  it("maps sports route alias to sportsgaming slug", async () => {
    vi.mocked(fetchWithAuth).mockResolvedValueOnce({
      data: [{ id: "cat-sports", name: "Sports & Gaming", slug: "sportsgaming" }],
    });
    await expect(resolveCategoryIdForRouteParam("sports")).resolves.toBe("cat-sports");
  });

  it("returns null when no category matches", async () => {
    vi.mocked(fetchWithAuth).mockResolvedValueOnce({
      data: [{ id: "x", name: "Other", slug: "other" }],
    });
    await expect(resolveCategoryIdForRouteParam("unknownroute")).resolves.toBeNull();
  });
});
