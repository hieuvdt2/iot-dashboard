export const MAX_HISTORY = 50;

export const SENSOR_KEYS = [
  { key: 'nhiet_do', label: 'Nhiệt độ (°C)', color: '#ff6b6b' },
  { key: 'do_am_khong_khi', label: 'Độ ẩm KK (%)', color: '#4dabf7' },
  { key: 'do_am_dat', label: 'Độ ẩm đất (%)', color: '#51cf66' },
  { key: 'muc_nuoc', label: 'Mực nước (cm)', color: '#ffd43b' },
];

export function addToHistory(prevHistory, newData) {
  const timestamp = new Date().toLocaleTimeString('vi-VN', {
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

export function getChartData(history) {
  return history.map((item) => ({
    time: item.time,
    'Nhiệt độ (°C)': item.nhiet_do,
    'Độ ẩm KK (%)': item.do_am_khong_khi,
    'Độ ẩm đất (%)': item.do_am_dat,
    'Mực nước (cm)': item.muc_nuoc,
  }));
}

export function saveHistoryToStorage(history) {
  try {
    localStorage.setItem('iot_sensor_history', JSON.stringify(history));
  } catch (e) {
    // localStorage unavailable (e.g. in some mobile webviews)
  }
}

export function loadHistoryFromStorage() {
  try {
    const saved = localStorage.getItem('iot_sensor_history');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}
