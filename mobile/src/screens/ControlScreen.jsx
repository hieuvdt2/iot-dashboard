import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, StatusBar,
  Switch, Dimensions,
} from 'react-native';
import Svg, { Path, Text as SvgText, Circle } from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMqtt } from '../MqttContext';

const BG     = '#f5f8f5';
const WHITE  = '#ffffff';
const BORDER = '#e2ece5';
const DARK   = '#1a3028';
const MED    = '#4a7a5a';
const LIGHT  = '#8ab49a';
const GREEN  = '#22c55e';
const GREEN2 = '#16a34a';

const { width: SW } = Dimensions.get('window');

/* ── Arc Gauge helpers ────────────────────────────────────────────────────── */
const toCart = (cx, cy, r, deg) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

/** Clockwise arc from startDeg, sweeping sweepDeg degrees. */
const arcD = (cx, cy, r, startDeg, sweepDeg) => {
  if (sweepDeg < 0.5) return null;
  const s = toCart(cx, cy, r, startDeg);
  const e = toCart(cx, cy, r, startDeg + Math.min(sweepDeg, 359.9));
  const large = sweepDeg > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
};

/* ── Soil Moisture Arc Gauge ──────────────────────────────────────────────── */
const GAUGE_W      = SW - 100;
const GAUGE_H      = GAUGE_W * 0.72;
const GCX          = GAUGE_W / 2;
const GCY          = GAUGE_H * 0.62;
const GR           = Math.min(GAUGE_W, GAUGE_H) / 2 - 16;
const GSTROKE      = 20;
const G_START      = 240;   // 8 o'clock (lower-left)
const G_TOTAL      = 240;   // arc spans 240°

function soilColor(v) {
  if (v == null) return '#d4e8dc';
  if (v < 25) return '#ef4444';
  if (v < 50) return '#f97316';
  if (v < 75) return '#22c55e';
  return '#3b82f6';
}

function soilLabel(v) {
  if (v == null) return 'Chưa có dữ liệu';
  if (v < 25) return 'Đất đang rất khô';
  if (v < 50) return 'Đất hơi khô';
  if (v < 75) return 'Đất đủ ẩm';
  return 'Đất đang ướt';
}

function SoilGauge({ value }) {
  const pct  = value != null ? Math.max(0, Math.min(100, value)) / 100 : 0;
  const fill = pct * G_TOTAL;
  const col  = soilColor(value);

  // Dot at the tip of the fill arc
  const tipDeg = G_START + fill;
  const tip    = fill > 2 ? toCart(GCX, GCY, GR, tipDeg) : null;

  return (
    <View style={{ alignItems: 'center', paddingBottom: 4 }}>
      <Svg width={GAUGE_W} height={GAUGE_H}>
        {/* Background track */}
        <Path
          d={arcD(GCX, GCY, GR, G_START, G_TOTAL) ?? ''}
          stroke="#e8f0ec"
          strokeWidth={GSTROKE}
          fill="none"
          strokeLinecap="round"
        />
        {/* Filled arc */}
        {fill > 1 && (
          <Path
            d={arcD(GCX, GCY, GR, G_START, fill) ?? ''}
            stroke={col}
            strokeWidth={GSTROKE}
            fill="none"
            strokeLinecap="round"
          />
        )}
        {/* Tip dot */}
        {tip && fill > 4 && fill < G_TOTAL - 2 && (
          <Circle cx={tip.x} cy={tip.y} r={GSTROKE / 2 + 3} fill={WHITE} />
        )}
        {tip && fill > 4 && fill < G_TOTAL - 2 && (
          <Circle cx={tip.x} cy={tip.y} r={GSTROKE / 2 - 2} fill={col} />
        )}
        {/* Center value */}
        <SvgText
          x={GCX} y={GCY - 8}
          textAnchor="middle"
          fontSize={52}
          fontWeight="700"
          fill={col}
        >
          {value != null ? `${Math.round(value)}` : '--'}
        </SvgText>
        <SvgText x={GCX} y={GCY + 20} textAnchor="middle" fontSize={14} fill={MED}>
          % độ ẩm đất
        </SvgText>
      </Svg>
      {/* Status below gauge */}
      <Text style={[g.statusTxt, { color: col }]}>{soilLabel(value)}</Text>
    </View>
  );
}
const g = StyleSheet.create({
  statusTxt: { fontSize: 15, fontWeight: '700', marginTop: 2 },
});

