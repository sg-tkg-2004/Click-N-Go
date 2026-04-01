const BASE_SLOT_MIN = 15;

export function buildForwardSlotStarts(sortedRows, durationMinutes, nowMs = Date.now()) {
  const slotsNeeded = durationMinutes / BASE_SLOT_MIN;
  if (!Number.isInteger(slotsNeeded) || slotsNeeded < 1) return [];

  const out = [];
  for (let startIndex = 0; startIndex <= sortedRows.length - slotsNeeded; startIndex++) {
    const first = sortedRows[startIndex];
    const chain = [];
    let ok = true;
    for (let j = 0; j < slotsNeeded; j++) {
      const cur = sortedRows[startIndex + j];
      if (!cur) {
        ok = false;
        break;
      }
      if (j > 0) {
        const prev = chain[j - 1];
        if (new Date(prev.end_time).getTime() !== new Date(cur.start_time).getTime()) {
          ok = false;
          break;
        }
      }
      chain.push(cur);
    }
    if (!ok) continue;

    const anyBooked = chain.some((r) => Boolean(r.is_booked));
    const startMs = new Date(first.start_time).getTime();
    out.push({
      availability_id: first.id,
      start_time: first.start_time,
      disabled: anyBooked || startMs < nowMs,
    });
  }
  return out;
}
