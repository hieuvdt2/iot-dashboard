import React, { useState } from 'react';
import { mqttService } from '../services/mqttService';

function ControlButtons({ connected }) {
  const [lastAction, setLastAction] = useState(null);
  const [sending, setSending] = useState(false);

  const handleControl = (command, label) => {
    if (!connected || sending) return;
    setSending(true);
    mqttService.publishControl(command);
    setLastAction({ command, label, time: new Date().toLocaleTimeString('vi-VN') });
    setTimeout(() => setSending(false), 1000);
  };

  return (
    <div className="control-section">
      <div className="control-header">
        <h3>🎛️ Điều khiển bơm nước</h3>
        {lastAction && (
          <span className="last-action">
            Lần cuối: <strong>{lastAction.label}</strong> lúc {lastAction.time}
          </span>
        )}
      </div>

      <div className="control-buttons">
        <button
          className={`btn btn-on ${sending ? 'sending' : ''}`}
          onClick={() => handleControl('bat_bom', 'Bật bơm')}
          disabled={!connected || sending}
        >
          <span className="btn-icon">💦</span>
          <span>Bật bơm</span>
        </button>

        <button
          className={`btn btn-off ${sending ? 'sending' : ''}`}
          onClick={() => handleControl('tat_bom', 'Tắt bơm')}
          disabled={!connected || sending}
        >
          <span className="btn-icon">🛑</span>
          <span>Tắt bơm</span>
        </button>
      </div>

      {!connected && (
        <div className="control-warning">
          ⚠️ Cần kết nối MQTT để điều khiển bơm
        </div>
      )}
    </div>
  );
}

export default ControlButtons;
