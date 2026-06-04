import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, Dimensions, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { C } from '../theme';
import { firebaseService } from '../services/firebaseService';

const screenWidth = Dimensions.get('window').width - 32;

/* ── Config ─────────────────────────────────────────────────────────────── */

const SENSORS = [
  { key: 'temperature', label: 'Nhiệt độ',        unit: '°C',  icon: '🌡️', color: '#ef4444' },
  { key: 'soilHum',     label: 'Độ ẩm đất',       unit: '%',   icon: '🌱', color: '#22c55e' },
  { key: 'airHum',      label: 'Độ ẩm không khí', unit: '%',   icon: '💧', color: '#3b82f6' },
  { key: 'light',       label: 'Ánh sáng',         unit: 'lux', icon: '☀️', color: '#f59e0b' },
];

const RANGES = [
  { key: 'today', label: '24 giờ',  days: 1  },
  { key: 'week',  label: '7 ngày',  days: 7  },
  { key: 'month', label: '30 ngày', days: 30 },
];

const VN_DAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const FIELDS  = SENSORS.map((s) => s.key);

/* ── Aggregation helpers ─────────────────────────────────────────────────── */

function getDateKeys(numDays) {
  return Array.from({ length: numDays }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (numDays - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

function normalizeEntry(raw) {
  return {
    ts:          Number(raw.ts || raw.timestamp || 0),
    temperature: raw.temperature ?? raw.nhiet_do     ?? raw.temp  ?? null,
    soilHum:     raw.soilHum     ?? raw.soilMoisture ?? raw.do_am_dat ?? raw.soil ?? null,
    airHum:      raw.airHum      ?? raw.airHumidity  ?? raw.do_am_khong_khi ?? raw.humi ?? null,
    light:       raw.light       ?? raw.anh_sang     ?? raw.lux   ?? null,
  };
}

function makeBucket() {
  return { _s: Object.fromEntries(FIELDS.map((f) => [f, 0])), _c: Object.fromEntries(FIELDS.map((f) => [f, 0])) };
}
function accumulate(b, e) {
  FIELDS.forEach((f) => { if (e[f] != null) { b._s[f] += Number(e[f]); b._c[f]++; } });
}
function finalize(b, label) {
  const r = { time: label };
  FIELDS.forEach((f) => { r[f] = b._c[f] > 0 ? Math.round((b._s[f] / b._c[f]) * 10) / 10 : null; });
  return r;
}

function aggregateHourly(entries) {
  const map = new Map();
  entries.forEach((e) => {
    if (!e.ts) return;
    const h = new Date(e.ts).getHours();
    const label = `${String(h).padStart(2, '0')}:00`;
    if (!map.has(h)) map.set(h, { ...makeBucket(), label });
    accumulate(map.get(h), e);
  });
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([, b]) => finalize(b, b.label));
}

function aggregateDaily(entries) {
  const map = new Map();
  entries.forEach((e) => {
    if (!e.ts) return;
    const d   = new Date(e.ts);
    const key = d.toISOString().slice(0, 10);
    const lbl = `${VN_DAY[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
    if (!map.has(key)) map.set(key, { ...makeBucket(), label: lbl });
    accumulate(map.get(key), e);
  });
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([, b]) => finalize(b, b.label));
}

/* ── Main component ──────────────────────────────────────────────────────── */

export default function SensorChart() {
  const [range,    setRange]    = useState('today');
  const [sKey,     setSKey]     = useState('temperature');
  const [aggData,  setAggData]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const sensor = SENSORS.find((s) => s.key === sKey) ?? SENSORS[0];

  const fetchData = useCallback(async (rangeKey) => {
    setLoading(true);
    try {
      const days    = RANGES.find((r) => r.key === rangeKey)?.days ?? 1;
      const keys    = getDateKeys(days);
      const entries = [];
      await Promise.all(keys.map(async (dk) => {
        const data = await firebaseService.getHistoryForDate(dk);
        if (data) Object.values(data).forEach((raw) => {
          if (raw?.ts) entries.push(normalizeEntry(raw));
        });
      }));
      entries.sort((a, b) => a.ts - b.ts);
      setAggData(days === 1 ? aggregateHourly(entries) : aggregateDaily(entries));
      setLastSync(new Date());
    } catch (e) {
      console.warn('[SensorChart]', e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(range); }, [range, fetchData]);

  /* Build gifted-chart data — requires { value } objects */
  const chartPoints = useMemo(() =>
    aggData.map((r, i) => ({
      value: r[sKey] ?? 0,
      label: i % Math.max(1, Math.floor(aggData.length / 6)) === 0 ? r.time : '',
      dataPointText: '',
    })),
    [aggData, sKey]
  );

  /* Stats */
  const stats = useMemo(() => {
    const vals = aggData.map((r) => r[sKey]).filter((v) => v != null);
    if (!vals.length) return null;
    const min = Math.min(...vals), max = Math.max(...vals);
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    return { min, max, avg };
  }, [aggData, sKey]);

  const hasData  = chartPoints.length >= 2 && chartPoints.some((p) => p.value > 0);
  const chartW   = Math.max(screenWidth - 16, chartPoints.length * 52);

  const descText = range === 'today'
    ? 'Trung bình theo giờ — hôm nay'
    : range === 'week' ? 'Trung bình theo ngày — 7 ngày gần nhất'
    : 'Trung bình theo ngày — 30 ngày gần nhất';

  return (
    <View style={ss.card}>
      {/* Title + refresh */}
      <View style={ss.titleRow}>
        <Text style={ss.title}>📈 Biểu đồ cảm biến</Text>
        <TouchableOpacity onPress={() => fetchData(range)} disabled={loading} style={ss.refreshBtn}>
          <Text style={{ color: loading ? C.text3 : C.text2, fontSize: 16 }}>
            {loading ? '⏳' : '↻'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Range selector */}
      <View style={ss.rangeRow}>
        {RANGES.map((r) => (
          <TouchableOpacity
            key={r.key}
            style={[ss.rangeBtn, range === r.key && { backgroundColor: sensor.color + '18', borderColor: sensor.color }]}
            onPress={() => setRange(r.key)}
          >
            <Text style={[ss.rangeTxt, range === r.key && { color: sensor.color, fontWeight: '700' }]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sensor pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        <View style={ss.sensorRow}>
          {SENSORS.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[ss.sensorBtn, sKey === s.key && { backgroundColor: s.color + '18', borderColor: s.color }]}
              onPress={() => setSKey(s.key)}
            >
              <Text style={{ fontSize: 13 }}>{s.icon}</Text>
              <Text style={[ss.sensorTxt, sKey === s.key && { color: s.color, fontWeight: '700' }]}>
                {s.label}
              </Text>
              {sKey === s.key && (
                <View style={[ss.unitBadge, { backgroundColor: s.color }]}>
                  <Text style={ss.unitTxt}>{s.unit}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Description */}
      <Text style={ss.desc}>
        📊 {descText}
        {lastSync ? `  ·  ${lastSync.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : ''}
      </Text>

      {/* Chart area */}
      {loading ? (
        <View style={ss.empty}>
          <ActivityIndicator size="large" color={sensor.color} />
          <Text style={ss.emptyTxt}>Đang tải dữ liệu...</Text>
        </View>
      ) : !hasData ? (
        <View style={ss.empty}>
          <Text style={{ fontSize: 32 }}>📭</Text>
          <Text style={ss.emptyTxt}>Chưa có dữ liệu</Text>
          <Text style={[ss.emptyTxt, { fontSize: 11, color: C.text3 }]}>Thử khoảng thời gian khác</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
          <LineChart
            data={chartPoints}
            width={chartW}
            height={180}
            curved
            isAnimated
            animationDuration={600}

            /* Line */
            color={sensor.color}
            thickness={2.5}

            /* Area fill */
            areaChart
            startFillColor={sensor.color}
            endFillColor={sensor.color}
            startOpacity={0.18}
            endOpacity={0.01}

            /* Dots */
            hideDataPoints={range === 'today'}
            dataPointsColor={sensor.color}
            dataPointsRadius={4}

            /* Grid */
            rulesColor="#f3f4f6"
            rulesType="solid"
            xAxisColor="#f3f4f6"
            yAxisColor="transparent"
            yAxisTextStyle={{ color: '#9ca3af', fontSize: 9 }}
            xAxisLabelTextStyle={{ color: '#9ca3af', fontSize: 9 }}

            /* Axis */
            noOfSections={4}
            yAxisTextNumberOfLines={1}
            xAxisThickness={1}
            yAxisThickness={0}

            /* Pointer */
            focusEnabled
            showStripOnFocus
            stripColor={sensor.color}
            stripOpacity={0.2}
            stripWidth={1.5}
            focusedDataPointRadius={5}
            focusedDataPointColor={sensor.color}

            /* Container */
            backgroundColor="transparent"
            initialSpacing={12}
            endSpacing={12}
          />
        </ScrollView>
      )}

      {/* Stats strip */}
      {stats && !loading && hasData && (
        <View style={[ss.statsRow, { backgroundColor: sensor.color + '10', borderColor: sensor.color + '28' }]}>
          {[
            { label: 'Thấp nhất', value: stats.min },
            { label: 'Trung bình', value: stats.avg },
            { label: 'Cao nhất',  value: stats.max },
          ].map(({ label, value }) => (
            <View key={label} style={ss.statItem}>
              <Text style={ss.statLabel}>{label}</Text>
              <Text style={[ss.statValue, { color: sensor.color }]}>
                {value.toFixed(1)}
                <Text style={ss.statUnit}> {sensor.unit}</Text>
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────── */

const ss = StyleSheet.create({
  card: {
    backgroundColor: C.bgCard, borderRadius: C.radius,
    borderWidth: 1, borderColor: C.border, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  titleRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title:      { fontSize: 15, fontWeight: '700', color: C.text },
  refreshBtn: { padding: 4 },

  rangeRow:    { flexDirection: 'row', gap: 6, marginBottom: 10 },
  rangeBtn:    { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1.5, borderColor: C.border },
  rangeTxt:    { fontSize: 12, color: C.text2, fontWeight: '600' },

  sensorRow:   { flexDirection: 'row', gap: 6, paddingRight: 6 },
  sensorBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5, borderColor: C.border },
  sensorTxt:   { fontSize: 12, color: C.text2, fontWeight: '600' },
  unitBadge:   { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  unitTxt:     { fontSize: 10, color: '#fff', fontWeight: '700' },

  desc:        { fontSize: 11, color: C.text3, marginBottom: 10 },

  empty:       { height: 160, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyTxt:    { fontSize: 13, color: C.text3, textAlign: 'center' },

  statsRow:    { flexDirection: 'row', borderRadius: 10, borderWidth: 1, padding: 12, marginTop: 14 },
  statItem:    { flex: 1, alignItems: 'center' },
  statLabel:   { fontSize: 11, color: C.text3, marginBottom: 4 },
  statValue:   { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  statUnit:    { fontSize: 10, fontWeight: '500', color: C.text3 },
});