/* ── Trạng thái hiện tại (chỉ xem, không thao tác) ─────────────────────────── */
function SystemStatus({ autoMode, pumpOn }) {
  const modeColor = autoMode ? '#6366f1' : GREEN2;
  const modeBg    = autoMode ? '#eef2ff' : '#dcfce7';

  return (
    <View style={ms.row}>
      <View style={[ms.chip, { backgroundColor: modeBg }]}>
        {autoMode
          ? <MaterialCommunityIcons name="robot-outline" size={16} color={modeColor} />
          : <Ionicons name="hand-left-outline" size={16} color={modeColor} />
        }
        <Text style={[ms.chipTxt, { color: modeColor }]}>
          {autoMode ? 'Tự động' : 'Thủ công'}
        </Text>
      </View>

      <View style={[ms.chip, { backgroundColor: pumpOn ? '#dcfce7' : '#f3f4f6' }]}>
        <MaterialCommunityIcons
          name="water-pump"
          size={16}
          color={pumpOn ? GREEN2 : LIGHT}
        />
        <Text style={[ms.chipTxt, { color: pumpOn ? GREEN2 : LIGHT }]}>
          Bơm {pumpOn ? 'đang bật' : 'đang tắt'}
        </Text>
      </View>
    </View>
  );
}
const ms = StyleSheet.create({
  row:     { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 16 },
  chip:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  chipTxt: { fontSize: 13, fontWeight: '600' },
});

/* ── Quick Sensor Tiles ───────────────────────────────────────────────────── */
function SensorTiles({ sensorData, maxWaterDist }) {
  const wDist = sensorData?.waterLevel ?? null;
  const maxD  = maxWaterDist ?? 20;
  const wPct  = wDist != null ? Math.max(0, Math.min(100, Math.round((1 - wDist / maxD) * 100))) : null;

  const tiles = [
    { lib: 'mci', icon: 'thermometer',   label: 'Nhiệt độ', val: sensorData?.temperature, unit: '°C', color: '#f97316' },
    { lib: 'ion', icon: 'water-outline', label: 'Độ ẩm KK', val: sensorData?.airHum,      unit: '%',  color: '#3b82f6' },
    { lib: 'mci', icon: 'water-pump',    label: 'Bể nước',  val: wPct,                    unit: '%',  color: '#06b6d4' },
  ];

  const Icon = ({ lib, name, size, color }) =>
    lib === 'mci'
      ? <MaterialCommunityIcons name={name} size={size} color={color} />
      : <Ionicons name={name} size={size} color={color} />;

  return (
    <View style={st.row}>
      {tiles.map((t) => (
        <View key={t.label} style={st.tile}>
          <View style={[st.iconWrap, { backgroundColor: t.color + '18' }]}>
            <Icon lib={t.lib} name={t.icon} size={20} color={t.color} />
          </View>
          <Text style={[st.val, { color: t.color }]}>
            {t.val != null ? `${Math.round(t.val)}` : '--'}
          </Text>
          <Text style={st.unit}>{t.unit}</Text>
          <Text style={st.label}>{t.label}</Text>
        </View>
      ))}
    </View>
  );
}
const st = StyleSheet.create({
  row:      { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginBottom: 20 },
  tile:     { flex: 1, backgroundColor: WHITE, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: BORDER, shadowColor: '#166534', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  val:      { fontSize: 22, fontWeight: '700' },
  unit:     { fontSize: 11, color: MED, marginTop: 1 },
  label:    { fontSize: 10, color: LIGHT, marginTop: 3 },
});

/* ── Device Control List ──────────────────────────────────────────────────── */
function DeviceRow({ icon, lib = 'ion', label, sub, value, onToggle, disabled, color = GREEN }) {
  const Icon = lib === 'mci'
    ? <MaterialCommunityIcons name={icon} size={22} color={value ? color : LIGHT} />
    : <Ionicons name={icon} size={22} color={value ? color : LIGHT} />;

  return (
    <View style={dr.row}>
      <View style={[dr.iconBox, { backgroundColor: value ? color + '18' : '#f5f5f5' }]}>
        {Icon}
      </View>
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={dr.label}>{label}</Text>
        {sub ? <Text style={dr.sub}>{sub}</Text> : null}
      </View>
      <Switch
        value={!!value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: '#e0e0e0', true: color + '80' }}
        thumbColor={value ? color : '#f0f0f0'}
        ios_backgroundColor="#e0e0e0"
      />
    </View>
  );
}
const dr = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f5f2' },
  iconBox: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  label:   { fontSize: 15, fontWeight: '600', color: DARK },
  sub:     { fontSize: 12, color: LIGHT, marginTop: 2 },
});

