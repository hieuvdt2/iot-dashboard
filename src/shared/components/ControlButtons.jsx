import React, { useState } from 'react';
import { mqttService } from '../services/mqttService';

function ControlButtons({ connected, autoMode, pumpStatus, canControl }) {
  const [lastAction, setLastAction] = useState(null);
  const [sending, setSending] = useState(false);

  const handleControl = (command, label) => {
    if (!connected || sending || !canControl) return;
    setSending(true);
    mqttService.publishControl(command);
    setLastAction({ command, label, time: new Date().toLocaleTimeString('vi-VN') });
    setTimeout(() => setSending(false), 1000);
  };

  const isAuto = autoMode === 'BAT';
  const isWatering = pumpStatus === 'DANG_TUOI';
  const modeLabel = isAuto ? 'Tự động' : 'Thủ công';
  const pumpLabel = isWatering ? 'Tắt bơm' : 'Bật bơm';
  const pumpCommand = isWatering ? 'tat_bom' : 'bat_bom';
  const modeCommand = isAuto ? 'auto_off' : 'auto_on';
  const modeActionLabel = isAuto ? 'Tắt AUTO' : 'Bật AUTO';
  const pumpStatusLabelMap = {
    DANG_TUOI: 'Đang tưới',
    KHONG_TUOI: 'Không tưới',
  };
  const pumpStatusLabel = pumpStatusLabelMap[pumpStatus] || pumpStatus || '---';

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

      <div className="control-status">
        <span className="status-pill">Chế độ: {modeLabel}</span>
        <span className="status-pill">Bơm: {pumpStatusLabel}</span>
      </div>

      <div className="control-buttons">
        <button
          className={`btn btn-auto ${sending ? 'sending' : ''}`}
          onClick={() => handleControl(modeCommand, modeActionLabel)}
          disabled={!connected || sending || !canControl}
        >
          <span className="btn-icon">🧠</span>
          <span>{modeActionLabel}</span>
        </button>

        <button
          className={`btn ${isWatering ? 'btn-off' : 'btn-on'} ${sending ? 'sending' : ''}`}
          onClick={() => handleControl(pumpCommand, pumpLabel)}
          disabled={!connected || sending || isAuto || !canControl}
        >
          <span className="btn-icon">💦</span>
          <span>{pumpLabel}</span>
        </button>
      </div>

      {!connected && (
        <div className="control-warning">
          ⚠️ Cần kết nối MQTT để điều khiển bơm
        </div>
      )}

      {!canControl && (
        <div className="control-warning">
          ⚠️ Bạn không có quyền điều khiển bơm
        </div>
      )}

      {isAuto && (
        <div className="control-warning">
          ⚠️ Đang ở chế độ AUTO, khóa điều khiển thủ công
        </div>
      )}
    </div>
  );
}

export default ControlButtons;
