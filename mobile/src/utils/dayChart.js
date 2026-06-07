export function safeNum(v, fallback = null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function dimColor(hex, mix = 0.55) {
  if (!hex || hex[0] !== '#') return '#94a3b8';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const blend = (c) => Math.round(c * (1 - mix) + 160 * mix);
  return `rgb(${blend(r)}, ${blend(g)}, ${blend(b)})`;
}

/**
 * Ghép giá trị vào giờ hiện tại chỉ khi bucket trống.
 * Mỗi giờ snapshot một lần — không cập nhật liên tục theo tick cảm biến.
 */
export function hourly24WithLive(entries, sensorKey, liveValue = null, liveSeedRef = null, chartHour = new Date().getHours()) {
  const pts = hourly24Filled(entries, sensorKey, null);
  const nowH = chartHour;
  if (pts[nowH]?.hasData) return pts;

  let seedVal = null;
  if (liveSeedRef?.current?.hour === nowH) {
    seedVal = liveSeedRef.current.value;
  } else {
    const live = safeNum(liveValue);
    if (live == null) return pts;
    if (liveSeedRef) liveSeedRef.current = { hour: nowH, value: live };
    seedVal = live;
  }

  return pts.map((p, h) => (h !== nowH ? p : { ...p, value: seedVal, hasData: true }));
}

/** Cắt cửa sổ giờ: recent = N giờ gần nhất; full24 = cả ngày 0–23h */
export function sliceHourlyWindow(pts, mode = 'full24', chartHour = new Date().getHours(), recentHours = 8) {
  if (mode !== 'recent' || !pts?.length) return pts;
  const endH = chartHour;
  const startH = Math.max(0, endH - recentHours + 1);
  return pts.slice(startH, endH + 1).map((p, i) => {
    const h = startH + i;
    const isFirst = i === 0;
    const isLast = h === endH;
    return {
      ...p,
      hour: h,
      label: isFirst || isLast || h % 3 === 0 ? `${String(h).padStart(2, '0')}h` : '',
    };
  });
}

/** 24 điểm theo giờ 0–23, trục X trái → phải */
export function hourly24Filled(entries, sensorKey, fallbackAvg = null) {
  const fb = safeNum(fallbackAvg);
  const buckets = Array.from({ length: 24 }, () => null);

  entries.forEach((e) => {
    if (!e.ts) return;
    const dt = new Date(Number(e.ts));
    if (Number.isNaN(dt.getTime())) return;
    const h = dt.getHours();
    const v = safeNum(e[sensorKey]);
    if (v == null) return;
    if (!buckets[h]) buckets[h] = { sum: 0, n: 0 };
    buckets[h].sum += v;
    buckets[h].n += 1;
  });

  let last = fb;
  return buckets.map((b, h) => {
    let v = b ? Math.round((b.sum / b.n) * 10) / 10 : null;
    if (v == null && last != null) v = last;
    return {
      hour: h,
      value: safeNum(v, 0),
      hasData: b != null,
      label: [0, 6, 12, 18].includes(h) ? `${String(h).padStart(2, '0')}h` : '',
    };
  });
}

export function computeYRange(...series) {
  const vals = series
    .flat()
    .filter((p) => p.hasData)
    .map((p) => safeNum(p.value))
    .filter((v) => v != null);
  if (!vals.length) return 100;
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (min === max) { min -= 1; max += 1; }
  const span = max - min || 1;
  // Headroom phía trên — đường cong (bezier) hay vượt maxValue và bị cắt
  const topPad = Math.max(span * 0.24, max * 0.1, 3);
  return Math.ceil((max + topPad) * 10) / 10;
}

export function seriesMinMax(points) {
  const vals = points.filter((p) => p.hasData).map((p) => p.value);
  if (!vals.length) return { min: null, max: null };
  return {
    min: Math.round(Math.min(...vals) * 10) / 10,
    max: Math.round(Math.max(...vals) * 10) / 10,
  };
}

export function buildOverlayChart(selectedPts, comparePts) {
  const toData = (pts) => pts.map((p) => ({
    value: safeNum(p.value, 0),
    label: p.label,
  }));

  return {
    selected: toData(selectedPts),
    compare: toData(comparePts),
    selectedCount: selectedPts.filter((p) => p.hasData).length,
    compareCount: comparePts.filter((p) => p.hasData).length,
  };
}
