const fmt = (value, unit = '') => (
  value === null || value === undefined ? '--' : `${value}${unit}`
);

const buildSoilAlert = (soil, minSoil) => {
  if (typeof soil !== 'number' || typeof minSoil !== 'number') return null;
  if (soil >= minSoil) return null;

  const gap = minSoil - soil;
  const severity = gap >= 10 ? 'danger' : 'warning';

  return {
    id: 'soil-dry',
    icon: 'sprout',
    title: 'Đất đang khô',
    short: `Độ ẩm đất ${soil}%`,
    severity,
    detail: `Độ ẩm đất hiện tại ${soil}% — thấp hơn mức tối thiểu ${minSoil}% đã cài (còn thiếu ${gap}%).`,
    advice: 'Cân nhắc tưới thủ công hoặc bật chế độ AUTO nếu bơm chưa chạy.',
    metric: { label: 'Độ ẩm đất', current: soil, unit: '%', threshold: `≥ ${minSoil}%` },
  };
};

const buildTempAlert = (temp, maxTemp) => {
  if (typeof temp !== 'number' || typeof maxTemp !== 'number') return null;
  if (temp <= maxTemp) return null;

  const gap = temp - maxTemp;
  const severity = gap >= 5 ? 'danger' : 'warning';

  return {
    id: 'temp-high',
    icon: 'thermometer',
    title: 'Nhiệt độ cao',
    short: `${temp}°C`,
    severity,
    detail: `Nhiệt độ ${temp}°C vượt ngưỡng tối đa ${maxTemp}°C (cao hơn ${gap.toFixed(1)}°C).`,
    advice: 'Thông thoáng vườn, che nắng hoặc tưới nhẹ vào sáng sớm/chiều mát.',
    metric: { label: 'Nhiệt độ', current: temp, unit: '°C', threshold: `≤ ${maxTemp}°C` },
  };
};

const buildAirAlert = (airHum, minAirHum) => {
  if (typeof airHum !== 'number' || typeof minAirHum !== 'number') return null;
  if (airHum >= minAirHum) return null;

  const gap = minAirHum - airHum;
  const severity = gap >= 10 ? 'danger' : 'warning';

  return {
    id: 'air-dry',
    icon: 'wind',
    title: 'Không khí khô',
    short: `KK ${airHum}%`,
    severity,
    detail: `Độ ẩm không khí ${airHum}% — dưới mức tối thiểu ${minAirHum}% (thiếu ${gap}%).`,
    advice: 'Phun sương nhẹ hoặc đặt chậu gần nguồn ẩm; tránh gió nóng trực tiếp.',
    metric: { label: 'Độ ẩm KK', current: airHum, unit: '%', threshold: `≥ ${minAirHum}%` },
  };
};

const buildLightAlert = (light, maxLux) => {
  if (typeof light !== 'number' || typeof maxLux !== 'number') return null;
  if (light <= maxLux) return null;

  return {
    id: 'light-high',
    icon: 'sun',
    title: 'Ánh sáng quá mạnh',
    short: `${light >= 1000 ? `${(light / 1000).toFixed(1)}k` : light} lux`,
    severity: light > maxLux * 1.2 ? 'danger' : 'warning',
    detail: `Cường độ sáng ${fmt(light, ' lux')} vượt ngưỡng ${maxLux.toLocaleString()} lux.`,
    advice: 'Che bớt ánh nắng trực tiếp hoặc chuyển chậu sang vị trí rọi sáng vừa phải.',
    metric: {
      label: 'Ánh sáng',
      current: light,
      unit: ' lux',
      threshold: `≤ ${maxLux.toLocaleString()} lux`,
    },
  };
};

const buildWaterAlert = (water, maxWaterDistance) => {
  if (typeof water !== 'number' || typeof maxWaterDistance !== 'number') return null;
  if (water <= maxWaterDistance) return null;

  const gap = water - maxWaterDistance;
  const severity = gap >= 5 ? 'danger' : 'warning';

  return {
    id: 'water-low',
    icon: 'droplets',
    title: 'Mực nước thấp',
    short: `${water} cm`,
    severity,
    detail: `Khoảng cách mực nước ${water} cm — lớn hơn ngưỡng ${maxWaterDistance} cm (nước trong bể thấp).`,
    advice: 'Bổ sung nước cho bể chứa để bơm hoạt động ổn định.',
    metric: {
      label: 'Mực nước',
      current: water,
      unit: ' cm',
      threshold: `≤ ${maxWaterDistance} cm`,
    },
  };
};

// maxWaterDistance là cài đặt thiết bị, không phải ngưỡng cây trồng nên truyền riêng
export function buildEnvironmentAlerts(sensorData, thresholds = {}, maxWaterDistance) {
  if (!sensorData) return [];

  const {
    minSoil = 35,
    maxTemp = 35,
    minAirHum = 50,
    maxLux = 20000,
  } = thresholds;

  return [
    buildSoilAlert(sensorData.do_am_dat, minSoil),
    buildTempAlert(sensorData.nhiet_do, maxTemp),
    buildAirAlert(sensorData.do_am_khong_khi, minAirHum),
    buildLightAlert(sensorData.anh_sang, maxLux),
    buildWaterAlert(sensorData.muc_nuoc, maxWaterDistance),
  ].filter(Boolean);
}

export function alertSummary(alerts) {
  if (!alerts.length) return '';
  return alerts.map((a) => a.title).join(' · ');
}
