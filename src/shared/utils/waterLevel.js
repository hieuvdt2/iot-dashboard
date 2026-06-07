/**
 * Arduino gửi muc_nuoc = khoảng cách siêu âm (HC-SR04: duration * 0.034 / 2).
 * Số càng nhỏ = mặt nước càng gần cảm biến = bể càng đầy.
 * Dashboard quy đổi sang % theo 2 mức hiệu chuẩn của từng bể.
 */
export const DEFAULT_TANK_FULL_DISTANCE = 2;
export const WATER_CALIBRATION_KEY = 'iot_tank_water_calibrated';
export const TANK_DISTANCE_UNIT_KEY = 'iot_tank_distance_unit';

export function loadTankDistanceUnit(storage) {
  const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!store) return 'cm';
  try {
    return store.getItem(TANK_DISTANCE_UNIT_KEY) === 'm' ? 'm' : 'cm';
  } catch {
    return 'cm';
  }
}

export function saveTankDistanceUnit(unit, storage) {
  const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!store) return;
  try {
    store.setItem(TANK_DISTANCE_UNIT_KEY, unit === 'm' ? 'm' : 'cm');
  } catch {
    // ignore
  }
}

/** Hiển thị giá trị cm theo đơn vị người dùng chọn (cm hoặc m). */
export function formatCmForInput(cm, unit = 'cm') {
  if (cm == null || !Number.isFinite(Number(cm))) return '';
  if (unit === 'm') return String(parseFloat((Number(cm) / 100).toFixed(4)));
  return String(Number(cm));
}

export function parseInputToCm(text, unit = 'cm') {
  if (text === '' || text == null) return null;
  const n = Number(text);
  if (!Number.isFinite(n)) return null;
  return unit === 'm' ? n * 100 : n;
}

export function formatDistanceLabel(cm, unit = 'cm') {
  if (cm == null || !Number.isFinite(Number(cm))) return '—';
  if (unit === 'm') return `${parseFloat((Number(cm) / 100).toFixed(3))} m`;
  return `${Number(cm)} cm`;
}

export function isTankCalibrationReady(tankEmptyDistance, tankFullDistance) {
  const empty = Number(tankEmptyDistance);
  const full = Number(tankFullDistance);
  return Number.isFinite(empty) && empty > 0 && Number.isFinite(full) && full >= 0 && empty > full;
}

export function tankConfigEqual(aEmpty, aFull, bEmpty, bFull, epsilon = 0.001) {
  const aEmptyNull = aEmpty == null || !Number.isFinite(Number(aEmpty));
  const aFullNull = aFull == null || !Number.isFinite(Number(aFull));
  const bEmptyNull = bEmpty == null || !Number.isFinite(Number(bEmpty));
  const bFullNull = bFull == null || !Number.isFinite(Number(bFull));
  if (aEmptyNull && aFullNull && bEmptyNull && bFullNull) return true;
  if (aEmptyNull !== bEmptyNull || aFullNull !== bFullNull) return false;
  return (
    Math.abs(Number(aEmpty) - Number(bEmpty)) < epsilon
    && Math.abs(Number(aFull) - Number(bFull)) < epsilon
  );
}

export function isWaterTankCalibrated() {
  try {
    return localStorage.getItem(WATER_CALIBRATION_KEY) === 'true';
  } catch {
    return false;
  }
}

