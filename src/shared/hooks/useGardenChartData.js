import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { firebaseService } from '../services/firebaseService';
import {
  aggregateHourly,
  getDateKeys,
  normalizeEntry,
} from '../utils/sensorHistory';

const CHART_FIELDS = ['nhiet_do', 'do_am_khong_khi', 'do_am_dat', 'anh_sang', 'muc_nuoc'];

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Đọc giá trị realtime từ MQTT / Firebase latest */
export function extractLiveEntry(sensorData) {
  if (!sensorData) return null;
  const entry = normalizeEntry({
    ts: sensorData.ts ?? sensorData.timestamp ?? Date.now(),
    nhiet_do: sensorData.nhiet_do,
    do_am_khong_khi: sensorData.do_am_khong_khi,
    do_am_dat: sensorData.do_am_dat,
    anh_sang: sensorData.anh_sang,
    muc_nuoc: sensorData.muc_nuoc,
  });
  const hasAny = CHART_FIELDS.some((k) => entry[k] != null);
  return hasAny ? entry : null;
}

function hourBucketHasData(row) {
  return Boolean(row && CHART_FIELDS.some((f) => safeNum(row[f]) != null));
}

/**
 * Chỉ điền bucket giờ hiện tại khi Firebase chưa có dữ liệu giờ đó.
 * Mỗi giờ snapshot live một lần — biểu đồ không nhảy theo từng tick cảm biến.
 */
export function mergeLiveIntoHourly(hourlyRaw, live, liveSeedRef, chartHour = new Date().getHours()) {
  if (!live) return hourlyRaw;
  const h = chartHour;
  const existing = hourlyRaw.find((r) => parseInt(String(r.time).split(':')[0], 10) === h);
  if (hourBucketHasData(existing)) return hourlyRaw;

  let snapshot = live;
  if (liveSeedRef) {
    if (liveSeedRef.current?.hour === h) {
      snapshot = liveSeedRef.current.entry;
    } else {
      liveSeedRef.current = { hour: h, entry: live };
      snapshot = live;
    }
  }

  const label = `${String(h).padStart(2, '0')}:00`;
  const rows = hourlyRaw.map((r) => ({ ...r }));
  let idx = rows.findIndex((r) => parseInt(String(r.time).split(':')[0], 10) === h);
  if (idx < 0) {
    rows.push({
      time: label,
      nhiet_do: null,
      do_am_khong_khi: null,
      do_am_dat: null,
      anh_sang: null,
      muc_nuoc: null,
    });
    rows.sort((a, b) => parseInt(String(a.time), 10) - parseInt(String(b.time), 10));
    idx = rows.findIndex((r) => parseInt(String(r.time).split(':')[0], 10) === h);
  }
  const row = { ...rows[idx] };
  CHART_FIELDS.forEach((f) => {
    if (snapshot[f] != null) row[f] = Number(snapshot[f]);
  });
  row.fromLive = true;
  rows[idx] = row;
  return rows;
}

/** Cập nhật khi sang giờ mới (biểu đồ theo giờ, không theo tick cảm biến) */
export function useCurrentChartHour() {
  const [hour, setHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const tick = () => {
      const h = new Date().getHours();
      setHour((prev) => (prev !== h ? h : prev));
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  return hour;
}

/** Các mốc 0h → giờ hiện tại; ô không có dữ liệu = null (không hard-code 0) */
export function fillChartHoursToday(aggregated) {
  const byHour = new Map();
  aggregated.forEach((row) => {
    const h = parseInt(String(row.time).split(':')[0], 10);
    if (!Number.isNaN(h)) byHour.set(h, row);
  });

  const nowH = new Date().getHours();
  const hours = [];
  for (let h = 0; h <= nowH; h += 1) hours.push(h);

  return hours.map((h) => {
    const label = `${String(h).padStart(2, '0')}:00`;
    const src = byHour.get(h);
    return {
      time: label,
      nhiet_do: safeNum(src?.nhiet_do),
      do_am_khong_khi: safeNum(src?.do_am_khong_khi),
      do_am_dat: safeNum(src?.do_am_dat),
      anh_sang: safeNum(src?.anh_sang),
      muc_nuoc: safeNum(src?.muc_nuoc),
      fromLive: Boolean(src?.fromLive),
    };
  });
}

/** @deprecated Dùng fillChartHoursToday */
export function fillChartHours(aggregated) {
  return fillChartHoursToday(aggregated);
}

export function useGardenChartData(sensorData = null) {
  const [hourlyRaw, setHourlyRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const liveSeedRef = useRef(null);
  const sensorRef = useRef(sensorData);
  sensorRef.current = sensorData;
  const chartHour = useCurrentChartHour();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await firebaseService.getHistoryForDates(getDateKeys(1));
      const entries = raw.map(normalizeEntry).filter((e) => e.ts > 0);
      setHourlyRaw(aggregateHourly(entries));
      setLastSync(new Date());
    } catch (e) {
      setError(e.message);
      setHourlyRaw([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hourlyMerged = useMemo(() => {
    const liveEntry = extractLiveEntry(sensorRef.current);
    return mergeLiveIntoHourly(hourlyRaw, liveEntry, liveSeedRef, chartHour);
  }, [hourlyRaw, chartHour]);
  const chartData = useMemo(() => fillChartHoursToday(hourlyMerged), [hourlyMerged]);

  return { chartData, hourlyRaw: hourlyMerged, loading, error, lastSync, refetch: fetchData };
}

export function getHourTrend(hourlyRaw, key, currentValue) {
  const cur = safeNum(currentValue);
  if (cur == null || !hourlyRaw.length) return null;
  const nowH = new Date().getHours();
  const prevH = nowH <= 0 ? 23 : nowH - 1;
  const prevRow = hourlyRaw.find((r) => parseInt(r.time, 10) === prevH);
  const prev = safeNum(prevRow?.[key]);
  if (prev == null) return null;
  const diff = +(cur - prev).toFixed(1);
  if (diff === 0) return { diff: 0, label: 'Ổn định' };
  return {
    diff,
    label: diff > 0 ? `+${diff}` : `${diff}`,
    up: diff > 0,
    down: diff < 0,
  };
}
