import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getChartData, SENSOR_KEYS } from '../utils/sensorHistory';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="tooltip-time">{label}</p>
        {payload.map((entry) => (
          <p key={entry.dataKey} style={{ color: entry.color }}>
            {entry.dataKey}: <strong>{entry.value ?? '--'}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function SensorChart({ history }) {
  const [activeSensors, setActiveSensors] = useState(
    Object.fromEntries(SENSOR_KEYS.map((s) => [s.key, true]))
  );

  const chartData = getChartData(history);

  const toggleSensor = (key) => {
    setActiveSensors((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3>📈 Biểu đồ Realtime</h3>
        <div className="chart-toggles">
          {SENSOR_KEYS.map((s) => (
            <button
              key={s.key}
              className={`toggle-btn ${activeSensors[s.key] ? 'active' : 'inactive'}`}
              style={activeSensors[s.key] ? { borderColor: s.color, color: s.color } : {}}
              onClick={() => toggleSensor(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="chart-empty">
          <span>📡</span>
          <p>Đang chờ dữ liệu từ ESP32...</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
            <XAxis
              dataKey="time"
              tick={{ fill: '#718096', fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fill: '#718096', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '12px', fontSize: '12px' }}
            />
            {SENSOR_KEYS.map((s) =>
              activeSensors[s.key] ? (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.label}
                  stroke={s.color}
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              ) : null
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default SensorChart;
