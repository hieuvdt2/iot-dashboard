import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { C } from '../theme';
import { useMqtt } from '../MqttContext';
import { firebaseService } from '../services/firebaseService';

const SENSORS = [
  { key: 'temperature', label: 'Nhiệt độ',        unit: '°C',  icon: '🌡️', color: C.red,     bg: C.redLight },
  { key: 'soilHum',     label: 'Độ ẩm đất',       unit: '%',   icon: '🌱', color: C.green,   bg: C.greenLight },
  { key: 'airHum',      label: 'Độ ẩm không khí', unit: '%',   icon: '💧', color: C.blue,    bg: C.blueLight },
  { key: 'light',       label: 'Ánh sáng',         unit: 'lux', icon: '☀️', color: '#f59e0b', bg: '#fffbeb' },
];

function getBadge(status) {
  if (status === 'online')       return { bg: '#dcfce7', text: '#16a34a', border: '#bbf7d0', label: '● Trực tuyến' };
  if (status === 'reconnecting') return { bg: '#fefce8', text: '#854d0e', border: '#fef08a', label: '◌ Đang kết nối...' };
  return                               { bg: C.redLight, text: C.red,    border: '#fecaca', label: '○ Ngoại tuyến' };
}

// maxWaterDistance được lưu ở AsyncStorage, dùng giá trị mặc định 20cm nếu chưa set
const DEFAULT_MAX_WATER_DIST = 20;
function getWaterStatus(distance, maxDist) {
  if (distance === null || distance === undefined) return null;
  if (distance <= maxDist * 0.5) return { label: '✓ Đủ nước', color: '#16a34a', bg: '#dcfce7' };
  if (distance <= maxDist)       return { label: '⚠ Thấp',    color: '#d97706', bg: '#fef9c3' };
  return                                { label: '✗ Cạn',      color: C.red,     bg: C.redLight };
}

