const THRESHOLD_KEYS = [
  'minSoil',
  'targetSoil',
  'maxTemp',
  'minAirHum',
  'maxLux',
  'maxWaterDistance',
];

const CONFIG_MARKER = 'CONFIG_SUGGESTION';

const pickProvider = () => {
  const preferred = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
  if (preferred === 'openai' && process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return null;
};

const buildSystemPrompt = (context = {}) => {
  const presetsText = (context.presets || [])
    .map((p) => `- ${p.name} (${p.key}): ${JSON.stringify(p.config)}`)
    .join('\n');

  const sensor = context.sensor || {};
  const deployed = context.deployedThresholds || {};

  return `Bạn là trợ lý AI cho hệ thống vườn thông minh IoT (ESP32 + cảm biến).
Trả lời bằng tiếng Việt, ngắn gọn, thực tế, dễ hiểu với người trồng cây.

NGỮ CẢNH HIỆN TẠI:
- Nhiệt độ: ${sensor.nhiet_do ?? '--'}°C
- Độ ẩm đất: ${sensor.do_am_dat ?? '--'}%
- Độ ẩm không khí: ${sensor.do_am_khong_khi ?? '--'}%
- Ánh sáng: ${sensor.anh_sang ?? '--'} lux
- Mực nước (khoảng cách cảm biến): ${sensor.muc_nuoc ?? '--'} cm
- Chế độ AUTO: ${context.autoMode ?? '--'}
- Trạng thái bơm: ${context.pumpStatus ?? '--'}
- Tình trạng vườn: ${context.gardenStatus ?? '--'}

CẤU HÌNH ĐANG CHẠY TRÊN ESP32:
${JSON.stringify(deployed, null, 2)}

PRESET CÓ SẴN:
${presetsText || '(chưa có preset)'}

QUY TẮC NGƯỠNG (firmware AUTO):
- minSoil: đất dưới mức này → cần tưới
- targetSoil: đạt mức này → dừng tưới AUTO (không phải trần tối đa)
- maxTemp: nhiệt độ vượt → cảnh báo nóng
- minAirHum: độ ẩm KK dưới → cảnh báo khô
- maxLux: ánh sáng vượt → quá sáng
- maxWaterDistance: khoảng cách nước lớn → mực nước thấp

Khi người dùng hỏi nên cấu hình thế nào, hãy:
1. Giải thích lý do ngắn gọn
2. Ưu tiên preset phù hợp nếu có
3. Nếu đề xuất bộ ngưỡng cụ thể, thêm KHỐI JSON ở CUỐI câu trả lời theo đúng format:

${CONFIG_MARKER}
{"minSoil":45,"targetSoil":70,"maxTemp":32,"minAirHum":55,"maxLux":18000,"maxWaterDistance":20,"presetKey":"rau","label":"Rau"}

Chỉ thêm khối trên khi thực sự gợi ý áp dụng cấu hình. Các giá trị phải là số hợp lý.
presetKey là tùy chọn (key preset khớp nếu có). label là tên gợi ý ngắn.
Không bịa dữ liệu cảm biến. Nếu thiếu dữ liệu, nói rõ.`;
};

const sanitizeSuggestion = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const suggestion = {};
  let valid = false;

  THRESHOLD_KEYS.forEach((key) => {
    const value = Number(raw[key]);
    if (!Number.isFinite(value)) return;
    suggestion[key] = value;
    valid = true;
  });

  if (!valid) return null;

  if (typeof raw.presetKey === 'string' && raw.presetKey.trim()) {
    suggestion.presetKey = raw.presetKey.trim();
  }
  if (typeof raw.label === 'string' && raw.label.trim()) {
    suggestion.label = raw.label.trim();
  }

  return suggestion;
};

const extractSuggestion = (text) => {
  if (!text || typeof text !== 'string') {
    return { reply: text || '', suggestion: null };
  }

  const markerIndex = text.indexOf(CONFIG_MARKER);
  if (markerIndex === -1) {
    return { reply: text.trim(), suggestion: null };
  }

  const reply = text.slice(0, markerIndex).trim();
  const jsonPart = text.slice(markerIndex + CONFIG_MARKER.length).trim();
  const jsonMatch = jsonPart.match(/\{[\s\S]*?\}/);

  if (!jsonMatch) {
    return { reply: text.trim(), suggestion: null };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return { reply, suggestion: sanitizeSuggestion(parsed) };
  } catch {
    return { reply: text.trim(), suggestion: null };
  }
};

const toGeminiContents = (systemPrompt, messages) => {
  const history = (messages || [])
    .filter((m) => m?.role && m?.content)
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content) }],
    }));

  return {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: history.length > 0 ? history : [{ role: 'user', parts: [{ text: 'Xin chào' }] }],
  };
};

const callGemini = async (systemPrompt, messages) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    ...toGeminiContents(systemPrompt, messages),
    generationConfig: {
      temperature: 0.65,
      maxOutputTokens: 1200,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.error?.message || `Gemini HTTP ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim();

  if (!text) throw new Error('Gemini không trả về nội dung');
  return text;
};

const callOpenAI = async (systemPrompt, messages) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...(messages || []).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content),
    })),
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.65,
      max_tokens: 1200,
      messages: chatMessages,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.error?.message || `OpenAI HTTP ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('OpenAI không trả về nội dung');
  return text;
};

const handleAssistantChat = async ({ messages, context }) => {
  const provider = pickProvider();
  if (!provider) {
    const err = new Error(
      'Chưa cấu hình AI. Thêm GEMINI_API_KEY hoặc OPENAI_API_KEY vào server/.env'
    );
    err.status = 503;
    throw err;
  }

  const safeMessages = Array.isArray(messages)
    ? messages.slice(-12).filter((m) => m?.content && (m.role === 'user' || m.role === 'assistant'))
    : [];

  const systemPrompt = buildSystemPrompt(context);
  const rawText = provider === 'openai'
    ? await callOpenAI(systemPrompt, safeMessages)
    : await callGemini(systemPrompt, safeMessages);

  const { reply, suggestion } = extractSuggestion(rawText);

  return {
    reply,
    suggestion,
    provider,
  };
};

module.exports = {
  handleAssistantChat,
  pickProvider,
};
