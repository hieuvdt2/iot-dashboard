/** Đồng bộ trạng thái bơm / auto từ payload Firebase hoặc MQTT (web + mobile dùng chung logic) */
export function parsePumpState(raw) {
  if (!raw) return null;
  const v = raw.trang_thai_bom ?? raw.pumpStatus ?? raw.pump;
  if (v === 'DANG_TUOI' || v === 'on' || v === 1 || v === true) return 'on';
  if (v === 'KHONG_TUOI' || v === 'off' || v === 0 || v === false) return 'off';
  return null;
}

export function parseAutoMode(raw) {
  if (!raw) return null;
  const v = raw.auto_mode ?? raw.autoMode ?? raw.auto;
  if (v === 'BAT' || v === 'on' || v === true) return true;
  if (v === 'TAT' || v === 'off' || v === false) return false;
  return null;
}

export function applyDeviceStatus(raw, setPumpState, setAutoMode) {
  const pump = parsePumpState(raw);
  const auto = parseAutoMode(raw);
  if (pump != null) setPumpState(pump);
  if (auto != null) setAutoMode(auto);
}
