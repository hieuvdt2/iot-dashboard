import React from 'react';
import '../../styles/garden-dashboard.css';
import EnvironmentAlertBanner from './EnvironmentAlertBanner';
import GardenHeader from './garden/GardenHeader';
import MetricCards from './garden/MetricCards';
import GardenCharts from './garden/GardenCharts';
import AlertTimeline, { useAlertTimeline } from './garden/AlertTimeline';
import { useGardenChartData } from '../hooks/useGardenChartData';

function DashboardPage({
  alerts,
  configReady,
  sensorData,
  connected,
  gardenStatus,
  gardenStatusLabel,
  autoMode,
  pumpStatus,
  pumpStatusLabel,
  history,
  thresholds = {},
  maxWaterDistance,
  tankFullDistance,
}) {
  const { chartData, hourlyRaw, loading, lastSync } = useGardenChartData(sensorData);

  const timelineEvents = useAlertTimeline({
    history,
    alerts,
    pumpStatus,
    pumpStatusLabel,
    thresholds,
    maxWaterDistance,
    tankFullDistance,
  });

  return (
    <div className="garden-dashboard">
      {!configReady && (
        <div className="info-banner" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
          <div className="info-title" style={{ color: '#b45309' }}>Chưa cấu hình cây trồng</div>
          <div className="info-subtitle" style={{ color: '#4a7a5a' }}>
            Chọn mẫu hoặc lưu cấu hình tùy chỉnh để bắt đầu phân tích.
          </div>
        </div>
      )}

      {alerts.length > 0 && configReady && (
        <EnvironmentAlertBanner alerts={alerts} />
      )}

      <GardenHeader
        gardenStatus={gardenStatus}
        gardenStatusLabel={gardenStatusLabel}
        connected={connected}
        autoMode={autoMode}
        sensorData={sensorData}
        chartLastSync={lastSync}
      />

      <MetricCards
        sensorData={sensorData}
        hourlyRaw={hourlyRaw}
        thresholds={thresholds}
        maxWaterDistance={maxWaterDistance}
        tankFullDistance={tankFullDistance}
      />

      <GardenCharts
        chartData={chartData}
        loading={loading}
        maxWaterDistance={maxWaterDistance}
        tankFullDistance={tankFullDistance}
      />

      <AlertTimeline events={timelineEvents} />
    </div>
  );
}

export default DashboardPage;
