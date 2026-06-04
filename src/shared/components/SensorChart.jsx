import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  normalizeEntry,
  aggregateHourly,
  aggregateDaily,
  getDateKeys,
} from '../utils/sensorHistory';
import { firebaseService } from '../services/firebaseService';

/* ── Config ─────────────────────────────────────────────────────────────── */

const SENSORS = [
  { key: 'nhiet_do',        label: 'Nhiệt độ',        unit: '°C',  icon: '🌡️', color: '#ef4444', areaColor: ['#ef444440', '#ef444400'] },
  { key: 'do_am_dat',       label: 'Độ ẩm đất',       unit: '%',   icon: '🌱', color: '#22c55e', areaColor: ['#22c55e40', '#22c55e00'] },
  { key: 'do_am_khong_khi', label: 'Độ ẩm không khí', unit: '%',   icon: '💧', color: '#3b82f6', areaColor: ['#3b82f640', '#3b82f600'] },
  { key: 'anh_sang',        label: 'Ánh sáng',         unit: 'lux', icon: '☀️', color: '#f59e0b', areaColor: ['#f59e0b40', '#f59e0b00'] },
  { key: 'muc_nuoc',        label: 'Mực nước',         unit: 'cm',  icon: '🪣', color: '#a855f7', areaColor: ['#a855f740', '#a855f700'] },
];

const RANGES = [
  { key: 'today', label: '24 giờ',  days: 1,  aggFn: aggregateHourly, desc: 'Trung bình theo giờ — hôm nay' },
  { key: 'week',  label: '7 ngày',  days: 7,  aggFn: aggregateDaily,  desc: 'Trung bình theo ngày — 7 ngày gần nhất' },
  { key: 'month', label: '30 ngày', days: 30, aggFn: aggregateDaily,  desc: 'Trung bình theo ngày — 30 ngày gần nhất' },
];

/* ── Main component ──────────────────────────────────────────────────────── */