function readStoredNumber(key) {
  try {
    const v = localStorage.getItem(key);
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** Đọc hiệu chuẩn bể đã lưu — null nếu chưa cấu hình (không dùng số mặc định). */
export function loadStoredTankEmptyDistance() {
  if (!isWaterTankCalibrated()) return null;
  const n = readStoredNumber('iot_max_water_distance');
  return n != null && n > 0 ? n : null;
}

export function loadStoredTankFullDistance() {
  if (!isWaterTankCalibrated()) return null;
  const n = readStoredNumber('iot_tank_full_distance');
  return n != null && n >= 0 ? n : null;
}

export function markWaterTankCalibrated() {
  try {
    localStorage.setItem(WATER_CALIBRATION_KEY, 'true');
  } catch {
    // ignore
  }
}

export function waterDistanceToPercent(distance, tankEmptyDistance, tankFullDistance) {
  if (distance == null || !Number.isFinite(Number(distance))) return null;
  if (!isTankCalibrationReady(tankEmptyDistance, tankFullDistance)) return null;
  const empty = Number(tankEmptyDistance);
  const full = Number(tankFullDistance);
  const span = empty - full;
  const pct = ((empty - Number(distance)) / span) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

export function formatWaterPercent(distance, tankEmptyDistance, tankFullDistance, fallback = '—') {
  const pct = waterDistanceToPercent(distance, tankEmptyDistance, tankFullDistance);
  return pct == null ? fallback : `${pct}%`;
}

export function getWaterLevelStatus(distance, tankEmptyDistance, tankFullDistance) {
  const pct = waterDistanceToPercent(distance, tankEmptyDistance, tankFullDistance);
  if (pct == null) return null;
  if (pct <= 5 || distance > tankEmptyDistance) return { key: 'empty', label: 'Cạn', cls: 'danger' };
  if (pct <= 30) return { key: 'low', label: 'Nước thấp', cls: 'warn' };
  if (pct <= 55) return { key: 'mid', label: 'Ổn định', cls: 'ok' };
  return { key: 'full', label: 'Đủ nước', cls: 'ok' };
}

export function waterTrendAsPercent(trend, tankEmptyDistance, tankFullDistance) {
  if (!trend || !isTankCalibrationReady(tankEmptyDistance, tankFullDistance)) return trend;
  const span = Number(tankEmptyDistance) - Number(tankFullDistance);
  if (span <= 0) return trend;
  const pctDiff = Math.round(-(trend.diff / span) * 100);
  if (pctDiff === 0) {
    return { ...trend, diff: 0, label: '0%', up: false };
  }
  return {
    ...trend,
    diff: pctDiff,
    label: `${Math.abs(pctDiff)}%`,
    up: pctDiff > 0,
  };
}

/** Payload MQTT/ESP32 — luôn gửi maxWaterDistance cho Arduino. */
export function buildMqttConfigPayload(thresholds, tankEmptyDistance, tankFullDistance) {
  const payload = { ...thresholds };
  if (isTankCalibrationReady(tankEmptyDistance, tankFullDistance)) {
    payload.maxWaterDistance = tankEmptyDistance;
    payload.tankFullDistance = tankFullDistance;
  }
  return payload;
}

/**
 * Payload Firebase — chỉ ghi hiệu chuẩn bể khi tankCalibrated=true.
 * Tránh preset cây (maxWaterDistance: 20) ghi đè hiệu chuẩn local sau Sync.
 */
export function buildFirebaseConfigPayload(
  thresholds,
  tankEmptyDistance,
  tankFullDistance,
  tankCalibrated = false,
) {
  const payload = { ...thresholds };
  if (tankCalibrated && isTankCalibrationReady(tankEmptyDistance, tankFullDistance)) {
    payload.maxWaterDistance = tankEmptyDistance;
    payload.tankFullDistance = tankFullDistance;
    payload.tankCalibrated = true;
  }
  return payload;
}

/** @deprecated Dùng buildMqttConfigPayload / buildFirebaseConfigPayload */
export function buildDeviceConfigPayload(thresholds, tankEmptyDistance, tankFullDistance, tankCalibrated = false) {
  return buildFirebaseConfigPayload(thresholds, tankEmptyDistance, tankFullDistance, tankCalibrated);
}

const PLANT_THRESHOLD_KEYS = ['minSoil', 'targetSoil', 'maxTemp', 'minAirHum', 'maxLux'];

/** Tách ngưỡng cây và hiệu chuẩn bể — tránh lẫn khi đồng bộ Firebase. */
export function splitDeviceConfig(config = {}) {
  const raw = { ...config };
  delete raw.updatedAt;
  const tankCalibrated = raw.tankCalibrated === true;

  let tankEmpty = null;
  let tankFull = null;
  if (tankCalibrated) {
    if (raw.maxWaterDistance != null) tankEmpty = Number(raw.maxWaterDistance);
    if (raw.tankFullDistance != null) tankFull = Number(raw.tankFullDistance);
  }
  delete raw.maxWaterDistance;
  delete raw.tankFullDistance;
  delete raw.tankCalibrated;

  const thresholds = {};
  PLANT_THRESHOLD_KEYS.forEach((key) => {
    if (raw[key] != null) thresholds[key] = Number(raw[key]);
  });

  return { thresholds, tankEmpty, tankFull, tankCalibrated };
}

export function pickPlantThresholds(source = {}) {
  const out = {};
  PLANT_THRESHOLD_KEYS.forEach((key) => {
    if (source[key] != null) out[key] = Number(source[key]);
  });
  return out;
}
