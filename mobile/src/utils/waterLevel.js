/** @see src/shared/utils/waterLevel.js */
export const DEFAULT_TANK_FULL_DISTANCE = 2;
export const WATER_CALIBRATION_KEY = 'iot_tank_water_calibrated';
export const TANK_DISTANCE_UNIT_KEY = 'iot_tank_distance_unit';

export function loadTankDistanceUnit(storage) {
  if (!storage) return 'cm';
  try {
    return storage.getItem(TANK_DISTANCE_UNIT_KEY) === 'm' ? 'm' : 'cm';
  } catch {
    return 'cm';
  }
}

export function saveTankDistanceUnit(unit, storage) {
  if (!storage) return;
  try {
    storage.setItem(TANK_DISTANCE_UNIT_KEY, unit === 'm' ? 'm' : 'cm');
  } catch {
    // ignore
  }
}

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

export function waterDistanceToPercent(distance, tankEmptyDistance, tankFullDistance) {
  if (distance == null || !Number.isFinite(Number(distance))) return null;
  if (!isTankCalibrationReady(tankEmptyDistance, tankFullDistance)) return null;
  const empty = Number(tankEmptyDistance);
  const full = Number(tankFullDistance);
  const span = empty - full;
  const pct = ((empty - Number(distance)) / span) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

export function formatWaterPercent(distance, tankEmptyDistance, tankFullDistance, fallback = '--') {
  const pct = waterDistanceToPercent(distance, tankEmptyDistance, tankFullDistance);
  return pct == null ? fallback : `${pct}%`;
}

export function getWaterLevelStatus(distance, tankEmptyDistance, tankFullDistance) {
  const pct = waterDistanceToPercent(distance, tankEmptyDistance, tankFullDistance);
  if (pct == null) return null;
  if (pct <= 5 || distance > tankEmptyDistance) return { key: 'empty', label: 'Cạn' };
  if (pct <= 30) return { key: 'low', label: 'Nước thấp' };
  if (pct <= 55) return { key: 'mid', label: 'Ổn định' };
  return { key: 'full', label: 'Đủ nước' };
}

export function buildMqttConfigPayload(thresholds, tankEmptyDistance, tankFullDistance) {
  const payload = { ...thresholds };
  if (isTankCalibrationReady(tankEmptyDistance, tankFullDistance)) {
    payload.maxWaterDistance = tankEmptyDistance;
    payload.tankFullDistance = tankFullDistance;
  }
  return payload;
}

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

export function buildDeviceConfigPayload(thresholds, tankEmptyDistance, tankFullDistance, tankCalibrated = false) {
  return buildFirebaseConfigPayload(thresholds, tankEmptyDistance, tankFullDistance, tankCalibrated);
}

const PLANT_THRESHOLD_KEYS = ['minSoil', 'targetSoil', 'maxTemp', 'minAirHum', 'maxLux'];

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