/* ── MQTT Status Badge ────────────────────────────────────────────────────── */
function StatusBadge({ mqttStatus }) {
  const cfg = {
    online:       { color: '#16a34a', bg: '#dcfce7', label: 'Thiết bị trực tuyến',   icon: 'wifi' },
    reconnecting: { color: '#b45309', bg: '#fffbeb', label: 'Đang kết nối lại...',    icon: 'wifi-outline' },
    offline:      { color: '#dc2626', bg: '#fef2f2', label: 'Ngoại tuyến',            icon: 'wifi-off-sharp' },
  }[mqttStatus] ?? { color: '#dc2626', bg: '#fef2f2', label: 'Ngoại tuyến', icon: 'wifi-off-sharp' };

  return (
    <View style={[sb.wrap, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon} size={13} color={cfg.color} />
      <Text style={[sb.txt, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}
const sb = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, marginBottom: 16 },
  txt:  { fontSize: 12, fontWeight: '600' },
});

/* ── Main Screen ──────────────────────────────────────────────────────────── */
export default function ControlScreen() {
  const { mqttStatus, pumpState, autoMode, sensorData, setPumpState, setAutoMode, publishControl } = useMqtt();
  const [sending, setSending] = useState(null);

  const send = useCallback((cmd) => {
    if (sending) return;
    setSending(cmd);
    publishControl(cmd);
    if (cmd === 'bat_bom')  setPumpState('on');
    if (cmd === 'tat_bom')  setPumpState('off');
    if (cmd === 'auto_on')  setAutoMode(true);
    if (cmd === 'auto_off') setAutoMode(false);
    setTimeout(() => setSending(null), 1500);
  }, [sending, publishControl, setPumpState, setAutoMode]);

  const isOnline = mqttStatus === 'online';
  const pumpOn   = pumpState === 'on';
  const soil     = sensorData?.soilHum ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.headerGreet}>Smart Garden</Text>
              <Text style={s.headerTitle}>Điều khiển vườn</Text>
            </View>
            <View style={s.headerIconWrap}>
              <MaterialCommunityIcons name="leaf" size={22} color={GREEN2} />
            </View>
          </View>

          {/* MQTT badge */}
          <StatusBadge mqttStatus={mqttStatus} />

          {/* Gauge + trạng thái (chỉ xem) */}
          <View style={s.gaugeCard}>
            <SoilGauge value={soil} />
            <SystemStatus autoMode={autoMode} pumpOn={pumpOn} />
          </View>

          {/* Quick sensor tiles */}
          <SensorTiles sensorData={sensorData} />

          <Text style={s.sectionLabel}>Thao tác</Text>
          <View style={s.controlCard}>

            {/* Auto mode toggle */}
            <DeviceRow
              lib="mci"
              icon="robot-outline"
              label="Chế độ tự động"
              sub={autoMode ? 'Bơm tự động theo ngưỡng đặt' : 'Tắt — điều khiển thủ công'}
              value={autoMode}
              color="#6366f1"
              onToggle={() => send(autoMode ? 'auto_off' : 'auto_on')}
              disabled={!isOnline || !!sending}
            />

            {/* Pump toggle — only when manual */}
            {!autoMode && (
              <DeviceRow
                lib="mci"
                icon="water-pump"
                label="Máy bơm nước"
                sub={pumpOn ? 'Đang tưới — bơm hoạt động' : 'Tắt — nhấn để bật'}
                value={pumpOn}
                color={GREEN}
                onToggle={() => send(pumpOn ? 'tat_bom' : 'bat_bom')}
                disabled={!isOnline || !!sending}
              />
            )}

            {/* Loading indicator */}
            {!!sending && (
              <View style={s.sendingRow}>
                <ActivityIndicator size="small" color={GREEN} />
                <Text style={{ fontSize: 12, color: MED, marginLeft: 8 }}>Đang gửi lệnh...</Text>
              </View>
            )}
          </View>

          {/* Offline warning */}
          {!isOnline && (
            <View style={[s.infoBox, { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]}>
              <Ionicons name="warning-outline" size={16} color="#dc2626" />
              <Text style={[s.infoTxt, { color: '#dc2626' }]}>
                {' '}Thiết bị ngoại tuyến. Không thể gửi lệnh điều khiển.
              </Text>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  headerGreet:  { fontSize: 12, color: LIGHT, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 },
  headerTitle:  { fontSize: 26, fontWeight: '700', color: DARK },
  headerIconWrap:{ width: 44, height: 44, borderRadius: 14, backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', shadowColor: '#166534', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },

  gaugeCard:    { marginHorizontal: 20, marginBottom: 20, backgroundColor: WHITE, borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: BORDER, shadowColor: '#166534', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3 },

  sectionLabel: { fontSize: 11, color: LIGHT, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginHorizontal: 20, marginBottom: 10 },
  controlCard:  { marginHorizontal: 20, marginBottom: 16, backgroundColor: WHITE, borderRadius: 20, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', shadowColor: '#166534', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },

  sendingRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  infoBox:      { marginHorizontal: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#f0f0ff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#c7d2fe' },
  infoTxt:      { flex: 1, fontSize: 13, lineHeight: 19 },
});
