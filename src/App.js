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

  const statusLabel = {
    connected: { text: '🟢 Đã kết nối', cls: 'online' },
    reconnecting: { text: '🟡 Đang kết nối lại...', cls: 'reconnecting' },
    disconnected: { text: '🔴 Mất kết nối', cls: 'offline' },
    offline: { text: '🔴 Ngoại tuyến', cls: 'offline' },
    connecting: { text: '🟡 Đang kết nối...', cls: 'reconnecting' },
  };
  const currentStatus = statusLabel[mqttStatus] || statusLabel.connecting;

  const displayedHistory = [...history].reverse().slice(0, historyFilter);

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
        {/* Sensor Cards */}
        <section className="section">
          <SensorCard sensorData={sensorData} connected={connected} />
        </section>

        {/* Controls */}
        <section className="section">
          <ControlButtons connected={connected} />
        </section>

        {/* Chart */}
        <section className="section">
          <SensorChart history={history} />
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
                      <td style={{ color: '#ffd43b' }}>{row.muc_nuoc ?? '--'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="no-data">
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
    </div>
  );
}

export default App;
