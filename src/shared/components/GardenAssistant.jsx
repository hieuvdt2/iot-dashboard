import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  sendAssistantMessage,
  ASSISTANT_QUICK_PROMPTS,
} from '../services/assistantService';

const THRESHOLD_LABELS = {
  minSoil: 'Độ ẩm đất tối thiểu (%)',
  targetSoil: 'Mục tiêu dừng tưới (%)',
  maxTemp: 'Nhiệt độ tối đa (°C)',
  minAirHum: 'Độ ẩm KK tối thiểu (%)',
  maxLux: 'Ánh sáng tối đa (lux)',
  maxWaterDistance: 'Mực nước tối đa (cm)',
};

function SuggestionCard({ suggestion, onApply, canEdit }) {
  if (!suggestion) return null;

  const entries = Object.entries(THRESHOLD_LABELS)
    .map(([key, label]) => ({ key, label, value: suggestion[key] }))
    .filter((item) => item.value !== undefined);

  return (
    <div className="assistant-suggestion">
      <div className="assistant-suggestion-title">
        Gợi ý cấu hình{suggestion.label ? `: ${suggestion.label}` : ''}
      </div>
      <div className="assistant-suggestion-grid">
        {entries.map((item) => (
          <div key={item.key} className="assistant-suggestion-item">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="btn-save assistant-apply-btn"
        disabled={!canEdit}
        onClick={() => onApply(suggestion)}
      >
        Áp dụng gợi ý vào cấu hình
      </button>
      {!canEdit && (
        <p className="assistant-suggestion-note">Chỉ tài khoản admin mới áp dụng được.</p>
      )}
    </div>
  );
}

function GardenAssistant({
  sensorData,
  deployedThresholds,
  presets,
  gardenStatusLabel,
  autoMode,
  pumpStatusLabel,
  canEdit,
  onApplySuggestion,
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Xin chào! Tôi là trợ lý vườn thông minh. Hãy mô tả loại cây bạn trồng hoặc hỏi về cấu hình ngưỡng phù hợp — tôi có thể gợi ý và áp dụng vào bản nháp cấu hình.',
      suggestion: null,
    },
  ]);

  const listRef = useRef(null);
  const inputRef = useRef(null);

  const context = useMemo(() => ({
    sensor: sensorData,
    deployedThresholds,
    presets: presets.map((p) => ({ key: p.key, name: p.name, config: p.config })),
    gardenStatus: gardenStatusLabel,
    autoMode,
    pumpStatus: pumpStatusLabel,
  }), [
    sensorData,
    deployedThresholds,
    presets,
    gardenStatusLabel,
    autoMode,
    pumpStatusLabel,
  ]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open, loading]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError('');
    setInput('');

    const nextMessages = [...messages, { role: 'user', content: trimmed, suggestion: null }];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const payload = nextMessages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map(({ role, content }) => ({ role, content }));

      const data = await sendAssistantMessage({
        messages: payload,
        context,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply,
          suggestion: data.suggestion || null,
        },
      ]);
    } catch (err) {
      setError(err.message || 'Không thể kết nối trợ lý AI');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage(input);
  };

  const handleApply = (suggestion) => {
    const { presetKey, label, ...config } = suggestion;
    onApplySuggestion(config, presetKey || '', label || '');
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className={`assistant-fab ${open ? 'is-open' : ''}`}
        aria-label={open ? 'Đóng trợ lý vườn' : 'Mở trợ lý vườn'}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <img src={`${process.env.PUBLIC_URL}/robot-garden.png`} alt="" className="assistant-fab-icon" />
        )}
      </button>

      {open && (
        <div className="assistant-panel" role="dialog" aria-label="Trợ lý vườn thông minh">
          <div className="assistant-header">
            <div className="assistant-header-info">
              <img
                src={`${process.env.PUBLIC_URL}/robot-garden.png`}
                alt=""
                className="assistant-header-avatar"
              />
              <div>
                <div className="assistant-header-title">Trợ lý vườn</div>
                <div className="assistant-header-sub">Gemini / OpenAI · Smart Garden</div>
              </div>
            </div>
            <button type="button" className="btn-ghost assistant-close" onClick={() => setOpen(false)}>
              Đóng
            </button>
          </div>

          <div className="assistant-quick-prompts">
            {ASSISTANT_QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="assistant-chip"
                disabled={loading}
                onClick={() => sendMessage(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="assistant-messages" ref={listRef}>
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`assistant-message ${message.role === 'user' ? 'is-user' : 'is-bot'}`}
              >
                <div className="assistant-bubble">{message.content}</div>
                {message.role === 'assistant' && message.suggestion && (
                  <SuggestionCard
                    suggestion={message.suggestion}
                    onApply={handleApply}
                    canEdit={canEdit}
                  />
                )}
              </div>
            ))}
            {loading && (
              <div className="assistant-message is-bot">
                <div className="assistant-bubble assistant-typing">Đang suy nghĩ...</div>
              </div>
            )}
          </div>

          {error && <div className="assistant-error">{error}</div>}

          <form className="assistant-input-row" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              className="assistant-input"
              placeholder="Hỏi về cây trồng, ngưỡng, mẫu cài đặt..."
              value={input}
              disabled={loading}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" className="btn-save assistant-send" disabled={loading || !input.trim()}>
              Gửi
            </button>
          </form>
        </div>
      )}
    </>
  );
}

export default GardenAssistant;
