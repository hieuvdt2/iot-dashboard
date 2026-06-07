export const MAX_HISTORY = 50;

export const SENSOR_KEYS = [
  { key: 'nhiet_do',        label: 'Nhiệt độ (°C)',   color: '#ff6b6b' },
  { key: 'do_am_khong_khi', label: 'Độ ẩm KK (%)',    color: '#4dabf7' },
  { key: 'do_am_dat',       label: 'Độ ẩm đất (%)',   color: '#51cf66' },
  { key: 'anh_sang',        label: 'Ánh sáng',        color: '#ffa94d' },
  { key: 'muc_nuoc',        label: 'Mực nước bể (%)', color: '#ffd43b' },
];

const SENSOR_FIELDS = SENSOR_KEYS.map((s) => s.key);

/** Returns last numDays days as YYYY-MM-DD strings, oldest → newest */
export function getDateKeys(numDays) {
  return Array.from({ length: numDays }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (numDays - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

/** Normalize a raw Firebase entry to standard field names */
export function normalizeEntry(raw) {
  return {
    ts:               Number(raw.ts || raw.timestamp || 0),
    nhiet_do:         raw.nhiet_do         ?? raw.temperature ?? raw.temp  ?? null,
    do_am_khong_khi:  raw.do_am_khong_khi  ?? raw.airHumidity ?? raw.humi  ?? null,
    do_am_dat:        raw.do_am_dat        ?? raw.soilMoisture ?? raw.soil ?? null,
    anh_sang:         raw.anh_sang         ?? raw.light        ?? raw.lux  ?? null,
    muc_nuoc:         raw.muc_nuoc         ?? raw.waterLevel   ?? raw.distance ?? null,
  };
}

function makeBucket() {
  const b = { _s: {}, _c: {} };
  SENSOR_FIELDS.forEach((f) => { b._s[f] = 0; b._c[f] = 0; });
  return b;
}
function finalizeBucket(b) {
  const r = { time: b.time };
  SENSOR_FIELDS.forEach((f) => {
    r[f] = b._c[f] > 0 ? Math.round((b._s[f] / b._c[f]) * 10) / 10 : null;
  });
  return r;
}
function accumulate(bucket, entry) {
  SENSOR_FIELDS.forEach((f) => {
    if (entry[f] != null) { bucket._s[f] += Number(entry[f]); bucket._c[f]++; }
  });
}

/** Aggregate entries by hour — for "hôm nay" view */
export function aggregateHourly(entries) {
  const buckets = new Map();
  entries.forEach((e) => {
    if (!e.ts) return;
    const d = new Date(e.ts);
    const h = d.getHours();
    const label = `${String(h).padStart(2, '0')}:00`;
    if (!buckets.has(h)) buckets.set(h, { ...makeBucket(), time: label });
    accumulate(buckets.get(h), e);
  });
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, b]) => finalizeBucket(b));
}

const VN_DAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/** Aggregate entries by calendar day — for "7 ngày" / "30 ngày" view */
export function aggregateDaily(entries) {
  const buckets = new Map();
  entries.forEach((e) => {
    if (!e.ts) return;
    const d = new Date(e.ts);
    const key = d.toISOString().slice(0, 10);
    const label = `${VN_DAY[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
    if (!buckets.has(key)) buckets.set(key, { ...makeBucket(), time: label });
    accumulate(buckets.get(key), e);
  });
  return [...buckets.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([, b]) => finalizeBucket(b));
}

const formatTime = (ts) =>
  new Date(ts).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

export function addToHistory(prevHistory, newData) {
  const timestamp = formatTime(Date.now());

  const entry = {
    time: timestamp,
    nhiet_do: newData.nhiet_do ?? null,
    do_am_khong_khi: newData.do_am_khong_khi ?? null,
    do_am_dat: newData.do_am_dat ?? null,
    anh_sang: newData.anh_sang ?? null,
    muc_nuoc: newData.muc_nuoc ?? null,
  };

  const updated = [...prevHistory, entry];
  if (updated.length > MAX_HISTORY) {
    return updated.slice(updated.length - MAX_HISTORY);
  }
  return updated;
}

export function buildHistoryFromFirebase(historyData) {
  if (!historyData || typeof historyData !== 'object') return [];

  const entries = Object.values(historyData)
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const ts = item.ts || Date.now();
      return {
        ts,
        time: formatTime(ts),
        nhiet_do: item.nhiet_do ?? item.temp ?? null,
        do_am_khong_khi: item.do_am_khong_khi ?? item.humi ?? null,
        do_am_dat: item.do_am_dat ?? item.soil ?? null,
        anh_sang: item.anh_sang ?? item.lux ?? null,
        muc_nuoc: item.muc_nuoc ?? item.distance ?? null,
      };
    });

  return entries.sort((a, b) => a.ts - b.ts).slice(-MAX_HISTORY);
}

export function getChartData(history) {
  return history.map((item) => ({
    time: item.time,
    'Nhiệt độ (°C)': item.nhiet_do,
    'Độ ẩm KK (%)': item.do_am_khong_khi,
    'Độ ẩm đất (%)': item.do_am_dat,
    'Ánh sáng (lux)': item.anh_sang,
    'Mực nước (cm)': item.muc_nuoc,
  }));
}

export function saveHistoryToStorage(history) {
  try {
    localStorage.setItem('iot_sensor_history', JSON.stringify(history));
  } catch (e) {
    // localStorage unavailable (e.g. in some mobile webviews)
  }
}

export function loadHistoryFromStorage() {
  try {
    const saved = localStorage.getItem('iot_sensor_history');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}
