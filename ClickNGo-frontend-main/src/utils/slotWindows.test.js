import { describe, it, expect } from "vitest";
import { buildForwardSlotStarts } from "./slotWindows";

function row(id, start, end, is_booked = false) {
  return { id, start_time: start, end_time: end, is_booked };
}

describe("buildForwardSlotStarts", () => {
  const base = [
    row("a", "2026-04-01T10:00:00.000Z", "2026-04-01T10:15:00.000Z"),
    row("b", "2026-04-01T10:15:00.000Z", "2026-04-01T10:30:00.000Z"),
    row("c", "2026-04-01T10:30:00.000Z", "2026-04-01T10:45:00.000Z"),
    row("d", "2026-04-01T10:45:00.000Z", "2026-04-01T11:00:00.000Z"),
  ];

  it("30-minute service: each bookable start implies exactly 2 contiguous 15m rows forward (never a row before that start)", () => {
    const out = buildForwardSlotStarts(base, 30, 0);
    // Bookable starts: 10:00→[a,b], 10:15→[b,c], 10:30→[c,d] — never 9:45–10:00
    expect(out.map((s) => s.availability_id)).toEqual(["a", "b", "c"]);
    const atTen = out.find((s) => s.availability_id === "a");
    expect(atTen?.start_time).toBe("2026-04-01T10:00:00.000Z");
  });

  it("supports 45-minute service", () => {
    const out = buildForwardSlotStarts(base, 45, 0);
    expect(out.map((s) => s.availability_id)).toEqual(["a", "b"]);
  });

  it("supports 60-minute service", () => {
    const out = buildForwardSlotStarts(base, 60, 0);
    expect(out.map((s) => s.availability_id)).toEqual(["a"]);
  });

  it("disables windows when intermediate slot is booked", () => {
    const rows = [base[0], { ...base[1], is_booked: true }, base[2], base[3]];
    const out = buildForwardSlotStarts(rows, 30, 0);
    expect(out.find((s) => s.availability_id === "a")?.disabled).toBe(true);
  });

  it("never includes previous slot in a start window", () => {
    const out = buildForwardSlotStarts(base, 30, 0);
    const bStart = out.find((s) => s.availability_id === "b");
    expect(bStart?.start_time).toBe("2026-04-01T10:15:00.000Z");
  });

  it("fails near end-of-day when future slots are missing", () => {
    const out = buildForwardSlotStarts(base.slice(0, 3), 60, 0);
    expect(out).toHaveLength(0);
  });

  it("skips windows when future slot continuity breaks", () => {
    const broken = [
      row("x1", "2026-04-01T10:00:00.000Z", "2026-04-01T10:15:00.000Z"),
      row("x2", "2026-04-01T10:30:00.000Z", "2026-04-01T10:45:00.000Z"),
      row("x3", "2026-04-01T10:45:00.000Z", "2026-04-01T11:00:00.000Z"),
    ];
    const out = buildForwardSlotStarts(broken, 30, 0);
    expect(out).toHaveLength(1);
    expect(out[0].availability_id).toBe("x2");
  });
});
