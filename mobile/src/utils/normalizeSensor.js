/** Chuẩn hóa payload ESP32 / Firebase → tên field dùng trong app */
export function normalizeSensorPayload(raw) {
  if (!raw || typeof raw !== 'object') return {};

  const num = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const x = Number(v);
    return Number.isFinite(x) ? x : null;
  };

  return {
    temperature: num(raw.nhiet_do ?? raw.temperature ?? raw.temp),
    soilHum: num(
      raw.do_am_dat ?? raw.soil ?? raw.soilMoisture ?? raw.soil_moisture ?? raw.soilHum,
    ),
    airHum: num(
      raw.do_am_khong_khi ?? raw.humi ?? raw.airHumidity ?? raw.air_humidity ?? raw.airHum,
    ),
    waterLevel: num(raw.muc_nuoc ?? raw.distance ?? raw.waterLevel ?? raw.water_level),
    light: num(raw.anh_sang ?? raw.lux ?? raw.light),
  };
}

/** Giữ giá trị cũ khi payload mới thiếu field (ESP32 không gửi muc_nuoc mỗi lần) */
export function mergeSensorSnapshot(prev = {}, next = {}) {
  const merged = { ...prev };
  Object.entries(next).forEach(([key, value]) => {
    if (value != null && Number.isFinite(Number(value))) {
      merged[key] = value;
    }
  });
  return merged;
}
