import { useState, useEffect, useCallback } from 'react';
import { firebaseService } from '../services/firebaseService';
import {
  aggregateHourly,
  getDateKeys,
  normalizeEntry,
} from '../utils/sensorHistory';

const HOUR_LABELS = [0, 3, 6, 9, 12, 15, 18, 21].map(
  (h) => `${String(h).padStart(2, '0')}:00`,
);

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Chuẩn hóa 8 mốc giờ cho biểu đồ (00–21) */
export function fillChartHours(aggregated) {
  const byHour = new Map();
  aggregated.forEach((row) => {
    const h = parseInt(String(row.time).split(':')[0], 10);
    if (!Number.isNaN(h)) byHour.set(h, row);
  });

  return HOUR_LABELS.map((label) => {
    const h = parseInt(label.split(':')[0], 10);
    const src = byHour.get(h) ?? {};
    return {
      time: label,
      nhiet_do: safeNum(src.nhiet_do),
      do_am_dat: safeNum(src.do_am_dat),
      do_am_khong_khi: safeNum(src.do_am_khong_khi),
      anh_sang: safeNum(src.anh_sang),
      muc_nuoc: safeNum(src.muc_nuoc),
    };
  });
}

export function useGardenChartData(refreshKey = 0) {
  const [hourlyRaw, setHourlyRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(null);

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
  }, [fetchData, refreshKey]);

  const chartData = fillChartHours(hourlyRaw);

  return { chartData, hourlyRaw, loading, error, lastSync, refetch: fetchData };
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
