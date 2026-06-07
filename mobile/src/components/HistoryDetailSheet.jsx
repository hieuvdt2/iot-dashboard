import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, Modal, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { firebaseService } from '../services/firebaseService';
import { normalizeSensorPayload } from '../utils/normalizeSensor';
import WeatherDayChart from './WeatherDayChart';
import { DEFAULT_TANK_FULL_DISTANCE, WATER_CALIBRATION_KEY, waterDistanceToPercent } from '../utils/waterLevel';
import AsyncStorage from '@react-native-async-storage/async-storage';
const VN_WEEKDAY = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
const VN_DAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const OVERLAY_DAYS = 1;
const STRIP_RADIUS = 3;
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateKey(dateKey) {
  if (!dateKey || !DATE_KEY_RE.test(dateKey)) return null;
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toMs(ts) {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n < 1e12 ? n * 1000 : n;
}

function safeNum(v, fallback = null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

const SENSOR_LIST = [
  { key: 'temperature', label: 'Nhiệt độ', unit: '°C', lib: 'mci', icon: 'thermometer', color: '#ef4444' },
  { key: 'soilHum',     label: 'Đ.A đất',  unit: '%',  lib: 'mci', icon: 'sprout',        color: '#22c55e' },
  { key: 'airHum',      label: 'Đ.A KK',   unit: '%',  lib: 'ion', icon: 'water-outline', color: '#3b82f6' },
  { key: 'light',       label: 'Ánh sáng', unit: 'lux', lib: 'ion', icon: 'sunny-outline', color: '#f59e0b' },
  { key: 'waterLevel',  label: 'Mực nước bể', unit: '%', lib: 'ion', icon: 'water',         color: '#06b6d4', isWaterLevel: true },
];

const SENSORS = Object.fromEntries(SENSOR_LIST.map((s) => [s.key, s]));

const SENSOR_INFO = {
  temperature: 'Nhiệt độ đo mức nóng lạnh quanh khu vực trồng. Theo dõi liên tục giúp phát hiện sớm khi môi trường quá nóng hoặc quá lạnh so với nhu cầu của cây.',
  soilHum: 'Độ ẩm đất cho biết lượng nước còn trong đất. Giá trị thấp kéo dài có thể khiến cây thiếu nước; giá trị quá cao có thể gây úng rễ.',
  airHum: 'Độ ẩm không khí ảnh hưởng đến quá trình thoát hơi nước của lá. Không khí khô làm cây mất nước nhanh hơn.',
  light: 'Cường độ ánh sáng (lux) phản ánh lượng sáng cây nhận được trong ngày, hỗ trợ đánh giá vị trí đặt cây và che chắn.',
  waterLevel: 'Mực nước bể hiển thị theo % so với dung tích bể (100% = đầy, 0% = gần cạn).',
};

function Icon({ lib, name, size, color }) {
  return lib === 'mci'
    ? <MaterialCommunityIcons name={name} size={size} color={color} />
    : <Ionicons name={name} size={size} color={color} />;
}

function offsetDateKey(dateKey, delta) {
  const d = parseDateKey(dateKey);
  if (!d) return todayKey();
  d.setDate(d.getDate() + delta);
  return formatDateKey(d);
}

function buildDateStrip(centerKey) {
  const center = parseDateKey(centerKey) ? centerKey : todayKey();
  return Array.from({ length: STRIP_RADIUS * 2 + 1 }, (_, i) =>
    offsetDateKey(center, i - STRIP_RADIUS),
  );
}

function formatDateLong(dateKey) {
  const d = parseDateKey(dateKey);
  if (!d) return '';
  const today = todayKey();
  if (dateKey === today) return 'Hôm nay';
  return `${VN_WEEKDAY[d.getDay()]}, ngày ${d.getDate()} tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
}

function dayShortLabel(dateKey) {
  const today = todayKey();
  if (dateKey === today) return 'Hôm nay';
  const d = parseDateKey(dateKey);
  if (!d) return '';
  return `${VN_DAY_SHORT[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

function prevDateKey(dateKey) {
  return offsetDateKey(dateKey, -1);
}

function normRaw(raw) {
  const n = normalizeSensorPayload(raw);
  return { ts: toMs(raw.ts || raw.timestamp), ...n };
}


const DEFAULT_TANK_FULL_DIST = DEFAULT_TANK_FULL_DISTANCE;

function toSensorDisplayValue(val, sensorKey, maxWaterDist, tankFullDist) {
  if (val == null) return null;
  if (sensorKey === 'waterLevel') {
    return waterDistanceToPercent(val, maxWaterDist, tankFullDist ?? DEFAULT_TANK_FULL_DIST);
  }
  return val;
}

function dayAvg(entries, sensorKey, maxWaterDist, tankFullDist) {
  const vals = entries
    .map((e) => toSensorDisplayValue(safeNum(e[sensorKey]), sensorKey, maxWaterDist, tankFullDist))
    .filter((v) => v != null);
  if (!vals.length) return null;
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 10) / 10;
}

function dayMinMax(entries, sensorKey, maxWaterDist, tankFullDist) {
  const vals = entries
    .map((e) => toSensorDisplayValue(safeNum(e[sensorKey]), sensorKey, maxWaterDist, tankFullDist))
    .filter((v) => v != null);
  if (!vals.length) return { min: null, max: null };
  return {
    min: Math.round(Math.min(...vals) * 10) / 10,
    max: Math.round(Math.max(...vals) * 10) / 10,
  };
}

function buildCompareIntro(selectedLabel, avg, yesterdayAvg, unit) {
  if (avg == null || yesterdayAvg == null) return null;
  const diff = +(avg - yesterdayAvg).toFixed(1);
  if (Math.abs(diff) <= 1) {
    return `Mức trung bình ${selectedLabel.toLowerCase()} tương tự hôm qua (${yesterdayAvg}${unit}).`;
  }
  if (diff > 0) {
    return `Mức trung bình ${selectedLabel.toLowerCase()} cao hơn hôm qua khoảng ${diff}${unit}.`;
  }
  return `Mức trung bình ${selectedLabel.toLowerCase()} thấp hơn hôm qua khoảng ${Math.abs(diff)}${unit}.`;
}

function statHint(dayStats, key, unit) {
  const avg = safeNum(dayStats?.[`${key}_avg`]);
  const mn = safeNum(dayStats?.[`${key}_min`]);
  const mx = safeNum(dayStats?.[`${key}_max`]);
  if (avg == null) return 'Chưa có dữ liệu';
  if (mn != null && mx != null) return `${mn}–${mx}${unit}`;
  return `TB ${avg}${unit}`;
}

function DateStrip({ selectedKey, onSelect }) {
  const strip = useMemo(() => buildDateStrip(selectedKey), [selectedKey]);

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.stripRow}
      >
        {strip.map((dk) => {
          const d = parseDateKey(dk);
          if (!d) return null;
          const on = dk === selectedKey;
          const today = todayKey();
          const isToday = dk === today;
          return (
            <TouchableOpacity
              key={dk}
              style={s.stripItem}
              onPress={() => onSelect(dk)}
              activeOpacity={0.75}
            >
              <Text style={[s.stripDow, on && s.stripDowOn]}>
                {isToday ? 'Nay' : VN_DAY_SHORT[d.getDay()]}
              </Text>
              <View style={[s.stripCircle, on && s.stripCircleOn]}>
                <Text style={[s.stripDate, on && s.stripDateOn]}>{d.getDate()}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <Text style={s.stripSubtitle}>{formatDateLong(selectedKey)}</Text>
    </>
  );
}

function SensorSelect({ value, onChange, dayStats }) {
  const [open, setOpen] = useState(false);
  const meta = SENSORS[value] ?? SENSORS.temperature;

  return (
    <>
      <TouchableOpacity style={s.select} onPress={() => setOpen(true)} activeOpacity={0.75}>
        <View style={[s.selectIcon, { backgroundColor: meta.color + '15' }]}>
          <Icon lib={meta.lib} name={meta.icon} size={20} color={meta.color} />
        </View>
        <View style={s.selectBody}>
          <Text style={s.selectHint}>Thông số</Text>
          <Text style={[s.selectValue, { color: meta.color }]}>{meta.label}</Text>
        </View>
        <Ionicons name="chevron-down" size={20} color="#8ab49a" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={s.sheetOverlay}>
          <Pressable style={s.overlay} onPress={() => setOpen(false)} />
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Chọn thông số</Text>
            {SENSOR_LIST.map((item, i) => {
              const selected = item.key === value;
              const hint = statHint(dayStats, item.key, item.unit);
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[s.sheetRow, i > 0 && s.sheetRowBorder]}
                  onPress={() => { onChange(item.key); setOpen(false); }}
                  activeOpacity={0.7}
                >
                  <View style={[s.sheetIcon, { backgroundColor: item.color + '15' }]}>
                    <Icon lib={item.lib} name={item.icon} size={22} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.sheetLabel, selected && { color: item.color }]}>{item.label}</Text>
                    <Text style={s.sheetSub}>{hint}</Text>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={22} color={item.color} />}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={s.sheetCancel} onPress={() => setOpen(false)}>
              <Text style={s.sheetCancelTxt}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function lookupDayStats(dailyData, dateKey, entries, sensorKey, maxWaterDist, tankFullDist) {
  const found = dailyData?.find((d) => d.dateKey === dateKey);
  if (found && sensorKey !== 'waterLevel') return found;
  const range = dayMinMax(entries, sensorKey, maxWaterDist, tankFullDist);
  const avg = dayAvg(entries, sensorKey, maxWaterDist, tankFullDist);
  return {
    dateKey,
    [`${sensorKey}_avg`]: avg,
    [`${sensorKey}_min`]: safeNum(range.min),
    [`${sensorKey}_max`]: safeNum(range.max),
  };
}

export default function HistoryDetailSheet({
  visible, dateKey, sensorKey, dailyData, onClose,
}) {
  const [activeSensor, setActiveSensor] = useState(sensorKey ?? 'temperature');
  const [selectedDateKey, setSelectedDateKey] = useState(() =>
    parseDateKey(dateKey) ? dateKey : todayKey(),
  );
  const [loading, setLoading] = useState(true);
  const [multiDayData, setMultiDayData] = useState({});
  const [maxWaterDist, setMaxWaterDist] = useState(null);
  const [tankFullDist, setTankFullDist] = useState(null);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(WATER_CALIBRATION_KEY),
      AsyncStorage.getItem('iot_max_water_distance'),
      AsyncStorage.getItem('iot_tank_full_distance'),
    ])
      .then(([calibV, emptyV, fullV]) => {
        if (calibV !== 'true') return;
        if (emptyV) setMaxWaterDist(Number(emptyV));
        if (fullV) setTankFullDist(Number(fullV));
      })
      .catch(() => {});
  }, []);

  const effectiveDateKey = useMemo(
    () => (parseDateKey(selectedDateKey) ? selectedDateKey : todayKey()),
    [selectedDateKey],
  );

  useEffect(() => {
    if (visible) {
      setActiveSensor(sensorKey ?? 'temperature');
      setSelectedDateKey(parseDateKey(dateKey) ? dateKey : todayKey());
    }
  }, [visible, sensorKey, dateKey]);

  useEffect(() => {
    if (!visible || !parseDateKey(effectiveDateKey)) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const keys = new Set();
        for (let i = OVERLAY_DAYS; i >= 0; i -= 1) {
          keys.add(offsetDateKey(effectiveDateKey, -i));
        }
        keys.add(prevDateKey(effectiveDateKey));

        const results = await Promise.all(
          [...keys].map(async (dk) => {
            const raw = await firebaseService.getHistoryForDate(dk);
            const list = raw
              ? Object.values(raw).map(normRaw).filter((e) => e.ts > 0)
              : [];
            list.sort((a, b) => a.ts - b.ts);
            return [dk, list];
          }),
        );
        if (!cancelled) {
          setMultiDayData(Object.fromEntries(results));
        }
      } catch (e) {
        console.warn('[HistoryDetail]', e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [visible, effectiveDateKey]);

  const meta = SENSORS[activeSensor] ?? SENSORS.temperature;
  const entries = useMemo(
    () => multiDayData[effectiveDateKey] ?? [],
    [multiDayData, effectiveDateKey],
  );
  const yesterdayKey = prevDateKey(effectiveDateKey);
  const yesterdayEntries = useMemo(
    () => multiDayData[yesterdayKey] ?? [],
    [multiDayData, yesterdayKey],
  );

  const activeDayStats = useMemo(
    () => lookupDayStats(dailyData, effectiveDateKey, entries, activeSensor, maxWaterDist, tankFullDist),
    [dailyData, effectiveDateKey, entries, activeSensor, maxWaterDist, tankFullDist],
  );

  const yesterdayAvg = useMemo(
    () => dayAvg(yesterdayEntries, activeSensor, maxWaterDist, tankFullDist),
    [yesterdayEntries, activeSensor, maxWaterDist, tankFullDist],
  );
  const yesterdayRange = useMemo(
    () => dayMinMax(yesterdayEntries, activeSensor, maxWaterDist, tankFullDist),
    [yesterdayEntries, activeSensor, maxWaterDist, tankFullDist],
  );

  const avg = safeNum(activeDayStats?.[`${activeSensor}_avg`]);
  const min = safeNum(activeDayStats?.[`${activeSensor}_min`]);
  const max = safeNum(activeDayStats?.[`${activeSensor}_max`]);

  const hasChart = entries.length > 0 || avg != null;
  const showYesterdayOverlay = yesterdayEntries.some((e) => safeNum(e[activeSensor]) != null);
  const selectedLabel = dayShortLabel(effectiveDateKey);
  const compareIntro = buildCompareIntro(selectedLabel, avg, yesterdayAvg, meta.unit);
  const displayVal = avg != null ? `${avg}${meta.unit}` : '--';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <View style={s.headerSide} />
          <Text style={s.headerTitle}>Chi tiết cảm biến</Text>
          <TouchableOpacity style={s.closeBtn} onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={20} color="#4a7a5a" />
          </TouchableOpacity>
        </View>

        <DateStrip selectedKey={effectiveDateKey} onSelect={setSelectedDateKey} />

        <View style={s.selectWrap}>
          <SensorSelect
            value={activeSensor}
            onChange={setActiveSensor}
            dayStats={activeDayStats}
          />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>
          <View style={s.hero}>
            <Text style={[s.heroVal, { color: meta.color }]}>{displayVal}</Text>
            <Text style={s.heroLbl}>Trung bình trong ngày</Text>
            {min != null && max != null && (
              <Text style={s.heroRange}>
                T: {min}{meta.unit}  ·  C: {max}{meta.unit}
              </Text>
            )}
          </View>

          <Text style={s.sectionTitle}>Diễn biến theo giờ</Text>
          <View style={s.chartCard}>
            {!hasChart && !loading ? (
              <Text style={s.empty}>Chưa đủ dữ liệu để vẽ biểu đồ.</Text>
            ) : (
              <WeatherDayChart
                selectedEntries={entries}
                compareEntries={yesterdayEntries}
                sensorKey={activeSensor}
                color={meta.color}
                unit={meta.unit}
                loading={loading}
                fallbackAvg={avg}
                showCompare={showYesterdayOverlay}
                selectedLabel={selectedLabel}
                compareLabel={dayShortLabel(yesterdayKey)}
                showHero={false}
              />
            )}
          </View>

          <View style={s.statGrid}>
            <StatBox label="Thấp nhất" value={min} unit={meta.unit} color={meta.color} />
            <StatBox label="Trung bình" value={avg} unit={meta.unit} color={meta.color} highlight />
            <StatBox label="Cao nhất" value={max} unit={meta.unit} color={meta.color} />
          </View>

          {yesterdayAvg != null && avg != null && (
            <>
              <Text style={s.sectionTitle}>So sánh hàng ngày</Text>
              <View style={s.summaryCard}>
                {compareIntro && <Text style={s.summaryText}>{compareIntro}</Text>}
                <CompareRangeRow
                  label={selectedLabel}
                  low={min}
                  high={max}
                  marker={avg}
                  color={meta.color}
                  unit={meta.unit}
                />
                <CompareRangeRow
                  label="Hôm qua"
                  low={yesterdayRange.min ?? yesterdayAvg}
                  high={yesterdayRange.max ?? yesterdayAvg}
                  marker={yesterdayAvg}
                  color="#94a3b8"
                  unit={meta.unit}
                  muted
                />
              </View>
            </>
          )}

          <Text style={s.sectionTitle}>Giới thiệu về {meta.label.toLowerCase()}</Text>
          <View style={s.summaryCard}>
            <Text style={s.infoText}>{SENSOR_INFO[activeSensor]}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function StatBox({ label, value, unit, color, highlight }) {
  const display = value != null && Number.isFinite(value) ? `${value}${unit}` : '--';
  return (
    <View style={[s.statBox, highlight && s.statBoxHi]}>
      <Text style={s.statBoxLbl}>{label}</Text>
      <Text style={[s.statBoxVal, { color }]}>{display}</Text>
    </View>
  );
}

function CompareRangeRow({ label, low, high, marker, color, unit, muted }) {
  const lo = low ?? marker ?? 0;
  const hi = high ?? marker ?? lo;
  const span = Math.max(hi - lo, 1);
  const dotPct = marker != null
    ? Math.min(96, Math.max(4, ((marker - lo) / span) * 100))
    : null;
  const gradColors = muted ? ['#b0bec5', '#90a4ae'] : [color + 'cc', color];

  return (
    <View style={s.rangeRow}>
      <Text style={s.rangeLbl}>{label}</Text>
      <View style={s.rangeLine}>
        <Text style={s.rangeEdge}>{lo}{unit}</Text>
        <View style={s.rangeTrack}>
          <LinearGradient
            colors={gradColors}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[s.rangeFill, { left: '0%', width: '100%' }]}
          />
          {dotPct != null && <View style={[s.rangeDot, { left: `${dotPct}%` }]} />}
        </View>
        <Text style={s.rangeEdge}>{hi}{unit}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f2f8f4' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerSide: { width: 36 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#1a3028',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dce8e0',
  },

  stripRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
    alignItems: 'flex-end',
  },
  stripItem: { alignItems: 'center', paddingHorizontal: 10, minWidth: 44 },
  stripDow: { fontSize: 12, color: '#8ab49a', fontWeight: '500', marginBottom: 6 },
  stripDowOn: { color: '#1a3028', fontWeight: '700' },
  stripCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripCircleOn: { backgroundColor: '#3b82f6' },
  stripDate: { fontSize: 16, fontWeight: '600', color: '#4a7a5a' },
  stripDateOn: { color: '#fff', fontWeight: '700' },
  stripSubtitle: {
    textAlign: 'center',
    fontSize: 14,
    color: '#4a7a5a',
    paddingBottom: 12,
    paddingHorizontal: 16,
  },

  selectWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dce8e0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  selectIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectBody: { flex: 1 },
  selectHint: { fontSize: 12, color: '#8ab49a', marginBottom: 2 },
  selectValue: { fontSize: 16, fontWeight: '700' },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26, 48, 40, 0.4)' },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 8,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#dce8e0', alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#1a3028', marginBottom: 12, textAlign: 'center' },
  sheetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  sheetRowBorder: { borderTopWidth: 1, borderTopColor: '#edf5f0' },
  sheetIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sheetLabel: { fontSize: 16, fontWeight: '600', color: '#1a3028' },
  sheetSub: { fontSize: 13, color: '#8ab49a', marginTop: 2 },
  sheetCancel: { marginTop: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: '#f2f8f4', borderRadius: 12 },
  sheetCancelTxt: { fontSize: 16, fontWeight: '600', color: '#4a7a5a' },

  body: { paddingBottom: 36 },

  hero: { alignItems: 'center', paddingTop: 4, paddingBottom: 16, paddingHorizontal: 20 },
  heroVal: { fontSize: 52, fontWeight: '300', letterSpacing: -1, lineHeight: 60 },
  heroLbl: { fontSize: 15, color: '#4a7a5a', marginTop: 6 },
  heroRange: { fontSize: 14, color: '#8ab49a', marginTop: 8 },

  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    flexWrap: 'wrap',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDash: {
    width: 20,
    height: 0,
    borderTopWidth: 2,
    borderStyle: 'dashed',
  },
  legendSolid: { width: 20, height: 3, borderRadius: 2 },
  legendTxt: { fontSize: 12, color: '#8ab49a' },

  sectionTitle: {
    fontSize: 20, fontWeight: '700', color: '#1a3028',
    marginHorizontal: 20, marginBottom: 10, marginTop: 8,
  },
  card: {
    marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 16,
    padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#e2ece5',
    overflow: 'hidden',
  },
  chartCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2ece5',
    alignItems: 'center',
  },
  summaryCard: {
    marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 18,
    padding: 18, marginBottom: 20, borderWidth: 1, borderColor: '#e2ece5',
  },
  summaryText: { fontSize: 16, color: '#1a3028', lineHeight: 24 },
  infoText: { fontSize: 15, color: '#4a7a5a', lineHeight: 23 },
  empty: { fontSize: 14, color: '#8ab49a', textAlign: 'center', paddingVertical: 28 },

  rangeRow: { marginTop: 16 },
  rangeLbl: { fontSize: 15, fontWeight: '600', color: '#1a3028', marginBottom: 10 },
  rangeLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rangeEdge: { fontSize: 14, fontWeight: '600', color: '#4a7a5a', minWidth: 44, textAlign: 'center' },
  rangeTrack: {
    flex: 1, height: 8, backgroundColor: '#eef4f0',
    borderRadius: 999, overflow: 'visible', position: 'relative',
  },
  rangeFill: { position: 'absolute', top: 0, height: '100%', borderRadius: 999 },
  rangeDot: {
    position: 'absolute', top: -3, width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#fff', borderWidth: 2, borderColor: '#1a3028', marginLeft: -7,
  },

  statGrid: { flexDirection: 'row', marginHorizontal: 16, gap: 8, marginBottom: 16 },
  statBox: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center',
    borderWidth: 1, borderColor: '#e2ece5',
  },
  statBoxHi: { borderColor: '#c8ddd0', backgroundColor: '#f8fcf9' },
  statBoxLbl: { fontSize: 11, color: '#8ab49a', marginBottom: 6, textAlign: 'center' },
  statBoxVal: { fontSize: 16, fontWeight: '700', textAlign: 'center' },

  axis: { fontSize: 11, color: '#8ab49a', fontWeight: '500' },
  axisX: { fontSize: 10, color: '#8ab49a', width: 42 },
});
