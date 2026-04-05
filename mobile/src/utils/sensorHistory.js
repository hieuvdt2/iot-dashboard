import AsyncStorage from '@react-native-async-storage/async-storage';

export const MAX_HISTORY = 50;

export const SENSOR_CONFIG = [
  { key: 'nhiet_do', label: 'Nhiệt độ', unit: '°C', icon: '🌡️', color: '#ff6b6b' },
  { key: 'do_am_khong_khi', label: 'Độ ẩm KK', unit: '%', icon: '💧', color: '#4dabf7' },
  { key: 'do_am_dat', label: 'Độ ẩm đất', unit: '%', icon: '🌱', color: '#51cf66' },
  { key: 'muc_nuoc', label: 'Mực nước', unit: 'cm', icon: '🌊', color: '#ffd43b' },
];

export function addToHistory(prevHistory, newData) {
  const now = new Date();
  const timestamp = now.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const entry = {
    time: timestamp,
    nhiet_do: newData.nhiet_do ?? null,
    do_am_khong_khi: newData.do_am_khong_khi ?? null,
    do_am_dat: newData.do_am_dat ?? null,
    muc_nuoc: newData.muc_nuoc ?? null,
  };

  const updated = [...prevHistory, entry];
  if (updated.length > MAX_HISTORY) {
    return updated.slice(updated.length - MAX_HISTORY);
  }
  return updated;
}

export function getChartDatasets(history) {
  if (history.length === 0) return null;

  const labels = history.map((h) => h.time);
  return {
    labels,
    datasets: SENSOR_CONFIG.map((s) => ({
      data: history.map((h) => h[s.key] ?? 0),
      color: () => s.color,
      strokeWidth: 2,
    })),
    legend: SENSOR_CONFIG.map((s) => `${s.icon} ${s.label}`),
  };
}

export async function saveHistoryAsync(history) {
  try {
    await AsyncStorage.setItem('iot_history', JSON.stringify(history));
  } catch (e) {
    console.warn('Failed to save history:', e);
  }
}

export async function loadHistoryAsync() {
  try {
    const saved = await AsyncStorage.getItem('iot_history');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}
