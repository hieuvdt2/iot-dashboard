const API_URL = process.env.REACT_APP_API_URL || '';

export async function sendAssistantMessage({ messages, context }) {
  const url = `${API_URL.replace(/\/$/, '')}/api/assistant/chat`;

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

export const ASSISTANT_QUICK_PROMPTS = [
  'Tôi đang trồng rau — nên cấu hình ngưỡng thế nào?',
  'Phân tích tình trạng vườn hiện tại của tôi',
  'So sánh preset có sẵn và gợi ý preset phù hợp',
  'Đất và nhiệt độ hiện tại có ổn không?',
];
