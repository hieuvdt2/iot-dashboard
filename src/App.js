import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

import SensorCard from './shared/components/SensorCard';
import SensorChart from './shared/components/SensorChart';
import ControlButtons from './shared/components/ControlButtons';
import { mqttService } from './shared/services/mqttService';
import {
  addToHistory,
  loadHistoryFromStorage,
  saveHistoryToStorage,
} from './shared/utils/sensorHistory';

function App() {
  const [sensorData, setSensorData] = useState(null);
  const [history, setHistory] = useState(() => loadHistoryFromStorage());
  const [connected, setConnected] = useState(false);
  const [mqttStatus, setMqttStatus] = useState('connecting');
  const [historyFilter, setHistoryFilter] = useState(20);
  const [toast, setToast] = useState(null);
  const [thresholds, setThresholds] = useState(() => {
    try {
      const saved = localStorage.getItem('iot_thresholds');
      return saved
        ? JSON.parse(saved)
        : {
            minSoil: 35,
            targetSoil: 65,
            maxTemp: 35,
            minAirHum: 50,
            maxLux: 20000,
            maxWaterDistance: 20,
          };
    } catch (e) {
      return {
        minSoil: 35,
        targetSoil: 65,
        maxTemp: 35,
        minAirHum: 50,
        maxLux: 20000,
        maxWaterDistance: 20,
      };
    }
  });

  const handleSensor = useCallback((data) => {
    setSensorData(data);
    setHistory((prev) => {
      const updated = addToHistory(prev, data);
      saveHistoryToStorage(updated);
      return updated;
    });
  }, []);

  const handleConnect = useCallback((status) => {
    setConnected(status);
  }, []);

  const handleStatus = useCallback((status) => {
    setMqttStatus(status);
  }, []);

  useEffect(() => {
    mqttService.on('sensor', handleSensor);
    mqttService.on('connect', handleConnect);
    mqttService.on('status', handleStatus);
    mqttService.connect();

    return () => {
      mqttService.off('sensor', handleSensor);
      mqttService.off('connect', handleConnect);
      mqttService.off('status', handleStatus);
    };
  }, [handleSensor, handleConnect, handleStatus]);

  const clearHistory = () => {
    setHistory([]);
    saveHistoryToStorage([]);
  };

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const updateThreshold = (key, value) => {
    setThresholds((prev) => ({ ...prev, [key]: value }));
  };

  const saveThresholds = () => {
    localStorage.setItem('iot_thresholds', JSON.stringify(thresholds));
    mqttService.publishConfig(thresholds);
    setToast({ type: 'success', message: 'Đã gửi cấu hình xuống ESP32' });
  };

  const statusLabel = {
    connected: { text: '🟢 Đã kết nối', cls: 'online' },
    reconnecting: { text: '🟡 Đang kết nối lại...', cls: 'reconnecting' },
    disconnected: { text: '🔴 Mất kết nối', cls: 'offline' },
    offline: { text: '🔴 Ngoại tuyến', cls: 'offline' },
    connecting: { text: '🟡 Đang kết nối...', cls: 'reconnecting' },
  };
  const currentStatus = statusLabel[mqttStatus] || statusLabel.connecting;

  const displayedHistory = [...history].reverse().slice(0, historyFilter);

  const alerts = [];
  if (sensorData) {
    if (sensorData.do_am_dat < thresholds.minSoil) {
      alerts.push('Đất đang khô, cần tưới');
    }
    if (sensorData.nhiet_do > thresholds.maxTemp) {
      alerts.push('Nhiệt độ cao');
    }
    if (sensorData.do_am_khong_khi < thresholds.minAirHum) {
      alerts.push('Không khí khô');
    }
    if (sensorData.anh_sang > thresholds.maxLux) {
      alerts.push('Ánh sáng quá mạnh');
    }
    if (sensorData.muc_nuoc > thresholds.maxWaterDistance) {
      alerts.push('Cảnh báo: mực nước thấp');
    }
  }

  useEffect(() => {
    if (alerts.length > 0) {
      setToast({ type: 'warning', message: alerts[0] });
    }
  }, [alerts.length]);

  const gardenStatus = sensorData?.garden_status || '---';
  const autoMode = sensorData?.auto_mode || '---';
  const pumpStatus = sensorData?.trang_thai_bom || '---';
  const gardenStatusLabelMap = {
    TOT: 'Tốt',
    CAN_CHU_Y: 'Cần chú ý',
    NGUY_HIEM: 'Nguy hiểm',
  };
  const autoModeLabelMap = {
    BAT: 'Bật',
    TAT: 'Tắt',
  };
  const pumpStatusLabelMap = {
    DANG_TUOI: 'Đang tưới',
    KHONG_TUOI: 'Không tưới',
  };
  const gardenStatusLabel = gardenStatusLabelMap[gardenStatus] || gardenStatus;
  const autoModeLabel = autoModeLabelMap[autoMode] || autoMode;
  const pumpStatusLabel = pumpStatusLabelMap[pumpStatus] || pumpStatus;
  const gardenStatusClass = typeof gardenStatus === 'string'
    ? gardenStatus.toLowerCase()
    : 'muted';

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <h1>📊 IoT Dashboard</h1>
          <span className="header-subtitle">ESP32 Sensor Monitor</span>
        </div>
        <div className={`connection-badge ${currentStatus.cls}`}>
          {currentStatus.text}
        </div>
      </header>

      {/* Main content */}
      <main className="app-main">
        {alerts.length > 0 && (
          <section className="section alert-banner">
            <div className="alert-title">Cảnh báo môi trường</div>
            <div className="alert-list">
              {alerts.map((item, index) => (
                <span className="alert-item" key={`${item}-${index}`}>
                  {item}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="section status-section">
          <div className="status-card">
            <div className="status-label">Tình trạng vườn</div>
            <div className={`status-value ${gardenStatusClass}`}>
              {gardenStatusLabel}
            </div>
          </div>
          <div className="status-card">
            <div className="status-label">Chế độ</div>
            <div className={`status-value ${autoMode === 'BAT' ? 'ok' : 'warn'}`}>
              {autoModeLabel}
            </div>
          </div>
          <div className="status-card">
            <div className="status-label">Trạng thái bơm</div>
            <div className={`status-value ${pumpStatus === 'DANG_TUOI' ? 'ok' : 'muted'}`}>
              {pumpStatusLabel}
            </div>
          </div>
        </section>

        {/* Sensor Cards */}
        <section className="section">
          <SensorCard sensorData={sensorData} connected={connected} />
        </section>

        {/* Controls */}
        <section className="section">
          <ControlButtons
            connected={connected}
            autoMode={autoMode}
            pumpStatus={pumpStatus}
          />
        </section>

        {/* Chart */}
        <section className="section">
          <SensorChart history={history} />
        </section>

        <section className="section settings-section">
          <div className="settings-header">
            <h3>⚙️ Thiết lập ngưỡng</h3>
            <button className="btn-save" onClick={saveThresholds}>
              Lưu & Gửi ESP32
            </button>
          </div>
          <div className="settings-grid">
            <label className="setting-field">
              <span>Độ ẩm đất tối thiểu (%)</span>
              <input
                type="number"
                value={thresholds.minSoil}
                onChange={(e) => updateThreshold('minSoil', Number(e.target.value))}
              />
            </label>
            <label className="setting-field">
              <span>Mức độ ẩm đất mục tiêu (%)</span>
              <input
                type="number"
                value={thresholds.targetSoil}
                onChange={(e) => updateThreshold('targetSoil', Number(e.target.value))}
              />
            </label>
            <label className="setting-field">
              <span>Nhiệt độ tối đa (°C)</span>
              <input
                type="number"
                value={thresholds.maxTemp}
                onChange={(e) => updateThreshold('maxTemp', Number(e.target.value))}
              />
            </label>
            <label className="setting-field">
              <span>Độ ẩm KK tối thiểu (%)</span>
              <input
                type="number"
                value={thresholds.minAirHum}
                onChange={(e) => updateThreshold('minAirHum', Number(e.target.value))}
              />
            </label>
            <label className="setting-field">
              <span>Cường độ ánh sáng tối đa (lux)</span>
              <input
                type="number"
                value={thresholds.maxLux}
                onChange={(e) => updateThreshold('maxLux', Number(e.target.value))}
              />
            </label>
            <label className="setting-field">
              <span>Khoảng cách mực nước tối đa (cm)</span>
              <input
                type="number"
                value={thresholds.maxWaterDistance}
                onChange={(e) => updateThreshold('maxWaterDistance', Number(e.target.value))}
              />
            </label>
          </div>
        </section>

        {/* History Table */}
        <section className="section history-section">
          <div className="history-header">
            <h3>🗂️ Lịch sử dữ liệu</h3>
            <div className="history-controls">
              <select
                className="history-filter"
                value={historyFilter}
                onChange={(e) => setHistoryFilter(Number(e.target.value))}
              >
                <option value={10}>10 bản ghi gần nhất</option>
                <option value={20}>20 bản ghi gần nhất</option>
                <option value={50}>50 bản ghi gần nhất</option>
              </select>
              <button className="btn-clear" onClick={clearHistory}>
                🗑️ Xóa lịch sử
              </button>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Thời gian</th>
                  <th>🌡️ Nhiệt độ (°C)</th>
                  <th>💧 Độ ẩm KK (%)</th>
                  <th>🌱 Độ ẩm đất (%)</th>
                  <th>💡 Ánh sáng (lux)</th>
                  <th>🌊 Mực nước (cm)</th>
                </tr>
              </thead>
              <tbody>
                {displayedHistory.length > 0 ? (
                  displayedHistory.map((row, i) => (
                    <tr key={i}>
                      <td className="row-num">{history.length - i}</td>
                      <td>{row.time}</td>
                      <td style={{ color: '#ff6b6b' }}>{row.nhiet_do ?? '--'}</td>
                      <td style={{ color: '#4dabf7' }}>{row.do_am_khong_khi ?? '--'}</td>
                      <td style={{ color: '#51cf66' }}>{row.do_am_dat ?? '--'}</td>
                      <td style={{ color: '#ffa94d' }}>{row.anh_sang ?? '--'}</td>
                      <td style={{ color: '#ffd43b' }}>{row.muc_nuoc ?? '--'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="no-data">
                      📡 Chưa có dữ liệu — đang chờ tín hiệu từ ESP32...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {history.length > 0 && (
            <div className="history-footer">
              Tổng: <strong>{history.length}</strong> bản ghi
            </div>
          )}
        </section>
      </main>

      <footer className="app-footer">
        IoT Dashboard · ESP32 via MQTT · HiveMQ Cloud
      </footer>

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default App;
