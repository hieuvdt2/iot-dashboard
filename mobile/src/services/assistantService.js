import Constants from 'expo-constants';

const DEFAULT_API_URL = 'https://server-iot-0qml.onrender.com';

const API_URL = (
  process.env.EXPO_PUBLIC_API_URL
  || Constants.expoConfig?.extra?.apiUrl
  || DEFAULT_API_URL
).replace(/\/$/, '');

export async function sendAssistantMessage({ messages, context }) {
  const url = `${API_URL}/api/assistant/chat`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, context }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Lỗi trợ lý (${response.status})`);
  }

  return data;
}

export async function checkAssistantStatus() {
  try {
    const res = await fetch(`${API_URL}/api/assistant/status`);
    if (!res.ok) return { ok: false };
    return res.json();
  } catch {
    return { ok: false };
  }
}

export const ASSISTANT_QUICK_PROMPTS = [
  'Tôi đang trồng rau — nên cấu hình ngưỡng thế nào?',
  'Phân tích tình trạng vườn hiện tại của tôi',
  'So sánh mẫu cài đặt và gợi ý phù hợp',
  'Đất và nhiệt độ hiện tại có ổn không?',
];

export const THRESHOLD_LABELS = {
  minSoil: 'Độ ẩm đất tối thiểu (%)',
  targetSoil: 'Mục tiêu dừng tưới (%)',
  maxTemp: 'Nhiệt độ tối đa (°C)',
  minAirHum: 'Độ ẩm KK tối thiểu (%)',
  maxLux: 'Ánh sáng tối đa (lux)',
  maxWaterDistance: 'Mực nước tối đa (cm)',
};

export function buildAssistantContext({
  sensorData,
  deployedThresholds,
  presets,
  gardenStatus,
  autoMode,
  pumpStatus,
}) {
  return {
    sensor: {
      nhiet_do: sensorData?.temperature ?? sensorData?.nhiet_do ?? null,
      do_am_dat: sensorData?.soilHum ?? sensorData?.do_am_dat ?? null,
      do_am_khong_khi: sensorData?.airHum ?? sensorData?.do_am_khong_khi ?? null,
      anh_sang: sensorData?.light ?? sensorData?.anh_sang ?? null,
      muc_nuoc: sensorData?.waterLevel ?? sensorData?.muc_nuoc ?? null,
    },
    deployedThresholds: deployedThresholds || {},
    presets: (presets || []).map((p) => ({
      key: p.key,
      name: p.name,
      config: p.config,
    })),
    gardenStatus: gardenStatus || '—',
    autoMode: autoMode ? 'BAT' : 'TAT',
    pumpStatus: pumpStatus === 'on' || pumpStatus === 'DANG_TUOI' ? 'DANG_TUOI' : 'KHONG_TUOI',
  };
}