function SensorCard({ sensor, value, maxWaterDist }) {
  const has = value !== null && value !== undefined;

  if (sensor.isWater) {
    const dist = has ? Number(value) : null;
    const status = getWaterStatus(dist, maxWaterDist ?? DEFAULT_MAX_WATER_DIST);
    return (
      <View style={[ss.sensorCard, { borderLeftColor: sensor.color }]}>
        <View style={[ss.sensorIcon, { backgroundColor: sensor.bg }]}>
          <Text style={{ fontSize: 17 }}>{sensor.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={ss.sensorLabel}>{sensor.label}</Text>
          {status ? (
            <View style={[ss.waterBadge, { backgroundColor: status.bg }]}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: status.color }}>{status.label}</Text>
            </View>
          ) : (
            <Text style={[ss.sensorValue, { color: C.text3, fontSize: 14 }]}>--</Text>
          )}
          {dist !== null && (
            <Text style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>{dist.toFixed(0)} cm</Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[ss.sensorCard, { borderLeftColor: sensor.color }]}>
      <View style={[ss.sensorIcon, { backgroundColor: sensor.bg }]}>
        <Text style={{ fontSize: 17 }}>{sensor.icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={ss.sensorLabel}>{sensor.label}</Text>
        <Text style={[ss.sensorValue, { color: has ? sensor.color : C.text3 }]}>
          {has ? `${Number(value).toFixed(1)}${sensor.unit}` : '--'}
        </Text>
      </View>
    </View>
  );
}

function ControlCard({ onLogout, maxWaterDist }) {
  const { mqttStatus, pumpState, autoMode, sensorData, setPumpState, setAutoMode, publishControl } = useMqtt();
  const [sending, setSending] = useState(null);

  // Water level computation
  const waterDist = sensorData?.waterLevel ?? null;
  const maxDist   = maxWaterDist ?? DEFAULT_MAX_WATER_DIST;
  const waterPct  = waterDist !== null
    ? Math.min(100, Math.max(0, Math.round((1 - waterDist / maxDist) * 100)))
    : null;
  const waterStatus = waterDist === null ? null
    : waterDist <= maxDist * 0.5 ? { label: 'Đủ nước', icon: '✓', color: '#16a34a', bg: '#dcfce7', bar: '#22c55e' }
    : waterDist <= maxDist       ? { label: 'Thấp',    icon: '⚠', color: '#d97706', bg: '#fef9c3', bar: '#f59e0b' }
    : { label: 'Cạn', icon: '✗', color: C.red, bg: C.redLight, bar: C.red };

  const send = useCallback(async (cmd) => {
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
  const isOn = pumpState === 'on';
  const badge = getBadge(mqttStatus);

  return (
    <View style={ss.card}>
      {/* Header row */}
      <View style={ss.cardHeader}>
        <View>
          <Text style={ss.cardTitle}>Điều khiển</Text>
          <View style={[ss.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
            <Text style={[ss.statusText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>
        <TouchableOpacity style={ss.logoutBtn} onPress={onLogout}>
          <Text style={ss.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      {/* Auto mode */}
      <View style={[ss.autoRow, autoMode ? ss.autoRowOn : ss.autoRowOff]}>
        <View style={{ flex: 1 }}>
          <Text style={[ss.autoTitle, { color: autoMode ? C.greenDark : C.text2 }]}>
            {autoMode ? '🤖 Chế độ tự động (AI đang kiểm soát)' : '⏸ Chế độ thủ công'}
          </Text>
          <Text style={ss.autoSub}>
            {autoMode ? 'AI tự động bơm khi đất khô' : 'Bạn tự bật/tắt bơm'}
          </Text>
        </View>
        <TouchableOpacity
          style={[ss.autoToggle, autoMode ? ss.autoToggleOn : ss.autoToggleOff, (!isOnline || !!sending) && ss.btnDisabled]}
          onPress={() => send(autoMode ? 'auto_off' : 'auto_on')}
          disabled={!isOnline || !!sending}
        >
          {sending === 'auto_on' || sending === 'auto_off'
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={ss.autoToggleText}>{autoMode ? 'Tắt AUTO' : 'Bật AUTO'}</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Pump buttons — shown only in manual mode */}
      {!autoMode && (
        <>
          <View style={[ss.pumpState, isOn ? ss.pumpStateOn : ss.pumpStateOff]}>
            <Text style={ss.pumpEmoji}>{isOn ? '💦' : '⏸️'}</Text>
            <Text style={[ss.pumpStateText, { color: isOn ? C.greenDark : C.text3 }]}>
              {isOn ? 'Máy bơm đang hoạt động' : 'Máy bơm đang tắt'}
            </Text>
          </View>
          <View style={ss.pumpBtns}>
            <TouchableOpacity
              style={[ss.pumpBtn, ss.pumpBtnOn, (!isOnline || !!sending) && ss.btnDisabled]}
              onPress={() => send('bat_bom')}
              disabled={!isOnline || !!sending}
            >
              {sending === 'bat_bom'
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={ss.pumpBtnText}>💧 Bật bơm</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={[ss.pumpBtn, ss.pumpBtnOff, (!isOnline || !!sending) && ss.btnDisabled]}
              onPress={() => send('tat_bom')}
              disabled={!isOnline || !!sending}
            >
              {sending === 'tat_bom'
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={ss.pumpBtnText}>⏹ Tắt bơm</Text>
              }
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Water level indicator */}
      <View style={[ss.waterBox, waterStatus && { backgroundColor: waterStatus.bg, borderColor: waterStatus.bar + '66' }]}>
        <View style={ss.waterBoxHeader}>
          <Text style={ss.waterBoxTitle}>🪣 Mực nước hiện tại</Text>
          {waterStatus ? (
            <View style={[ss.waterBadgeInline, { backgroundColor: 'rgba(255,255,255,0.75)', borderColor: waterStatus.bar }]}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: waterStatus.color }}>
                {waterStatus.icon} {waterStatus.label}
              </Text>
            </View>
          ) : (
            <Text style={{ fontSize: 12, color: C.text3 }}>--</Text>
          )}
        </View>

        {/* Bar */}
        <View style={ss.waterBarBg}>
          <View style={[ss.waterBarFill, {
            width: `${waterPct ?? 0}%`,
            backgroundColor: waterStatus?.bar ?? C.border,
          }]} />
        </View>

        <View style={ss.waterBoxFooter}>
          <Text style={ss.waterBoxSub}>{waterDist !== null ? `${waterDist.toFixed(0)} cm` : '--'}</Text>
          <Text style={[ss.waterBoxPct, { color: waterStatus?.color ?? C.text3 }]}>
            {waterPct !== null ? `${waterPct}%` : '--'}
          </Text>
        </View>
      </View>

      {!isOnline && (
        <Text style={ss.warn}>⚠ MQTT chưa kết nối — không thể điều khiển</Text>
      )}
    </View>
  );
}

function HistoryRow({ item, index }) {
  return (
    <View style={[ss.hRow, index % 2 === 0 && ss.hRowAlt]}>
      <Text style={[ss.hCell, { flex: 1.3 }]}>{item.timeLabel}</Text>
      <Text style={ss.hCell}>{item.temperature != null ? `${Number(item.temperature).toFixed(1)}°` : '--'}</Text>
      <Text style={ss.hCell}>{item.soilHum != null ? `${Number(item.soilHum).toFixed(0)}%` : '--'}</Text>
      <Text style={ss.hCell}>{item.airHum != null ? `${Number(item.airHum).toFixed(0)}%` : '--'}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { sensorData, history, setHistory } = useMqtt();
  const [refreshing, setRefreshing]   = useState(false);
  const [loading, setLoading]         = useState(true);
  const [maxWaterDist, setMaxWaterDist] = useState(DEFAULT_MAX_WATER_DIST);

  useEffect(() => {
    (async () => {
      try {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        const v = await AsyncStorage.getItem('iot_max_water_distance');
        if (v) setMaxWaterDist(Number(v));
      } catch {}
    })();
  }, []);

  const loadFirebase = useCallback(async () => {
    try {
      const data = await firebaseService.getLatestSensorData();
      if (data) {
        // Sensor data is updated via MQTT context; this is just fallback for first load.
      }
      const hist = await firebaseService.getSensorHistory(30);
      if (hist?.length) {
        setHistory(hist.map(h => ({
          timeLabel:   h.timestamp
            ? new Date(h.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            : '--',
          temperature: h.temperature   ?? null,
          soilHum:     h.soilMoisture  ?? h.soilHum ?? null,
          airHum:      h.airHumidity   ?? h.airHum  ?? null,
        })));
      }
    } catch (e) {
      console.warn('[Firebase]', e.message);
    }
  }, [setHistory]);

  useEffect(() => {
    loadFirebase().finally(() => setLoading(false));
  }, [loadFirebase]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFirebase();
    setRefreshing(false);
  }, [loadFirebase]);

  const handleLogout = useCallback(async () => {
    await firebaseService.signOut();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[ss.root, ss.centered]}>
        <ActivityIndicator size="large" color={C.green} />
        <Text style={{ color: C.text2, marginTop: 10 }}>Đang tải...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={ss.root}>
      <ScrollView
        contentContainerStyle={ss.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.green} />}
      >
        {/* Header */}
        <View style={ss.pageHeader}>
          <Text style={ss.pageTitle}>Smart Garden 🌿</Text>
          <Text style={ss.pageSub}>Kéo xuống để làm mới dữ liệu</Text>
        </View>

        {/* Control card (contains auto mode + pump + status + water level) */}
        <ControlCard onLogout={handleLogout} maxWaterDist={maxWaterDist} />

        {/* Sensor grid */}
        <View style={ss.card}>
          <Text style={[ss.cardTitle, { marginBottom: 12 }]}>Dữ liệu cảm biến</Text>
          <View style={ss.sensorGrid}>
            {SENSORS.map(s => (
              <View key={s.key} style={{ width: '48%' }}>
                <SensorCard sensor={s} value={sensorData[s.key]} maxWaterDist={maxWaterDist} />
              </View>
            ))}
          </View>
        </View>

        {/* History */}
        <View style={ss.card}>
          <View style={ss.cardHeader}>
            <Text style={ss.cardTitle}>Lịch sử ({history.length})</Text>
            {history.length > 0 && (
              <TouchableOpacity onPress={() => setHistory([])}>
                <Text style={{ color: C.red, fontSize: 13, fontWeight: '600' }}>Xóa</Text>
              </TouchableOpacity>
            )}
          </View>
          {history.length === 0 ? (
            <View style={ss.empty}><Text style={ss.emptyText}>Chưa có lịch sử</Text></View>
          ) : (
            <>
              <View style={[ss.hRow, ss.hHeader]}>
                {['Thời gian', 'Nhiệt độ', 'Đ.A Đất', 'Đ.A KK'].map(h => (
                  <Text key={h} style={[ss.hHeaderCell, h === 'Thời gian' && { flex: 1.3 }]}>{h}</Text>
                ))}
              </View>
              {history.slice(0, 20).map((item, i) => <HistoryRow key={i} item={item} index={i} />)}
              {history.length > 20 && (
                <Text style={{ textAlign: 'center', color: C.text3, fontSize: 12, marginTop: 8 }}>
                  +{history.length - 20} bản ghi khác
                </Text>
              )}
            </>
          )}
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const ss = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  centered:{ justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, gap: 12 },

  pageHeader: { paddingHorizontal: 4, paddingBottom: 4 },
  pageTitle:  { fontSize: 22, fontWeight: '700', color: C.text, letterSpacing: -0.5 },
  pageSub:    { fontSize: 12, color: C.text2, marginTop: 2 },

  card: {
    backgroundColor: C.bgCard, borderRadius: C.radius,
    borderWidth: 1, borderColor: C.border, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  cardTitle:   { fontSize: 15, fontWeight: '700', color: C.text },

  statusBadge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6 },
  statusText:  { fontSize: 12, fontWeight: '600' },

  logoutBtn:   { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  logoutText:  { fontSize: 12, fontWeight: '600', color: C.text2 },

  /* Auto mode row */
  autoRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 10, padding: 14, marginBottom: 14, borderWidth: 1 },
  autoRowOn:  { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  autoRowOff: { backgroundColor: '#f9fafb', borderColor: C.border },
  autoTitle:  { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  autoSub:    { fontSize: 12, color: C.text2 },
  autoToggle: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9, minWidth: 90, alignItems: 'center' },
  autoToggleOn:  { backgroundColor: C.blue },
  autoToggleOff: { backgroundColor: C.green },
  autoToggleText:{ color: '#fff', fontWeight: '700', fontSize: 13 },

  /* Pump */
  pumpState:    { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1 },
  pumpStateOn:  { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  pumpStateOff: { backgroundColor: '#f9fafb', borderColor: C.border },
  pumpEmoji:    { fontSize: 26 },
  pumpStateText:{ fontSize: 14, fontWeight: '700' },
  pumpBtns:     { flexDirection: 'row', gap: 10 },
  pumpBtn:      { flex: 1, borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  pumpBtnOn:    { backgroundColor: '#22c55e' },
  pumpBtnOff:   { backgroundColor: C.red },
  pumpBtnText:  { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnDisabled:  { opacity: 0.4 },
  warn: { marginTop: 10, fontSize: 12, color: '#854d0e', backgroundColor: '#fff7ed', borderRadius: 7, padding: 9, borderWidth: 1, borderColor: '#fed7aa' },

  /* Sensor grid */
  sensorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sensorCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3 },
  sensorIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sensorLabel:{ fontSize: 11, color: C.text2, fontWeight: '500', marginBottom: 3 },
  sensorValue:{ fontSize: 18, fontWeight: '700', letterSpacing: -0.5 },
  waterBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, marginBottom: 2 },

  /* History */
  hRow:       { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  hRowAlt:    { backgroundColor: C.bg },
  hHeader:    { backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border },
  hCell:      { flex: 1, fontSize: 12, color: C.text },
  hHeaderCell:{ flex: 1, fontSize: 11, fontWeight: '700', color: C.text2, textTransform: 'uppercase', letterSpacing: 0.5 },

  empty:      { paddingVertical: 24, alignItems: 'center' },
  emptyText:  { fontSize: 14, color: C.text3 },

  /* Water level */
  waterBox:       { borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg, padding: 12, marginTop: 12 },
  waterBoxHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  waterBoxTitle:  { fontSize: 13, fontWeight: '700', color: C.text },
  waterBadgeInline:{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  waterBarBg:     { height: 8, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 999, overflow: 'hidden' },
  waterBarFill:   { height: '100%', borderRadius: 999, minWidth: 4 },
  waterBoxFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  waterBoxSub:    { fontSize: 12, color: C.text2 },
  waterBoxPct:    { fontSize: 12, fontWeight: '700' },
});
