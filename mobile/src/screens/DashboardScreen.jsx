import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, SafeAreaView,
  Dimensions, StatusBar, ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMqtt } from '../MqttContext';
import { firebaseService } from '../services/firebaseService';
import HistoryDetailSheet from '../components/HistoryDetailSheet';
import WeatherDayChart from '../components/WeatherDayChart';

/* ── Icon helper ─────────────────────────────────────────────────────────── */
function Icon({ lib = 'ion', name, size = 18, color = '#4a7a5a' }) {
  if (lib === 'mci') return <MaterialCommunityIcons name={name} size={size} color={color} />;
  return <Ionicons name={name} size={size} color={color} />;
}

const { width: SW } = Dimensions.get('window');

/* ── Constants ────────────────────────────────────────────────────────────── */

const BG_COLOR    = '#f2f8f4';
const CARD_BG     = '#ffffff';
const CARD_BORDER = '#d4e8dc';
const TEXT_DARK   = '#1a3028';
const TEXT_MED    = '#4a7a5a';
// Aliases để không phải đổi hết code bên dưới
const TEXT_WHITE  = TEXT_DARK;
const TEXT_DIM    = TEXT_MED;

const DEFAULT_MAX_WATER_DIST = 20;

const VN_DAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/* ── Aggregation helpers (inline, no import needed) ───────────────────────── */