export default function SensorChart() {
  const [range,     setRange]     = useState('today');
  const [sensorKey, setSensorKey] = useState('nhiet_do');
  const [rawData,   setRawData]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [lastSync,  setLastSync]  = useState(null);
  const chartRef = useRef(null);

  const sensor      = SENSORS.find((s) => s.key === sensorKey) ?? SENSORS[0];
  const activeRange = RANGES.find((r) => r.key === range)      ?? RANGES[0];

  const fetchData = useCallback(async (rangeKey) => {
    const r = RANGES.find((x) => x.key === rangeKey);
    if (!r) return;
    setLoading(true);
    try {
      const rawEntries = await firebaseService.getHistoryForDates(getDateKeys(r.days));
      setRawData(r.aggFn(rawEntries.map(normalizeEntry)));
      setLastSync(new Date());
    } catch (e) {
      console.warn('[SensorChart]', e.message);
      setRawData([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(range); }, [range, fetchData]);

  /* Stats */
  const stats = useMemo(() => {
    const vals = rawData.map((d) => d[sensorKey]).filter((v) => v != null);
    if (!vals.length) return null;
    const min = Math.min(...vals), max = Math.max(...vals);
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    return { min, max, avg };
  }, [rawData, sensorKey]);

  /* ECharts option */
  const option = useMemo(() => {
    const xData  = rawData.map((d) => d.time);
    const yData  = rawData.map((d) => d[sensorKey] ?? null);
    const avgVal = stats?.avg ?? null;

    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 600,
      animationEasing: 'cubicOut',

      grid: { top: 24, right: 20, bottom: 40, left: 56 },

      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'line',
          lineStyle: { color: sensor.color, width: 1.5, type: 'dashed' },
        },
        backgroundColor: '#fff',
        borderColor: sensor.color + '44',
        borderWidth: 1.5,
        borderRadius: 10,
        padding: [10, 14],
        textStyle: { color: '#374151', fontSize: 12 },
        formatter(params) {
          const p = params[0];
          if (!p) return '';
          const val = p.value != null ? Number(p.value).toFixed(1) : '--';
          return `
            <div style="font-size:11px;color:#9ca3af;margin-bottom:6px">${p.axisValue}</div>
            <div style="display:flex;align-items:baseline;gap:4px">
              <span style="font-size:22px;font-weight:800;color:${sensor.color};letter-spacing:-1px">${val}</span>
              <span style="font-size:13px;color:#6b7280;font-weight:600">${sensor.unit}</span>
            </div>
            <div style="font-size:10px;color:#9ca3af;margin-top:3px">${sensor.icon} ${sensor.label}</div>
          `;
        },
      },

      xAxis: {
        type: 'category',
        data: xData,
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#f3f4f6' } },
        axisTick: { show: false },
        axisLabel: { color: '#9ca3af', fontSize: 10, interval: 'auto' },
        splitLine: { show: false },
      },

      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#9ca3af',
          fontSize: 10,
          formatter: (v) => `${v}${sensor.unit}`,
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
      },

      series: [
        {
          type: 'line',
          data: yData,
          smooth: 0.4,
          symbol: range !== 'today' ? 'circle' : 'none',
          symbolSize: 7,
          lineStyle: { color: sensor.color, width: 2.5 },
          itemStyle: { color: sensor.color, borderColor: '#fff', borderWidth: 2 },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0,   color: sensor.areaColor[0] },
                { offset: 1,   color: sensor.areaColor[1] },
              ],
            },
          },
          connectNulls: true,
          markLine: avgVal != null ? {
            silent: true,
            lineStyle: { color: sensor.color, type: 'dashed', opacity: 0.45, width: 1.5 },
            label: {
              formatter: `TB: {c}${sensor.unit}`,
              color: sensor.color,
              fontSize: 10,
              position: 'insideEndTop',
            },
            data: [{ type: 'average', name: 'Trung bình' }],
          } : undefined,
        },
      ],
    };
  }, [rawData, sensorKey, sensor, range, stats]);

  const hasData = rawData.length > 0 && rawData.some((d) => d[sensorKey] != null);

  return (
    <div>
      {/* ── Range + Refresh ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              style={{
                padding: '5px 14px', borderRadius: 999, fontSize: '0.78rem',
                fontWeight: range === r.key ? 700 : 500,
                border: `1.5px solid ${range === r.key ? sensor.color : '#e5e7eb'}`,
                background: range === r.key ? sensor.color + '12' : 'transparent',
                color: range === r.key ? sensor.color : '#6b7280',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => fetchData(range)}
          disabled={loading}
          style={{
            padding: '5px 14px', borderRadius: 999, fontSize: '0.75rem',
            border: '1px solid #e5e7eb', background: 'transparent',
            color: loading ? '#d1d5db' : '#6b7280', cursor: 'pointer',
          }}
        >
          {loading ? '⏳ Đang tải...' : '↻ Làm mới'}
        </button>
      </div>

      {/* ── Sensor pills ── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {SENSORS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSensorKey(s.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 14px', borderRadius: 999, fontSize: '0.8rem', fontWeight: 600,
              border: `1.5px solid ${sensorKey === s.key ? s.color : '#e5e7eb'}`,
              background: sensorKey === s.key ? s.color + '12' : 'transparent',
              color: sensorKey === s.key ? s.color : '#9ca3af',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {s.icon} {s.label}
            {sensorKey === s.key && (
              <span style={{
                background: s.color, color: '#fff', borderRadius: 999,
                padding: '1px 7px', fontSize: '0.68rem', marginLeft: 2,
              }}>
                {s.unit}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Desc ── */}
      <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: 8, marginTop: -6 }}>
        📊 {activeRange.desc}
        {lastSync && (
          <span style={{ marginLeft: 8, color: '#d1d5db' }}>
            · {lastSync.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </p>

      {/* ── Chart ── */}
      {loading ? (
        <div className="chart-empty">
          <div className="chart-spinner" />
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : !hasData ? (
        <div className="chart-empty">
          <p style={{ fontSize: '2rem' }}>📭</p>
          <p>Chưa có dữ liệu cho khoảng thời gian này.</p>
          <p style={{ fontSize: '0.76rem', color: '#d1d5db' }}>Thử chọn khoảng khác hoặc bấm Làm mới.</p>
        </div>
      ) : (
        <ReactECharts
          ref={chartRef}
          option={option}
          style={{ height: 240, width: '100%' }}
          notMerge
          lazyUpdate={false}
        />
      )}

      {/* ── Stats strip ── */}
      {stats && !loading && hasData && (
        <div style={{
          display: 'flex', justifyContent: 'space-around',
          background: sensor.color + '0d',
          border: `1px solid ${sensor.color}22`,
          borderRadius: 10, padding: '12px 0', marginTop: 14,
        }}>
          {[
            { label: 'Thấp nhất', value: stats.min },
            { label: 'Trung bình', value: stats.avg },
            { label: 'Cao nhất',  value: stats.max },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.68rem', color: '#9ca3af', marginBottom: 4 }}>{label}</p>
              <p style={{ fontSize: '1.15rem', fontWeight: 800, color: sensor.color, letterSpacing: '-0.5px', lineHeight: 1 }}>
                {value.toFixed(1)}
                <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#9ca3af', marginLeft: 2 }}>{sensor.unit}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
