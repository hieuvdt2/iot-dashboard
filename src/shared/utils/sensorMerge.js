/** Gộp snapshot cảm biến — không ghi đè field cũ bằng null/undefined */
export function mergeSensorRecord(prev = {}, next = {}) {
  if (!next || typeof next !== 'object') return { ...prev };
  const merged = { ...prev };
  Object.entries(next).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    if (typeof value === 'number' && !Number.isFinite(value)) return;
    merged[key] = value;
  });
  return merged;
}

/** Trích patch cảm biến chuẩn từ payload Firebase / MQTT (web) */
export function buildSensorPatch(raw, normalizeEntry, normalizeSensorPayload) {
  if (!raw) return {};
  const n = normalizeEntry(raw);
  const aliases = normalizeSensorPayload(raw);
  const patch = {
    nhiet_do: n.nhiet_do ?? aliases.nhiet_do ?? raw.nhiet_do ?? raw.temp,
    do_am_khong_khi: n.do_am_khong_khi ?? aliases.do_am_khong_khi ?? raw.do_am_khong_khi ?? raw.humi,
    do_am_dat: n.do_am_dat ?? aliases.do_am_dat ?? raw.do_am_dat ?? raw.soil,
    anh_sang: n.anh_sang ?? aliases.anh_sang ?? raw.anh_sang ?? raw.lux,
    muc_nuoc: n.muc_nuoc ?? aliases.muc_nuoc ?? raw.muc_nuoc ?? raw.distance,
    trang_thai_bom: aliases.trang_thai_bom ?? raw.trang_thai_bom,
    auto_mode: aliases.auto_mode ?? raw.auto_mode,
    auto: raw.auto ?? aliases.auto,
    pump: raw.pump ?? aliases.pump,
    ts: raw.ts ?? raw.timestamp,
    time: raw.time,
  };
  const out = {};
  Object.entries(patch).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') out[k] = v;
  });
  return out;
}