function getDateKeys(numDays) {
  return Array.from({ length: numDays }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (numDays - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

function norm(raw) {
  return {
    ts:          Number(raw.ts || raw.timestamp || 0),
    temperature: raw.temperature ?? raw.nhiet_do     ?? raw.temp  ?? null,
    soilHum:     raw.soilHum     ?? raw.soilMoisture ?? raw.do_am_dat ?? raw.soil ?? null,
    airHum:      raw.airHum      ?? raw.airHumidity  ?? raw.do_am_khong_khi ?? raw.humi ?? null,
    light:       raw.light       ?? raw.anh_sang     ?? raw.lux   ?? null,
    waterLevel:  raw.waterLevel  ?? raw.muc_nuoc     ?? raw.distance ?? null,
  };
}

const FIELDS = ['temperature', 'soilHum', 'airHum', 'light', 'waterLevel'];

function localDateKey(ts) {
  const d = new Date(Number(ts));
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function aggDay(entries) {
  const map = new Map();
  const todayKey = localDateKey(Date.now());
  entries.forEach((e) => {
    if (!e.ts) return;
    const key = localDateKey(e.ts);
    if (!key) return;
    const d = new Date(Number(e.ts));
    const lbl = key === todayKey
      ? 'Hôm nay'
      : `${VN_DAY[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
    if (!map.has(key)) {
      map.set(key, { label: lbl, _vals: {} });
      FIELDS.forEach((f) => { map.get(key)._vals[f] = []; });
    }
    const b = map.get(key);
    FIELDS.forEach((f) => { if (e[f] != null) b._vals[f].push(Number(e[f])); });
  });
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([dateKey, b]) => {
    const r = { time: b.label, dateKey };
    FIELDS.forEach((f) => {
      const v = b._vals[f];
      if (!v.length) { r[`${f}_min`] = null; r[`${f}_max`] = null; r[`${f}_avg`] = null; return; }
      r[`${f}_min`] = Math.round(Math.min(...v) * 10) / 10;
      r[`${f}_max`] = Math.round(Math.max(...v) * 10) / 10;
      r[`${f}_avg`] = Math.round(v.reduce((s, x) => s + x, 0) / v.length * 10) / 10;
    });
    return r;
  });
}

/* ── Hero Card ────────────────────────────────────────────────────────────── */

const VN_WEEKDAY = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

function HeroCard({ sensorData, pumpState, autoMode, maxWaterDist }) {
  const temp  = sensorData?.temperature ?? null;
  const soil  = sensorData?.soilHum     ?? null;
  const air   = sensorData?.airHum      ?? null;
  const light = sensorData?.light       ?? null;
  const wDist = sensorData?.waterLevel  ?? null;
  const maxD  = maxWaterDist ?? DEFAULT_MAX_WATER_DIST;
  const wPct  = wDist != null ? Math.max(0, Math.min(100, Math.round((1 - wDist / maxD) * 100))) : null;

  // Date: "Thứ năm, 05 Tháng 6 2026"
  const now     = new Date();
  const dateStr = `${VN_WEEKDAY[now.getDay()]}, ${String(now.getDate()).padStart(2,'0')} Tháng ${now.getMonth()+1} ${now.getFullYear()}`;

  // Condition (right of date, like "Bright and Sunny")
  const condIcon = light == null ? { lib: 'ion', name: 'cloud-outline' }
    : light < 200   ? { lib: 'ion', name: 'moon-outline' }
    : light < 1000  ? { lib: 'ion', name: 'partly-sunny-outline' }
    : light < 5000  ? { lib: 'ion', name: 'partly-sunny-outline' }
    : light < 15000 ? { lib: 'ion', name: 'sunny-outline' }
    : { lib: 'ion', name: 'sunny' };
  const condText = light == null    ? 'Đang đo...'
    : light < 200   ? 'Trong nhà / tối'
    : light < 1000  ? 'Ánh sáng yếu'
    : light < 5000  ? 'Ánh sáng vừa'
    : light < 15000 ? 'Ánh sáng tốt'
    : 'Nắng mạnh';

  // Plant health badge — solid background like the image
  const badge = soil == null
    ? { label: 'Chưa có dữ liệu', bg: '#374151',        txt: '#9ca3af' }
    : soil >= 50 && (temp == null || temp <= 35)
    ? { label: 'Cây đang ổn định',    bg: '#166534',    txt: '#bbf7d0' }
    : soil < 25
    ? { label: 'Đất rất khô — tưới gấp', bg: '#7f1d1d', txt: '#fca5a5' }
    : soil < 50
    ? { label: 'Nên tưới sớm',        bg: '#78350f',    txt: '#fde68a' }
    : temp != null && temp > 35
    ? { label: 'Nhiệt độ quá cao',    bg: '#7c2d12',    txt: '#fdba74' }
    : { label: 'Đang theo dõi',       bg: '#1e3a5f',    txt: '#93c5fd' };

  // 3 sensor tiles — value + unit on same line like image
  const tiles = [
    { lib: 'mci', icon: 'sprout',        label: 'Độ ẩm đất',
      num: soil  != null ? Math.round(soil)  : '--', unit: soil  != null ? '%'    : '' },
    { lib: 'ion', icon: 'sunny-outline', label: 'Ánh sáng',
      num: light != null ? (light >= 1000 ? `${(light/1000).toFixed(1)}k` : Math.round(light)) : '--',
      unit: light != null ? 'lux' : '' },
    { lib: 'ion', icon: 'water-outline', label: 'Độ ẩm KK',
      num: air   != null ? Math.round(air)   : '--', unit: air   != null ? '% RH' : '' },
  ];

  return (
    <ImageBackground
      source={require('../../assets/garden-bg.jpg')}
      style={hero.imgBg}
      imageStyle={{ borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}
      resizeMode="cover"
    >
      {/* Dark overlay for readability */}
      <View style={hero.overlay} />

      <View style={hero.wrap}>

      {/* Row 1: Location pill  +  notification bell */}
      <View style={hero.topRow}>
        <View style={hero.locationPill}>
          <Ionicons name="location-sharp" size={14} color="#fff" />
          <Text style={hero.locationTxt}>Smart Garden</Text>
        </View>
        <View style={hero.bell}>
          <Ionicons name="notifications-outline" size={20} color="#fff" />
        </View>
      </View>

      {/* Row 2: Date (left)  +  Condition icon+text (right) */}
      <View style={hero.row2}>
        <Text style={hero.date}>{dateStr}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon lib={condIcon.lib} name={condIcon.name} size={18} color="rgba(255,255,255,0.9)" />
          <Text style={hero.condText}>{condText}</Text>
        </View>
      </View>

      {/* Row 3: Big temperature (left)  +  plant badge (right, bottom-aligned) */}
      <View style={hero.row3}>
        <View>
          <Text style={hero.bigTemp}>
            {temp != null ? Math.round(temp) : '--'}
            <Text style={hero.degUnit}>°C</Text>
          </Text>
          <Text style={hero.subLabel}>
            {autoMode ? '🤖 Tự động' : pumpState === 'on' ? '💧 Đang tưới' : 'Nhiệt độ'}
          </Text>
        </View>

        {/* Badge — solid background, white/tinted text */}
        <View style={[hero.badge, { backgroundColor: badge.bg }]}>
          <MaterialCommunityIcons name="leaf" size={14} color={badge.txt} />
          <Text style={[hero.badgeTxt, { color: badge.txt }]}>{badge.label}</Text>
        </View>
      </View>

      {/* Row 4: 3 sensor tiles */}
      <View style={hero.tilesRow}>
        {tiles.map((t) => (
          <View key={t.label} style={hero.tile}>
            {/* Top: icon + label */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Icon lib={t.lib} name={t.icon} size={14} color="rgba(255,255,255,0.88)" />
              <Text style={hero.tileLbl}>{t.label}</Text>
            </View>
            {/* Bottom: num + unit on same row */}
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 14, gap: 4 }}>
              <Text style={hero.tileNum}>{t.num}</Text>
              {t.unit ? <Text style={hero.tileUnit}>{t.unit}</Text> : null}
            </View>
          </View>
        ))}
      </View>

      {/* Water pill */}
      {wPct != null && (
        <View style={[hero.waterPill, {
          backgroundColor: wPct >= 50 ? 'rgba(74,222,128,0.2)' : wPct >= 25 ? 'rgba(251,191,36,0.2)' : 'rgba(248,113,113,0.2)',
        }]}>
          <MaterialCommunityIcons name="water-pump" size={14}
            color={wPct >= 50 ? '#4ade80' : wPct >= 25 ? '#fbbf24' : '#f87171'} />
          <Text style={[hero.waterTxt, { color: wPct >= 50 ? '#4ade80' : wPct >= 25 ? '#fbbf24' : '#f87171', marginLeft: 6 }]}>
            Bể nước {wPct}%  ·  {wPct >= 50 ? 'Đủ nước' : wPct >= 25 ? 'Nước thấp' : 'Gần hết'}
          </Text>
        </View>
      )}

      </View>
    </ImageBackground>
  );
}

const hero = StyleSheet.create({
  imgBg:       { marginBottom: 12, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  overlay:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,25,12,0.32)', borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  wrap:        { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20 },

  topRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  locationPill:{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  locationTxt: { fontSize: 14, color: '#fff', fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  bell:        { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },

  row2:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  date:        { fontSize: 14, color: '#fff', fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  condText:    { fontSize: 14, color: '#fff', fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },

  row3:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 },
  bigTemp:     { fontSize: 80, fontWeight: '300', color: '#fff', letterSpacing: -2, lineHeight: 88, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  degUnit:     { fontSize: 40, fontWeight: '300', letterSpacing: 0 },
  subLabel:    { fontSize: 13, color: '#fff', fontWeight: '600', marginTop: 2, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },

  badge:       { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 7, maxWidth: 170 },
  badgeTxt:    { fontSize: 13, fontWeight: '600', flexShrink: 1, lineHeight: 18 },

  tilesRow:    { flexDirection: 'row', gap: 10, marginBottom: 14 },
  tile:        { flex: 1, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  tileLbl:     { fontSize: 11, color: 'rgba(255,255,255,0.88)', fontWeight: '600' },
  tileNum:     { fontSize: 26, fontWeight: '700', color: '#ffffff', letterSpacing: -0.5 },
  tileUnit:    { fontSize: 12, color: 'rgba(255,255,255,0.88)', fontWeight: '600', marginBottom: 2 },

  waterPill:   { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, flexDirection: 'row', alignItems: 'center' },
  waterTxt:    { fontSize: 13, fontWeight: '500' },
});

/* ── Frosted Glass Card ───────────────────────────────────────────────────── */

function GlassCard({ children, style }) {
  return (
    <View style={[gc.card, style]}>
      {children}
    </View>
  );
}
const gc = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderWidth: 1, borderColor: CARD_BORDER,
    borderRadius: 16, marginHorizontal: 16,
    marginBottom: 12, overflow: 'hidden',
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
});

/* ── Segmented sensor tabs (1 hàng, chia đều) ─────────────────────────────── */

function SensorSegmentBar({ sensors, activeKey, onSelect, showLabel = true }) {
  return (
    <View style={sg.bar}>
      {sensors.map((s) => {
        const active = activeKey === s.key;
        return (
          <TouchableOpacity
            key={s.key}
            style={[sg.tab, active && sg.tabActive]}
            onPress={() => onSelect(s.key)}
            activeOpacity={0.85}
          >
            <Icon
              lib={s.lib}
              name={s.icon}
              size={showLabel ? 15 : 17}
              color={active ? s.color : TEXT_MED}
            />
            {showLabel && s.label ? (
              <Text
                style={[sg.tabTxt, active && { color: s.color }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {s.label}
              </Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const sg = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 10,
    backgroundColor: '#eef4f0',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 10,
    minWidth: 0,
  },
  tabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabTxt: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT_MED,
    flexShrink: 1,
  },
});

function offsetLocalDateKey(dateKey, delta) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
  dt.setDate(dt.getDate() + delta);
  return localDateKey(dt.getTime());
}

async function loadEntriesForDate(dateKey) {
  const data = await firebaseService.getHistoryForDate(dateKey);
  if (!data) return [];
  return Object.values(data)
    .map(norm)
    .filter((e) => e.ts > 0)
    .sort((a, b) => a.ts - b.ts);
}

/* ── Biểu đồ 24h hôm nay (Apple Weather style) ───────────────────────────── */

const HOURLY_SENSORS = [
  { key: 'temperature', lib: 'mci', icon: 'thermometer',       unit: '°',  color: '#ef4444' },
  { key: 'soilHum',     lib: 'mci', icon: 'sprout',            unit: '%',  color: '#22c55e' },
  { key: 'airHum',      lib: 'ion', icon: 'water-outline',     unit: '%',  color: '#3b82f6' },
  { key: 'light',       lib: 'ion', icon: 'sunny-outline',     unit: '',   color: '#f59e0b' },
];

function TodayTrendChart({ todayEntries, yesterdayEntries, sensorData }) {
  const [activeSensor, setActiveSensor] = useState('temperature');
  const meta = HOURLY_SENSORS.find((s) => s.key === activeSensor) ?? HOURLY_SENSORS[0];
  const liveValue = sensorData?.[activeSensor] ?? null;

  return (
    <GlassCard>
      <View style={hs.header}>
        <Text style={hs.headerTitle}>📈 DIỄN BIẾN HÔM NAY</Text>
        <Text style={hs.headerSub}>Trái → phải theo giờ · Hôm qua nét đứt</Text>
      </View>

      <SensorSegmentBar
        sensors={HOURLY_SENSORS}
        activeKey={activeSensor}
        onSelect={setActiveSensor}
        showLabel={false}
      />

      <View style={hs.divider} />

      <View style={hs.chartWrap}>
        <WeatherDayChart
          selectedEntries={todayEntries}
          compareEntries={yesterdayEntries}
          sensorKey={activeSensor}
          color={meta.color}
          unit={meta.unit}
          liveValue={liveValue}
          selectedLabel="Hôm nay"
          compareLabel="Hôm qua"
          showCompare={yesterdayEntries.length > 0}
        />
      </View>
    </GlassCard>
  );
}

const hs = StyleSheet.create({
  header:     { padding: 12, paddingBottom: 4 },
  headerTitle:{ fontSize: 12, color: TEXT_DIM, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  headerSub:  { fontSize: 11, color: TEXT_DIM, opacity: 0.7, marginTop: 2, marginBottom: 6 },
  divider:    { height: 1, backgroundColor: CARD_BORDER, marginHorizontal: 12 },
  chartWrap:  { paddingHorizontal: 8, paddingBottom: 8 },
});

/* ── Daily List (lịch sử 7 ngày) ────────────────────────────────────────── */

const DAILY_SENSORS = [
  { key: 'temperature', label: 'Nhiệt độ', lib: 'mci', icon: 'thermometer',    unit: '°', color: '#ff8080' },
  { key: 'soilHum',     label: 'Đ.A Đất',  lib: 'mci', icon: 'sprout',         unit: '%', color: '#4ade80' },
  { key: 'airHum',      label: 'Đ.A KK',   lib: 'ion', icon: 'water-outline',  unit: '%', color: '#60a5fa' },
];

function RangeBar({ min, max, globalMin, globalMax, color }) {
  if (min == null || max == null) return <View style={{ width: 80 }} />;
  const range   = globalMax - globalMin || 1;
  const leftPct = (min - globalMin) / range;
  const widthPct= (max - min) / range;
  return (
    <View style={rb.track}>
      <View style={[rb.fill, { left: `${leftPct * 100}%`, width: `${Math.max(widthPct * 100, 6)}%`, backgroundColor: color }]} />
    </View>
  );
}
const rb = StyleSheet.create({
  track: { width: 80, height: 4, backgroundColor: '#ddeee5', borderRadius: 999, overflow: 'hidden', position: 'relative' },
  fill:  { position: 'absolute', top: 0, height: '100%', borderRadius: 999 },
});

function DailyList({ dailyData, onDayPress }) {
  const [activeSensor, setActiveSensor] = useState('temperature');
  const meta = DAILY_SENSORS.find((s) => s.key === activeSensor) ?? DAILY_SENSORS[0];

  const { globalMin, globalMax } = useMemo(() => {
    const allMin = dailyData.map((d) => d[`${activeSensor}_min`]).filter((v) => v != null);
    const allMax = dailyData.map((d) => d[`${activeSensor}_max`]).filter((v) => v != null);
    return {
      globalMin: allMin.length ? Math.min(...allMin) : 0,
      globalMax: allMax.length ? Math.max(...allMax) : 100,
    };
  }, [dailyData, activeSensor]);

  return (
    <GlassCard>
      {/* Header */}
      <View style={dl.header}>
        <Text style={dl.headerTitle}>📜 LỊCH SỬ 30 NGÀY QUA</Text>
        <Text style={dl.headerSub}>Thấp · Trung bình · Cao mỗi ngày · Chạm để xem chi tiết</Text>
        <SensorSegmentBar
          sensors={DAILY_SENSORS}
          activeKey={activeSensor}
          onSelect={setActiveSensor}
        />
      </View>

      <View style={dl.divider} />

      {dailyData.length === 0 ? (
        <View style={dl.empty}>
          <Text style={{ color: TEXT_DIM, fontSize: 13 }}>Chưa có dữ liệu lịch sử</Text>
        </View>
      ) : dailyData.map((day, i) => {
        const mn  = day[`${activeSensor}_min`];
        const mx  = day[`${activeSensor}_max`];
        const avg = day[`${activeSensor}_avg`];
        const openDetail = () => {
          if (!day.dateKey || !onDayPress) return;
          onDayPress({ dateKey: day.dateKey, sensorKey: activeSensor, dayStats: day });
        };
        return (
          <View key={day.dateKey ?? i}>
            {i > 0 && <View style={dl.rowDivider} />}
            <TouchableOpacity
              style={dl.row}
              onPress={openDetail}
              activeOpacity={0.65}
              disabled={!day.dateKey}
            >
              <Text style={dl.dayName}>{day.time}</Text>
              <Text style={[dl.avg, { color: meta.color }]}>
                {avg != null ? `${avg.toFixed(0)}${meta.unit}` : '--'}
              </Text>
              <Text style={dl.minVal}>{mn != null ? `${mn.toFixed(0)}${meta.unit}` : '--'}</Text>
              <RangeBar min={mn} max={mx} globalMin={globalMin} globalMax={globalMax} color={meta.color} />
              <Text style={dl.maxVal}>{mx != null ? `${mx.toFixed(0)}${meta.unit}` : '--'}</Text>
              <Ionicons name="chevron-forward" size={16} color={TEXT_DIM} style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>
        );
      })}
    </GlassCard>
  );
}

const dl = StyleSheet.create({
  header:     { padding: 12, paddingBottom: 4 },
  headerTitle:{ fontSize: 12, color: TEXT_DIM, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  headerSub:  { fontSize: 11, color: TEXT_DIM, opacity: 0.7, marginTop: 2, marginBottom: 4 },
  divider:    { height: 1, backgroundColor: CARD_BORDER, marginHorizontal: 12 },
  rowDivider: { height: 1, backgroundColor: '#edf5f0', marginHorizontal: 16 },
  row:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  dayName:    { flex: 1, fontSize: 15, fontWeight: '600', color: TEXT_WHITE },
  avg:        { fontSize: 14, fontWeight: '700', width: 44, textAlign: 'right', marginRight: 10 },
  minVal:     { fontSize: 13, color: TEXT_DIM, width: 32, textAlign: 'right', marginRight: 6 },
  maxVal:     { fontSize: 13, color: TEXT_WHITE, width: 32, textAlign: 'left', marginLeft: 6, fontWeight: '600' },
  empty:      { padding: 20, alignItems: 'center' },
});

/* ── Water Card ───────────────────────────────────────────────────────────── */

function WaterCard({ sensorData, maxWaterDist }) {
  const wDist = sensorData?.waterLevel ?? null;
  const maxD  = maxWaterDist ?? DEFAULT_MAX_WATER_DIST;
  const pct   = wDist != null ? Math.max(0, Math.min(100, Math.round((1 - wDist / maxD) * 100))) : null;
  const status = wDist == null ? null
    : wDist <= maxD * 0.5 ? { label: '✓ Đủ nước',   color: '#4ade80' }
    : wDist <= maxD       ? { label: '⚠ Nước thấp', color: '#fbbf24' }
    : { label: '✗ Hết nước', color: '#f87171' };

  if (pct == null) return null;

  const barColor = status?.color ?? '#fff';

  return (
    <GlassCard>
      <View style={wc.row}>
        <Text style={{ fontSize: 24 }}>🪣</Text>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={wc.label}>Bể nước</Text>
            <Text style={[wc.status, { color: barColor }]}>{status?.label}</Text>
          </View>
          <View style={wc.track}>
            <View style={[wc.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
            <Text style={wc.sub}>{wDist != null ? `${wDist.toFixed(0)} cm` : '--'}</Text>
            <Text style={[wc.pct, { color: barColor }]}>{pct}%</Text>
          </View>
        </View>
      </View>
    </GlassCard>
  );
}

const wc = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', padding: 14 },
  label: { fontSize: 14, fontWeight: '700', color: TEXT_WHITE },
  status:{ fontSize: 13, fontWeight: '700' },
  track: { height: 8, backgroundColor: '#e8f5ed', borderRadius: 999, overflow: 'hidden' },
  fill:  { height: '100%', borderRadius: 999 },
  sub:   { fontSize: 11, color: TEXT_DIM },
  pct:   { fontSize: 13, fontWeight: '800' },
});

/* ── Detail Cards (2-col grid, weather-app style) ────────────────────────── */

function DetailCards({ sensorData, dailyData, maxWaterDist }) {
  const temp  = sensorData?.temperature ?? null;
  const soil  = sensorData?.soilHum     ?? null;
  const air   = sensorData?.airHum      ?? null;
  const light = sensorData?.light       ?? null;
  const wDist = sensorData?.waterLevel  ?? null;
  const maxD  = maxWaterDist ?? DEFAULT_MAX_WATER_DIST;
  const wPct  = wDist != null ? Math.max(0, Math.min(100, Math.round((1 - wDist / maxD) * 100))) : null;

  const avg30 = useMemo(() => {
    if (!dailyData.length) return {};
    const out = {};
    ['temperature', 'soilHum', 'airHum'].forEach((k) => {
      const vals = dailyData.map((d) => d[`${k}_avg`]).filter((v) => v != null);
      out[k] = vals.length ? +(vals.reduce((s, x) => s + x, 0) / vals.length).toFixed(1) : null;
    });
    return out;
  }, [dailyData]);

  const tempDelta = temp != null && avg30.temperature != null
    ? +(temp - avg30.temperature).toFixed(1) : null;

  const soilStatus = soil == null ? null
    : soil < 25 ? { emoji: '🔴', text: 'Đất đang khô\ncần tưới ngay',  color: '#f97316' }
    : soil < 50 ? { emoji: '🟡', text: 'Đất hơi khô\nnên tưới sớm',   color: '#fbbf24' }
    : soil < 75 ? { emoji: '🟢', text: 'Đất đủ ẩm\nchưa cần tưới',   color: '#4ade80' }
    :             { emoji: '🔵', text: 'Đất quá ướt\ntạm dừng tưới',  color: '#60a5fa' };

  const lightLevel = light == null ? null
    : light < 200   ? { label: 'Rất tối',       pct: 4,  color: '#818cf8' }
    : light < 1000  ? { label: 'Ánh sáng yếu',  pct: 20, color: '#a78bfa' }
    : light < 5000  ? { label: 'Ánh sáng vừa',  pct: 45, color: '#fbbf24' }
    : light < 15000 ? { label: 'Ánh sáng tốt',  pct: 70, color: '#fb923c' }
    :                 { label: 'Rất sáng',       pct: 94, color: '#fef3c7' };

  const airStatus = air == null ? null
    : air < 40 ? 'Không khí khô ráo'
    : air < 60 ? 'Độ ẩm dễ chịu'
    : air < 75 ? 'Không khí hơi ẩm'
    : 'Không khí rất ẩm';

  const wColor = wPct == null ? TEXT_WHITE
    : wPct >= 50 ? '#4ade80'
    : wPct >= 25 ? '#fbbf24'
    : '#f87171';
  const wLabel = wPct == null ? null
    : wPct >= 50 ? 'Không cần lo lắng'
    : wPct >= 25 ? 'Chú ý, mực nước thấp'
    : 'Gần hết nước, cần đổ ngay';

  const HALF = (SW - 16 * 2 - 8) / 2;

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 12 }}>

      {/* ─ Row 1: Nhiệt độ vs TB  +  Tình trạng đất ─ */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <View style={[dcs.card, { width: HALF }]}>
          <View style={dcs.labelRow}><MaterialCommunityIcons name="thermometer" size={13} color={TEXT_DIM} /><Text style={dcs.label}> NHIỆT ĐỘ</Text></View>
          <Text style={dcs.bigNum}>{temp != null ? `${Math.round(temp)}°` : '--'}</Text>
          {tempDelta != null && (
            <Text style={[dcs.delta, { color: tempDelta > 0 ? '#f97316' : '#60a5fa' }]}>
              {tempDelta > 0 ? `▲ +${tempDelta}°` : `▼ ${tempDelta}°`}
            </Text>
          )}
          <Text style={dcs.sub}>
            {avg30.temperature != null ? `so với TB ${avg30.temperature}°` : 'so với TB 30 ngày'}
          </Text>
        </View>

        <View style={[dcs.card, { width: HALF }]}>
          <View style={dcs.labelRow}><MaterialCommunityIcons name="sprout" size={13} color={TEXT_DIM} /><Text style={dcs.label}> TÌNH TRẠNG ĐẤT</Text></View>
          <Text style={dcs.bigNum}>{soil != null ? `${Math.round(soil)}%` : '--'}</Text>
          {soilStatus && (
            <Text style={[dcs.sub, { color: soilStatus.color, marginTop: 6 }]}>
              {soilStatus.text}
            </Text>
          )}
        </View>
      </View>

      {/* ─ Row 2: Ánh sáng  +  Độ ẩm không khí ─ */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <View style={[dcs.card, { width: HALF }]}>
          <View style={dcs.labelRow}><Ionicons name="sunny-outline" size={13} color={TEXT_DIM} /><Text style={dcs.label}> ÁNH SÁNG</Text></View>
          <Text style={dcs.bigNum}>
            {light != null ? (light > 999 ? `${(light / 1000).toFixed(1)}k` : `${Math.round(light)}`) : '--'}
          </Text>
          <Text style={[dcs.sub, { marginBottom: 10 }]}>lux</Text>
          {lightLevel && (
            <>
              {/* Gradient scale bar */}
              <View style={{ height: 6, borderRadius: 999, overflow: 'hidden', marginBottom: 6 }}>
                <LinearGradient
                  colors={['#1e1b4b', '#7c3aed', '#fbbf24', '#fef3c7']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ flex: 1 }}
                />
              </View>
              {/* Dot marker */}
              <View style={{ height: 8, position: 'relative' }}>
                <View style={[dcs.scaleDot, { left: `${lightLevel.pct}%` }]} />
              </View>
              <Text style={[dcs.sub, { color: lightLevel.color, fontWeight: '600' }]}>
                {lightLevel.label}
              </Text>
            </>
          )}
        </View>

        <View style={[dcs.card, { width: HALF }]}>
          <View style={dcs.labelRow}><Ionicons name="water-outline" size={13} color={TEXT_DIM} /><Text style={dcs.label}> ĐỘ ẨM KK</Text></View>
          <Text style={dcs.bigNum}>{air != null ? `${Math.round(air)}%` : '--'}</Text>
          {airStatus && <Text style={[dcs.sub, { marginTop: 6 }]}>{airStatus}</Text>}
          {avg30.airHum != null && (
            <Text style={[dcs.sub, { opacity: 0.6, marginTop: 4 }]}>TB: {avg30.airHum}%</Text>
          )}
        </View>
      </View>

      {/* ─ Row 3: Mực nước bể (full width, ring gauge) ─ */}
      {wPct != null && (
        <View style={[dcs.card, { marginBottom: 8 }]}>
          <View style={dcs.labelRow}><MaterialCommunityIcons name="water-pump" size={13} color={TEXT_DIM} /><Text style={dcs.label}> MỰC NƯỚC BỂ</Text></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
            {/* Ring gauge */}
            <View style={{ width: 78, height: 78, alignItems: 'center', justifyContent: 'center' }}>
              <View style={[dcs.ring, { borderColor: '#ddeee5' }]} />
              <View style={[dcs.ring, {
                position: 'absolute',
                borderTopColor:    wColor,
                borderRightColor:  wPct > 25 ? wColor : 'transparent',
                borderBottomColor: wPct > 50 ? wColor : 'transparent',
                borderLeftColor:   wPct > 75 ? wColor : 'transparent',
                transform: [{ rotate: '-45deg' }],
              }]} />
              <Text style={{ position: 'absolute', fontSize: 17, fontWeight: '800', color: TEXT_WHITE }}>
                {wPct}%
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 22, fontWeight: '300', color: wColor, marginBottom: 4 }}>
                {wPct >= 50 ? 'Đủ nước' : wPct >= 25 ? 'Nước thấp' : 'Gần hết'}
              </Text>
              <Text style={[dcs.sub, { lineHeight: 17 }]}>{wLabel}</Text>
              <View style={{ height: 5, backgroundColor: '#e8f5ed', borderRadius: 999, marginTop: 10, overflow: 'hidden' }}>
                <View style={{ width: `${wPct}%`, height: '100%', backgroundColor: wColor, borderRadius: 999 }} />
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ─ Row 4: So sánh độ ẩm đất vs không khí (full width) ─ */}
      {soil != null && air != null && (
        <View style={dcs.card}>
          <View style={dcs.labelRow}><Ionicons name="bar-chart-outline" size={13} color={TEXT_DIM} /><Text style={dcs.label}> SO SÁNH ĐỘ ẨM</Text></View>
          {[
            { lib: 'mci', icon: 'sprout',        label: 'Độ ẩm đất',       val: soil, color: '#4ade80' },
            { lib: 'ion', icon: 'water-outline', label: 'Độ ẩm không khí', val: air,  color: '#60a5fa' },
          ].map((row) => (
            <View key={row.label} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Icon lib={row.lib} name={row.icon} size={14} color={row.color} />
                  <Text style={{ fontSize: 13, color: TEXT_WHITE }}>{row.label}</Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: row.color }}>
                  {Math.round(row.val)}%
                </Text>
              </View>
              <View style={{ height: 8, backgroundColor: '#e8f5ed', borderRadius: 999, overflow: 'hidden' }}>
                <View style={{ width: `${Math.min(row.val, 100)}%`, height: '100%', backgroundColor: row.color, borderRadius: 999 }} />
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const dcs = StyleSheet.create({
  card:     { backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BORDER, borderRadius: 16, padding: 14, overflow: 'hidden', shadowColor: '#166534', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  label:    { fontSize: 11, color: TEXT_DIM, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  bigNum:   { fontSize: 36, fontWeight: '200', color: TEXT_WHITE, lineHeight: 40 },
  delta:    { fontSize: 13, fontWeight: '700', marginTop: 4 },
  sub:      { fontSize: 12, color: TEXT_DIM },
  scaleDot: { position: 'absolute', top: -3, width: 14, height: 14, borderRadius: 7, backgroundColor: TEXT_DARK, transform: [{ translateX: -7 }] },
  ring:     { position: 'absolute', width: 78, height: 78, borderRadius: 39, borderWidth: 7, borderColor: 'transparent' },
});

/* ── Sensor Mini Row ───────────────────────────────────────────────────────── */

function SensorRow({ sensorData }) {
  const items = [
    { icon: '🌡️', label: 'Nhiệt độ', value: sensorData?.temperature, unit: '°C' },
    { icon: '🌱', label: 'Đ.A Đất',   value: sensorData?.soilHum,     unit: '%' },
    { icon: '💧', label: 'Đ.A KK',    value: sensorData?.airHum,      unit: '%' },
    { icon: '☀️', label: 'Ánh sáng',  value: sensorData?.light,       unit: 'lux' },
  ];

  return (
    <GlassCard>
      <View style={sr.row}>
        {items.map((item) => (
          <View key={item.label} style={sr.item}>
            <Text style={sr.icon}>{item.icon}</Text>
            <Text style={sr.val}>
              {item.value != null ? `${typeof item.value === 'number' ? item.value.toFixed(1) : item.value}` : '--'}
            </Text>
            <Text style={sr.unit}>{item.unit}</Text>
            <Text style={sr.label}>{item.label}</Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

const sr = StyleSheet.create({
  row:   { flexDirection: 'row', padding: 14, justifyContent: 'space-around' },
  item:  { alignItems: 'center', gap: 2 },
  icon:  { fontSize: 22 },
  val:   { fontSize: 18, fontWeight: '700', color: TEXT_WHITE, letterSpacing: -0.5 },
  unit:  { fontSize: 10, color: TEXT_DIM },
  label: { fontSize: 10, color: TEXT_DIM },
});

/* ── Alert Strip ───────────────────────────────────────────────────────────── */

function buildAlerts(sensorData, thresholds, maxWaterDist) {
  if (!sensorData) return [];
  const {
    minSoil   = 35,
    maxTemp   = 35,
    minAirHum = 50,
    maxLux    = 20000,
  } = thresholds || {};
  const maxWD = maxWaterDist ?? DEFAULT_MAX_WATER_DIST;

  const alerts = [];

  const soil = sensorData.soilHum;
  if (typeof soil === 'number' && soil < minSoil) {
    const gap = minSoil - soil;
    alerts.push({
      id: 'soil-dry', icon: '🌱', severity: gap >= 10 ? 'danger' : 'warning',
      title: 'Đất đang khô',
      body: `Độ ẩm đất ${soil.toFixed(0)}% thấp hơn mức tối thiểu ${minSoil}% (thiếu ${gap.toFixed(0)}%). Cân nhắc tưới ngay.`,
    });
  }

  const temp = sensorData.temperature;
  if (typeof temp === 'number' && temp > maxTemp) {
    const gap = (temp - maxTemp).toFixed(1);
    alerts.push({
      id: 'temp-high', icon: '🌡️', severity: Number(gap) >= 5 ? 'danger' : 'warning',
      title: 'Nhiệt độ cao',
      body: `Nhiệt độ ${temp.toFixed(1)}°C vượt ngưỡng ${maxTemp}°C (+${gap}°C). Thông thoáng hoặc che nắng cho vườn.`,
    });
  }

  const air = sensorData.airHum;
  if (typeof air === 'number' && air < minAirHum) {
    const gap = minAirHum - air;
    alerts.push({
      id: 'air-dry', icon: '💨', severity: gap >= 10 ? 'danger' : 'warning',
      title: 'Không khí khô',
      body: `Độ ẩm không khí ${air.toFixed(0)}% dưới mức tối thiểu ${minAirHum}% (thiếu ${gap.toFixed(0)}%). Cân nhắc phun sương.`,
    });
  }

  const light = sensorData.light;
  if (typeof light === 'number' && light > maxLux) {
    const lbl = light >= 1000 ? `${(light / 1000).toFixed(1)}k` : `${Math.round(light)}`;
    alerts.push({
      id: 'light-high', icon: '☀️', severity: light > maxLux * 1.2 ? 'danger' : 'warning',
      title: 'Ánh sáng quá mạnh',
      body: `Cường độ sáng ${lbl} lux vượt ngưỡng ${(maxLux / 1000).toFixed(0)}k lux. Che bớt ánh nắng trực tiếp.`,
    });
  }

  const wDist = sensorData.waterLevel;
  if (typeof wDist === 'number') {
    const pct = Math.max(0, Math.min(100, Math.round((1 - wDist / maxWD) * 100)));
    if (pct < 20) {
      alerts.push({
        id: 'water-low', icon: '🪣', severity: pct < 10 ? 'danger' : 'warning',
        title: 'Mực nước bể thấp',
        body: `Bể chứa còn ${pct}% — ${pct < 10 ? 'gần hết nước, cần đổ ngay để bơm hoạt động' : 'mực nước thấp, cần bổ sung sớm'}.`,
      });
    }
  }

  return alerts;
}

const ALERT_COLORS = {
  danger:  { bg: '#fef2f2', border: '#fca5a5', dot: '#ef4444' },
  warning: { bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b' },
};

function AlertStrip({ sensorData, maxWaterDist }) {
  const [thresholds, setThresholds] = useState(null);

  useEffect(() => {
    const unsub = firebaseService.subscribeDeployedConfig((cfg) => {
      setThresholds({
        minSoil:   cfg.minSoil   ?? cfg.do_am_dat_min,
        maxTemp:   cfg.maxTemp   ?? cfg.nhiet_do_max,
        minAirHum: cfg.minAirHum ?? cfg.do_am_kk_min,
        maxLux:    cfg.maxLux    ?? cfg.anh_sang_max,
      });
    });
    return unsub;
  }, []);

  const alerts = useMemo(
    () => buildAlerts(sensorData, thresholds, maxWaterDist),
    [sensorData, thresholds, maxWaterDist],
  );

  if (!alerts.length) {
    return (
      <GlassCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 }}>
          <Text style={{ fontSize: 22 }}>✅</Text>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT_WHITE }}>Mọi thứ đều ổn</Text>
            <Text style={{ fontSize: 12, color: TEXT_DIM, marginTop: 2 }}>
              Các chỉ số môi trường trong ngưỡng an toàn
            </Text>
          </View>
        </View>
      </GlassCard>
    );
  }

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
        <Text style={{ fontSize: 12, color: TEXT_DIM, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          🔔 CẢNH BÁO MÔI TRƯỜNG
        </Text>
        <View style={{ backgroundColor: alerts.some(a => a.severity === 'danger') ? '#ef4444' : '#fbbf24', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>{alerts.length}</Text>
        </View>
      </View>

      {alerts.map((alert) => {
        const C2 = ALERT_COLORS[alert.severity];
        return (
          <View
            key={alert.id}
            style={{
              backgroundColor: C2.bg,
              borderWidth: 1, borderColor: C2.border,
              borderRadius: 14, padding: 14, marginBottom: 8,
              flexDirection: 'row', alignItems: 'flex-start', gap: 12,
            }}
          >
            {/* Dot indicator */}
            <View style={{ marginTop: 3 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C2.dot }} />
            </View>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Text style={{ fontSize: 16 }}>{alert.icon}</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT_WHITE }}>{alert.title}</Text>
                <View style={{ marginLeft: 'auto', backgroundColor: C2.dot + '33', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: C2.dot, textTransform: 'uppercase' }}>
                    {alert.severity === 'danger' ? 'Nguy hiểm' : 'Chú ý'}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 19 }}>{alert.body}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ── Main Screen ───────────────────────────────────────────────────────────── */

export default function DashboardScreen() {
  const { sensorData, history, setHistory } = useMqtt();
  const [refreshing,    setRefreshing]    = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [maxWaterDist,  setMaxWaterDist]  = useState(DEFAULT_MAX_WATER_DIST);
  const [todayEntries, setTodayEntries] = useState([]);
  const [yesterdayEntries, setYesterdayEntries] = useState([]);
  const [dailyData,     setDailyData]     = useState([]);
  const [historyDetail, setHistoryDetail] = useState(null);

  // Load maxWaterDistance from storage
  useEffect(() => {
    (async () => {
      try {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        const v = await AsyncStorage.getItem('iot_max_water_distance');
        if (v) setMaxWaterDist(Number(v));
      } catch {}
    })();
  }, []);

  const loadChartData = useCallback(async () => {
    try {
      const todayKey = localDateKey(Date.now());
      const yesterdayKey = offsetLocalDateKey(todayKey, -1);

      const [today, yesterday] = await Promise.all([
        loadEntriesForDate(todayKey),
        loadEntriesForDate(yesterdayKey),
      ]);
      setTodayEntries(today);
      setYesterdayEntries(yesterday);

      // Daily: last 30 days
      const keys     = getDateKeys(30);
      const entries30 = [];
      await Promise.all(keys.map(async (dk) => {
        const data = await firebaseService.getHistoryForDate(dk);
        if (data) Object.values(data).forEach((raw) => {
          if (raw?.ts) entries30.push(norm(raw));
        });
      }));
      entries30.sort((a, b) => a.ts - b.ts);
      setDailyData(aggDay(entries30));
    } catch (e) {
      console.warn('[Dashboard] loadChartData', e.message);
    }
  }, []);

  useEffect(() => {
    loadChartData().finally(() => setInitialLoading(false));
  }, [loadChartData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadChartData();
    setRefreshing(false);
  }, [loadChartData]);

  const { pumpState, autoMode } = useMqtt();

  if (initialLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG_COLOR, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={{ color: TEXT_MED, marginTop: 12, fontSize: 14 }}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG_COLOR }}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#22c55e"
            />
          }
        >
          {/* Hero */}
          <HeroCard
            sensorData={sensorData}
            pumpState={pumpState}
            autoMode={autoMode}
            maxWaterDist={maxWaterDist}
          />

          {/* Hourly strip */}
          <TodayTrendChart
            todayEntries={todayEntries}
            yesterdayEntries={yesterdayEntries}
            sensorData={sensorData}
          />

          {/* Lịch sử 30 ngày qua */}
          <DailyList
            dailyData={dailyData}
            onDayPress={(payload) => setHistoryDetail(payload)}
          />

          {/* Detail cards: nhiệt độ, đất, ánh sáng, độ ẩm KK, mực nước, so sánh */}
          <DetailCards
            sensorData={sensorData}
            dailyData={dailyData}
            maxWaterDist={maxWaterDist}
          />

          {/* Cảnh báo môi trường */}
          <AlertStrip sensorData={sensorData} maxWaterDist={maxWaterDist} />

          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>

      <HistoryDetailSheet
        visible={!!historyDetail}
        dateKey={historyDetail?.dateKey}
        sensorKey={historyDetail?.sensorKey}
        dayStats={historyDetail?.dayStats}
        dailyData={dailyData}
        onClose={() => setHistoryDetail(null)}
      />
    </View>
  );
}
