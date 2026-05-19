import React from 'react';

import SensorCard from './SensorCard';
import SensorChart from './SensorChart';
import ControlButtons from './ControlButtons';

function DashboardPage({
  alerts,
  configReady,
  sensorData,
  connected,
  gardenStatusLabel,
  gardenStatusClass,
  autoMode,
  pumpStatus,
  pumpStatusLabel,
  needsWatering,
  history,
  historyFilter,
  onHistoryFilterChange,
  historyDate,
  onHistoryDateChange,
  onClearHistory,
  canControl,
}) {
  const displayedHistory = [...history].reverse().slice(0, historyFilter);
  const wateringLabel = needsWatering ? 'Cần tưới' : 'Không cần';

  return (
    <>
      {!configReady && (
        <section className="section info-banner">
          <div className="info-title">Chưa cấu hình cây trồng</div>
          <div className="info-subtitle">
            Vui lòng chọn preset hoặc lưu cấu hình tùy chỉnh để bắt đầu phân tích.
          </div>
        </section>
      )}

      {alerts.length > 0 && configReady && (
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
          <div className="status-label">Trạng thái bơm</div>
          <div className={`status-value ${pumpStatus === 'DANG_TUOI' ? 'ok' : 'muted'}`}>
            {pumpStatusLabel}
          </div>
        </div>
        <div className="status-card">
          <div className="status-label">Tình trạng vườn</div>
          {configReady ? (
            <div className={`status-value ${gardenStatusClass}`}>
              {gardenStatusLabel}
            </div>
          ) : (
            <div className="status-value muted">Chưa cấu hình cây trồng</div>
          )}
        </div>
        <div className="status-card">
          <div className="status-label">Cần tưới</div>
          {configReady ? (
            <div className={`status-value ${needsWatering ? 'warn' : 'ok'}`}>
              {wateringLabel}
            </div>
          ) : (
            <div className="status-value muted">Chưa cấu hình cây trồng</div>
          )}
        </div>
      </section>

      <section className="section">
        <SensorCard sensorData={sensorData} connected={connected} />
      </section>

      <section className="section">
        <ControlButtons
          connected={connected}
          autoMode={autoMode}
          pumpStatus={pumpStatus}
          canControl={canControl}
        />
      </section>

      <section className="section">
        <SensorChart history={history} />
      </section>

      <section className="section history-section">
        <div className="history-header">
          <h3>🗂️ Lịch sử dữ liệu</h3>
          <div className="history-controls">
            <input
              className="history-date"
              type="date"
              value={historyDate}
              onChange={(e) => onHistoryDateChange(e.target.value)}
            />
            <select
              className="history-filter"
              value={historyFilter}
              onChange={(e) => onHistoryFilterChange(Number(e.target.value))}
            >
              <option value={10}>10 bản ghi gần nhất</option>
              <option value={20}>20 bản ghi gần nhất</option>
              <option value={50}>50 bản ghi gần nhất</option>
            </select>
            <button className="btn-clear" onClick={onClearHistory}>
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
                    📡 Chưa có dữ liệu — thử đổi ngày hoặc kiểm tra ESP32...
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
    </>
  );
}

export default DashboardPage;
