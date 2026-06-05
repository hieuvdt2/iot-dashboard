import React, { useState, useEffect } from 'react';
import { mqttService } from '../services/mqttService';
import { IconText } from './AppIcon';
import { ManualPumpScene, AutoPumpScene } from './control/ControlSceneIllustrations';
import { useIsMobile } from '../hooks/useIsMobile';

const PENDING_LABELS = {
  auto_on:  'Đang chuyển sang chế độ AUTO...',
  auto_off: 'Đang chuyển sang chế độ thủ công...',
  bat_bom:  'Đang bật máy bơm...',
  tat_bom:  'Đang tắt máy bơm...',
};

const PENDING_TIMEOUT_MS = 10000;

function isPendingFulfilled(command, autoMode, pumpStatus) {
  if (!command) return true;
  const isAuto = autoMode === 'BAT';
  const isWatering = pumpStatus === 'DANG_TUOI';
  switch (command) {
    case 'auto_on':  return isAuto;
    case 'auto_off': return !isAuto;
    case 'bat_bom':  return isWatering;
    case 'tat_bom':  return !isWatering;
    default:         return true;
  }
}

function ControlButtons({ connected, autoMode, pumpStatus, manualSwitch, manualSwitchActive, pumpWebRequest, canControl }) {
  const isMobile = useIsMobile();
  const [lastAction, setLastAction] = useState(null);
  const [pendingCommand, setPendingCommand] = useState(null);
  const [pendingError, setPendingError] = useState(null);

  const handleControl = (command, label) => {
    if (!connected || pendingCommand || !canControl) return;
    setPendingError(null);
    setPendingCommand(command);
    mqttService.publishControl(command);
    setLastAction({ command, label, time: new Date().toLocaleTimeString('vi-VN') });
  };

  useEffect(() => {
    if (!pendingCommand) return undefined;

    if (isPendingFulfilled(pendingCommand, autoMode, pumpStatus)) {
      setPendingCommand(null);
      setPendingError(null);
      return undefined;
    }

    const timeout = setTimeout(() => {
      setPendingCommand(null);
      setPendingError('Thiết bị chưa phản hồi. Vui lòng thử lại.');
    }, PENDING_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [pendingCommand, autoMode, pumpStatus]);

  const isAuto     = autoMode === 'BAT';
  const isWatering = pumpStatus === 'DANG_TUOI';

  const controlSource = (() => {
    if (isAuto) {
      if (manualSwitch) return 'Công tắc cơ đang BẬT (AUTO đang điều khiển bơm)';
      return null;
    }
    if (manualSwitchActive) return 'Đang bật bởi công tắc cơ';
    if (pumpWebRequest && isWatering) return 'Đang bật bởi web';
    if (isWatering) return 'Máy bơm đang chạy';
    if (manualSwitch && !isWatering) return 'Công tắc cơ BẬT — bơm đang tắt (chờ lệnh hoặc an toàn)';
    return null;
  })();

  const pumpCommand = isWatering ? 'tat_bom' : 'bat_bom';
  const pumpLabel   = isWatering ? 'Tắt bơm' : 'Bật bơm';
  const modeCommand = isAuto ? 'auto_off' : 'auto_on';
  const modeLabel   = isAuto ? 'Tắt AUTO' : 'Bật AUTO';

  const isBusy = Boolean(pendingCommand);
  const disabled = !connected || isBusy || !canControl;
  const showPumpButton = !isAuto && !(isBusy && pendingCommand === 'auto_on');

  const headerTone = isBusy ? 'busy' : isAuto ? 'auto' : isWatering ? 'pump' : 'idle';

  const renderBtnContent = (command, iconName, label) => {
    if (pendingCommand === command) {
      return (
        <>
          <span className="btn-spinner" aria-hidden="true" />
          {PENDING_LABELS[command] || 'Đang gửi...'}
        </>
      );
    }
    return <IconText icon={iconName} iconSize={16}>{label}</IconText>;
  };

  return (
    <div className="control-panel">
      <div className={`control-header control-header--${headerTone}`}>
        <div className="control-header-info">
          <div className="control-header-title">
            {isBusy ? (
              <>
                <span className="btn-spinner" aria-hidden="true" />
                <span className="control-header-title-busy">{PENDING_LABELS[pendingCommand]}</span>
              </>
            ) : isAuto ? (
              <IconText icon="bot" iconSize={18}>Chế độ tự động (AI)</IconText>
            ) : isWatering ? (
              <IconText icon="droplets" iconSize={18}>Đang bơm thủ công</IconText>
            ) : (
              <IconText icon="pause" iconSize={18}>Hệ thống đang chờ</IconText>
            )}
          </div>

          {controlSource && !isBusy && (
            <p className={`control-header-meta ${manualSwitchActive ? 'warn' : ''}`}>
              <IconText icon={manualSwitchActive ? 'plug' : 'globe'} iconSize={14}>
                {controlSource}
              </IconText>
            </p>
          )}
          {lastAction && !isBusy && (
            <p className="control-header-meta muted">
              Lần cuối: <strong>{lastAction.label}</strong> lúc {lastAction.time}
            </p>
          )}
          {isBusy && (
            <p className="control-header-meta">Đang đợi thiết bị xác nhận qua MQTT...</p>
          )}
          {pendingError && !isBusy && (
            <p className="control-header-meta error">{pendingError}</p>
          )}
        </div>

        <div className="control-header-actions">
          <button
            type="button"
            className={`control-btn control-btn--auto ${isAuto ? 'is-active' : ''}`}
            onClick={() => handleControl(modeCommand, modeLabel)}
            disabled={disabled}
            aria-busy={pendingCommand === modeCommand}
          >
            {renderBtnContent(modeCommand, 'bot', modeLabel)}
          </button>

          {showPumpButton && (
            <button
              type="button"
              className={`control-btn control-btn--pump ${isWatering ? 'is-active' : ''}`}
              onClick={() => handleControl(pumpCommand, pumpLabel)}
              disabled={disabled}
              aria-busy={pendingCommand === pumpCommand}
            >
              {renderBtnContent(pumpCommand, 'droplets', pumpLabel)}
            </button>
          )}
        </div>
      </div>

      <div className="control-scene-wrap">
        {isBusy ? (
          <div className="control-scene-loading" role="status" aria-live="polite">
            <div className="control-scene-spinner" aria-hidden="true" />
            <p className="control-scene-loading-title">{PENDING_LABELS[pendingCommand]}</p>
            <p className="control-scene-loading-sub">Đang đợi thiết bị phản hồi trạng thái mới...</p>
          </div>
        ) : isAuto ? (
          <AutoPumpScene isWatering={isWatering} vertical={isMobile} />
        ) : (
          <ManualPumpScene isWatering={isWatering} vertical={isMobile} />
        )}
      </div>

      {(!connected || (!canControl && connected)) && (
        <div className="control-warning">
          <IconText icon="alert-triangle" iconSize={16}>
            {!connected
              ? 'Cần kết nối MQTT để điều khiển bơm'
              : 'Bạn cần quyền admin để điều khiển bơm'}
          </IconText>
        </div>
      )}
    </div>
  );
}

export default ControlButtons;
