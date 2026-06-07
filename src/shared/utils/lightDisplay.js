/** Ngưỡng map từ cảm biến DO (firmware: ~300 tối / ~12000 sáng). */
export const LIGHT_BRIGHT_THRESHOLD = 5000;
export const LIGHT_DARK_THRESHOLD = 2000;

export function classifyLight(value) {
  if (value == null || typeof value !== 'number' || Number.isNaN(value)) return null;
  if (value >= LIGHT_BRIGHT_THRESHOLD) return 'bright';
  if (value <= LIGHT_DARK_THRESHOLD) return 'dark';
  return 'mid';
}

/** Nhãn chính cho UI: Sáng / Tối (giữ lux nếu dữ liệu cũ BH1750). */
export function formatLightLabel(value) {
  const kind = classifyLight(value);
  if (kind === 'bright') return 'Sáng';
  if (kind === 'dark') return 'Tối';
  if (kind === 'mid') return `${Math.round(value).toLocaleString('vi-VN')} lux`;
  return '—';
}

export function formatLightCondition(value) {
  const kind = classifyLight(value);
  if (kind === 'bright') return 'Đủ sáng';
  if (kind === 'dark') return 'Thiếu sáng';
  if (kind === 'mid') return 'Ánh sáng vừa';
  return 'Đang đo...';
}

export function lightLevelMeta(value) {
  const kind = classifyLight(value);
  if (kind === 'bright') return { label: 'Sáng', pct: 88, color: '#fb923c' };
  if (kind === 'dark') return { label: 'Tối', pct: 12, color: '#818cf8' };
  if (kind === 'mid') {
    const pct = Math.min(94, Math.max(4, Math.round((value / 20000) * 100)));
    return { label: 'Ánh sáng vừa', pct, color: '#fbbf24' };
  }
  return null;
}

/** Biểu đồ DO: 0 = tối, 1 = sáng. */
export function lightChartValue(value) {
  const kind = classifyLight(value);
  if (kind === 'bright') return 1;
  if (kind === 'dark') return 0;
  if (kind === 'mid') return null;
  return null;
}

export function formatLightChartTick(value) {
  if (value === 1) return 'Sáng';
  if (value === 0) return 'Tối';
  return '';
}
