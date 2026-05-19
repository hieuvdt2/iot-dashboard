import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import './App.css';

import DashboardPage from './shared/components/DashboardPage';
import ConfigPage from './shared/components/ConfigPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminPage from './pages/AdminPage';
import { mqttService } from './shared/services/mqttService';
import { firebaseService } from './shared/services/firebaseService';
import {
  buildHistoryFromFirebase,
} from './shared/utils/sensorHistory';

const DEFAULT_CONFIG = {
  minSoil: 35,
  targetSoil: 65,
  maxTemp: 35,
  minAirHum: 50,
  maxLux: 20000,
  maxWaterDistance: 20,
};

const BASE_PRESETS = [
  {
    key: 'rau',
    name: 'Rau',
    isCustom: false,
    config: {
      minSoil: 45,
      targetSoil: 70,
      maxTemp: 32,
      minAirHum: 55,
      maxLux: 18000,
      maxWaterDistance: 20,
    },
  },
  {
    key: 'xuong_rong',
    name: 'Xương rồng',
    isCustom: false,
    config: {
      minSoil: 15,
      targetSoil: 30,
      maxTemp: 38,
      minAirHum: 35,
      maxLux: 22000,
      maxWaterDistance: 25,
    },
  },
  {
    key: 'lan',
    name: 'Lan',
    isCustom: false,
    config: {
      minSoil: 40,
      targetSoil: 60,
      maxTemp: 30,
      minAirHum: 60,
      maxLux: 16000,
      maxWaterDistance: 20,
    },
  },
  {
    key: 'cay_canh',
    name: 'Cây cảnh',
    isCustom: false,
    config: {
      minSoil: 35,
      targetSoil: 55,
      maxTemp: 34,
      minAirHum: 50,
      maxLux: 18000,
      maxWaterDistance: 20,
    },
  },
];

const CUSTOM_PRESETS_KEY = 'iot_presets_custom';

const loadCustomPresets = () => {
  try {
    const saved = localStorage.getItem(CUSTOM_PRESETS_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      ...item,
      isCustom: true,
    }));
  } catch (e) {
    return [];
  }
};

const saveCustomPresets = (presets) => {
  try {
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(presets));
  } catch (e) {
    // Ignore storage errors.
  }
};

const toPresetKey = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');

