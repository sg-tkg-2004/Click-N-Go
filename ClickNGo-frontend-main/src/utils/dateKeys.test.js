import { describe, it, expect } from "vitest";
import { normalizeLocalDateKey, todayLocalDateKey } from "./dateKeys";

describe("normalizeLocalDateKey", () => {
  it("returns YYYY-MM-DD for a local Date", () => {
    const d = new Date(2026, 3, 1, 15, 30, 0);
    expect(normalizeLocalDateKey(d)).toBe("2026-04-01");
  });

  it("returns empty for invalid input", () => {
    expect(normalizeLocalDateKey("not a date")).toBe("");
  });

  it("matches the same calendar day for ISO strings parsed in local time", () => {
    const key = normalizeLocalDateKey(new Date("2026-04-01T12:00:00"));
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("todayLocalDateKey", () => {
  it("returns a valid date key", () => {
    expect(todayLocalDateKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
