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
  const pad = (max - min) * 0.12 || 1;
  return Math.ceil((max + pad) * 10) / 10;
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