function App() {
  const [sensorData, setSensorData] = useState(null);
  const [history, setHistory] = useState([]);
  const [connected, setConnected] = useState(false);
  const [mqttStatus, setMqttStatus] = useState('connecting');
  const [historyFilter, setHistoryFilter] = useState(20);
  const [historyDate, setHistoryDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [customPresets, setCustomPresets] = useState(() => loadCustomPresets());
  const [authUser, setAuthUser] = useState(null);
  const [role, setRole] = useState('viewer');
  const [authError, setAuthError] = useState('');
  const [users, setUsers] = useState({});
  const [roles, setRoles] = useState({});
  const [configReady, setConfigReady] = useState(() => {
    try {
      return Boolean(localStorage.getItem('iot_thresholds'));
    } catch (e) {
      return false;
    }
  });
  const [thresholds, setThresholds] = useState(() => {
    try {
      const saved = localStorage.getItem('iot_thresholds');
      return saved
        ? JSON.parse(saved)
        : DEFAULT_CONFIG;
    } catch (e) {
      return DEFAULT_CONFIG;
    }
  });

  const presets = [...BASE_PRESETS, ...customPresets];
  const canEdit = role === 'admin';
  const canControl = role === 'admin';

  const handleSensor = useCallback((data) => {
    setSensorData(data);
  }, []);

  const handleConnect = useCallback((status) => {
    setConnected(status);
  }, []);

  const handleStatus = useCallback((status) => {
    setMqttStatus(status);
  }, []);

  useEffect(() => {
    mqttService.on('connect', handleConnect);
    mqttService.on('status', handleStatus);
    mqttService.connect();

    return () => {
      mqttService.off('connect', handleConnect);
      mqttService.off('status', handleStatus);
    };
  }, [handleSensor, handleConnect, handleStatus]);

  useEffect(() => {
    const unsubscribeLatest = firebaseService.subscribeLatest(handleSensor);
    return () => unsubscribeLatest();
  }, [handleSensor]);

  useEffect(() => {
    const unsubscribeHistory = firebaseService.subscribeHistory(
      historyDate,
      (data) => {
        setHistory(buildHistoryFromFirebase(data));
      }
    );
    return () => unsubscribeHistory();
  }, [historyDate]);

  useEffect(() => {
    const unsubscribePresets = firebaseService.subscribePresets((data) => {
      const entries = Object.entries(data || {}).map(([key, value]) => ({
        key,
        name: value.name,
        config: value.config,
        isCustom: true,
      }));
      setCustomPresets(entries);
      saveCustomPresets(entries);
    });

    return () => unsubscribePresets();
  }, []);

  useEffect(() => {
    const unsubscribeConfig = firebaseService.subscribeConfig((config) => {
      const cleaned = { ...config };
      delete cleaned.updatedAt;
      setThresholds((prev) => ({ ...prev, ...cleaned }));
      setConfigReady(true);
      try {
        localStorage.setItem('iot_thresholds', JSON.stringify(cleaned));
      } catch (e) {
        // Ignore storage errors.
      }
    });

    return () => unsubscribeConfig();
  }, []);

  useEffect(() => {
    let roleUnsubscribe = null;
    const unsubscribe = firebaseService.onAuthStateChanged((user) => {
      setAuthUser(user);
      setAuthError('');
      if (roleUnsubscribe) roleUnsubscribe();
      if (user) {
        roleUnsubscribe = firebaseService.subscribeRole(user.uid, setRole);
      } else {
        setRole('viewer');
      }
    });

    return () => {
      if (roleUnsubscribe) roleUnsubscribe();
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authUser || role !== 'admin') {
      setUsers({});
      setRoles({});
      return undefined;
    }

    const unsubscribeUsers = firebaseService.subscribeUsers(setUsers);
    const unsubscribeRoles = firebaseService.subscribeRoles(setRoles);

    return () => {
      unsubscribeUsers();
      unsubscribeRoles();
    };
  }, [authUser, role]);

  const clearHistory = () => {
    setHistory([]);
  };

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const updateThreshold = (key, value) => {
    if (!canEdit) {
      setToast({ type: 'warning', message: 'Bạn không có quyền chỉnh cấu hình.' });
      return;
    }
    setSelectedPreset('');
    setThresholds((prev) => ({ ...prev, [key]: value }));
  };

  const saveThresholds = () => {
    if (!canEdit) {
      setToast({ type: 'warning', message: 'Bạn không có quyền chỉnh cấu hình.' });
      return;
    }
    localStorage.setItem('iot_thresholds', JSON.stringify(thresholds));
    firebaseService.saveConfig(thresholds);
    mqttService.publishConfig(thresholds);
    setConfigReady(true);
    setToast({ type: 'success', message: 'Đã gửi cấu hình xuống ESP32' });
  };

  const applyPreset = (presetKey) => {
    if (!canEdit) {
      setToast({ type: 'warning', message: 'Bạn không có quyền chỉnh preset.' });
      return;
    }
    if (!presetKey) {
      setSelectedPreset('');
      return;
    }
    const preset = presets.find((item) => item.key === presetKey);
    if (!preset) return;
    setSelectedPreset(presetKey);
    setThresholds(preset.config);
    localStorage.setItem('iot_thresholds', JSON.stringify(preset.config));
    firebaseService.saveConfig(preset.config);
    mqttService.publishConfig(preset.config);
    setConfigReady(true);
    setToast({ type: 'success', message: `Đã áp dụng preset: ${preset.name}` });
  };

  const addPreset = (name, config) => {
    if (!canEdit) {
      setToast({ type: 'warning', message: 'Bạn không có quyền thêm preset.' });
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      setToast({ type: 'warning', message: 'Vui lòng nhập tên preset.' });
      return;
    }
    const baseKey = toPresetKey(trimmed) || 'preset';
    const existingKeys = new Set(presets.map((item) => item.key));
    let key = baseKey;
    let suffix = 2;
    while (existingKeys.has(key)) {
      key = `${baseKey}_${suffix}`;
      suffix += 1;
    }
    const newPreset = { key, name: trimmed, config: { ...config }, isCustom: true };
    firebaseService.savePreset(key, { name: trimmed, config: { ...config } });
    setSelectedPreset(key);
    setToast({ type: 'success', message: `Đã thêm preset: ${trimmed}` });
  };

  const updatePreset = (presetKey, name, config) => {
    if (!canEdit) {
      setToast({ type: 'warning', message: 'Bạn không có quyền sửa preset.' });
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      setToast({ type: 'warning', message: 'Vui lòng nhập tên preset.' });
      return;
    }
    firebaseService.savePreset(presetKey, { name: trimmed, config: { ...config } });
    if (selectedPreset === presetKey) {
      setThresholds(config);
    }
    setToast({ type: 'success', message: `Đã cập nhật preset: ${trimmed}` });
  };

  const deletePreset = (presetKey) => {
    if (!canEdit) {
      setToast({ type: 'warning', message: 'Bạn không có quyền xóa preset.' });
      return;
    }
    firebaseService.deletePreset(presetKey);
    if (selectedPreset === presetKey) {
      setSelectedPreset('');
    }
    setToast({ type: 'success', message: 'Đã xóa preset.' });
  };

  const handleSignIn = async (email, password) => {
    try {
      await firebaseService.signIn(email, password);
    } catch (err) {
      setAuthError('Sai email hoặc mật khẩu.');
    }
  };

  const handleSignUp = async (email, password) => {
    try {
      await firebaseService.signUp(email, password);
    } catch (err) {
      setAuthError('Không thể đăng ký. Vui lòng thử lại.');
    }
  };

  const handleSignOut = async () => {
    await firebaseService.signOut();
  };

  const handleSetRole = async (uid, nextRole) => {
    if (!canEdit) return;
    await firebaseService.setUserRole(uid, nextRole);
  };

  const statusLabel = {
    connected: { text: '🟢 Đã kết nối', cls: 'online' },
    reconnecting: { text: '🟡 Đang kết nối lại...', cls: 'reconnecting' },
    disconnected: { text: '🔴 Mất kết nối', cls: 'offline' },
    offline: { text: '🔴 Ngoại tuyến', cls: 'offline' },
    connecting: { text: '🟡 Đang kết nối...', cls: 'reconnecting' },
  };
  const currentStatus = statusLabel[mqttStatus] || statusLabel.connecting;

  const hasConfig = Boolean(
    sensorData?.has_config ?? sensorData?.config ?? configReady
  );

  const alerts = [];
  if (sensorData && hasConfig) {
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
    if (alerts.length > 0 && hasConfig) {
      setToast({ type: 'warning', message: alerts[0] });
    }
  }, [alerts.length, hasConfig]);

  const gardenStatus = (() => {
    if (sensorData?.garden_status) return sensorData.garden_status;
    if (!sensorData) return '---';
    if (!hasConfig) return 'CHUA_CAU_HINH';

    const soil = sensorData.do_am_dat;
    const temp = sensorData.nhiet_do;
    const humi = sensorData.do_am_khong_khi;

    if (
      typeof soil !== 'number' ||
      typeof temp !== 'number' ||
      typeof humi !== 'number' ||
      Number.isNaN(soil) ||
      Number.isNaN(temp) ||
      Number.isNaN(humi)
    ) {
      return '---';
    }

    let status = 'TOT';
    if (soil < thresholds.minSoil || temp > thresholds.maxTemp || humi < thresholds.minAirHum) {
      status = 'CAN_CHU_Y';
    }
    if (
      soil < thresholds.minSoil - 10 ||
      temp > thresholds.maxTemp + 5 ||
      humi < thresholds.minAirHum - 10
    ) {
      status = 'NGUY_HIEM';
    }
    return status;
  })();

  const autoMode = (() => {
    if (sensorData?.auto === true) return 'BAT';
    if (sensorData?.auto === false) return 'TAT';
    return sensorData?.auto_mode || '---';
  })();
  const pumpStatus =
    sensorData?.trang_thai_bom ??
    (sensorData?.pump === true
      ? 'DANG_TUOI'
      : sensorData?.pump === false
        ? 'KHONG_TUOI'
        : '---');
  const gardenStatusLabelMap = {
    TOT: 'Tốt',
    CAN_CHU_Y: 'Cần chú ý',
    NGUY_HIEM: 'Nguy hiểm',
  };
  const pumpStatusLabelMap = {
    DANG_TUOI: 'Đang tưới',
    KHONG_TUOI: 'Không tưới',
  };
  const gardenStatusLabel = gardenStatusLabelMap[gardenStatus] || gardenStatus;
  const pumpStatusLabel = pumpStatusLabelMap[pumpStatus] || pumpStatus;
  const gardenStatusClass = typeof gardenStatus === 'string'
    ? gardenStatus.toLowerCase()
    : 'muted';

  const needsWatering = Boolean(
    hasConfig && sensorData && sensorData.do_am_dat < thresholds.minSoil
  );

  useEffect(() => {
    console.log('[iot] Cấu hình ngưỡng hiện tại:', thresholds);
  }, [thresholds]);

  useEffect(() => {
    if (!sensorData) return;
    if (configReady) {
      console.log('[iot] Tình trạng vườn hiện tại:', {
        tinhTrangVuon: gardenStatus,
        cheDo: autoMode,
        trangThaiBom: pumpStatus,
        canTuoi: needsWatering,
      });
    }
    console.log('[iot] Thông số vườn hiện tại:', {
      nhietDo: sensorData.nhiet_do ?? '--',
      doAmKhongKhi: sensorData.do_am_khong_khi ?? '--',
      doAmDat: sensorData.do_am_dat ?? '--',
      anhSang: sensorData.anh_sang ?? '--',
      mucNuoc: sensorData.muc_nuoc ?? '--',
      thoiGian: sensorData.time ?? '--',
    });
  }, [sensorData, gardenStatus, autoMode, pumpStatus, needsWatering, configReady]);

  return (
    <BrowserRouter>
      <div className="app">
        <header className="app-header">
          <div className="header-left">
            <h1>📊 IoT Dashboard</h1>
            <span className="header-subtitle">ESP32 Sensor Monitor</span>
          </div>
          <div className="header-actions">
            <nav className="nav-links">
              <Link to="/">Dashboard</Link>
              <Link to="/admin">Admin</Link>
            </nav>
            <div className="user-badge">
              {authUser ? (
                <>
                  <span className={`role-pill ${role}`}>{role || 'viewer'}</span>
                  <span className="user-email">{authUser.email}</span>
                  <button className="btn-ghost" onClick={handleSignOut}>
                    Đăng xuất
                  </button>
                </>
              ) : (
                <Link className="btn-ghost" to="/dang-nhap">
                  Đăng nhập
                </Link>
              )}
            </div>
            <div className={`connection-badge ${currentStatus.cls}`}>
              {currentStatus.text}
            </div>
          </div>
        </header>

        <main className="app-main">
          <Routes>
            <Route
              path="/dang-nhap"
              element={<LoginPage onSignIn={handleSignIn} authError={authError} />}
            />
            <Route
              path="/dang-ky"
              element={<RegisterPage onSignUp={handleSignUp} authError={authError} />}
            />
            <Route
              path="/admin"
              element={
                canEdit ? (
                  <AdminPage
                    users={users}
                    roles={roles}
                    onSetRole={handleSetRole}
                    authUser={authUser}
                  />
                ) : (
                  <Navigate to="/dang-nhap" replace />
                )
              }
            />
            <Route
              path="/"
              element={
                <>
                  <div className="tab-bar">
                    <button
                      className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                      onClick={() => setActiveTab('dashboard')}
                    >
                      Dashboard cảm biến
                    </button>
                    <button
                      className={`tab-btn ${activeTab === 'config' ? 'active' : ''}`}
                      onClick={() => setActiveTab('config')}
                    >
                      Cấu hình cây trồng
                    </button>
                  </div>

                  {activeTab === 'dashboard' ? (
                    <DashboardPage
                      alerts={alerts}
                      configReady={configReady}
                      sensorData={sensorData}
                      connected={connected}
                      gardenStatusLabel={gardenStatusLabel}
                      gardenStatusClass={gardenStatusClass}
                      autoMode={autoMode}
                      pumpStatus={pumpStatus}
                      pumpStatusLabel={pumpStatusLabel}
                      needsWatering={needsWatering}
                      history={history}
                      historyFilter={historyFilter}
                      onHistoryFilterChange={(value) => setHistoryFilter(value)}
                      historyDate={historyDate}
                      onHistoryDateChange={(value) => setHistoryDate(value)}
                      onClearHistory={clearHistory}
                      canControl={canControl}
                    />
                  ) : (
                    <ConfigPage
                      presets={presets}
                      selectedPreset={selectedPreset}
                      configReady={configReady}
                      thresholds={thresholds}
                      sensorData={sensorData}
                      onSelectPreset={applyPreset}
                      onChangeThreshold={updateThreshold}
                      onSave={saveThresholds}
                      onAddPreset={addPreset}
                      onUpdatePreset={updatePreset}
                      onDeletePreset={deletePreset}
                      canEdit={canEdit}
                    />
                  )}
                </>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
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
    </BrowserRouter>
  );
}

export default App;
