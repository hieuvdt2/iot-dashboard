import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import './App.css';

import DashboardPage from './shared/components/DashboardPage';
import ConfigPage from './shared/components/ConfigPage';
import ControlButtons from './shared/components/ControlButtons';
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

const THRESHOLD_KEYS = [
  'minSoil',
  'targetSoil',
  'maxTemp',
  'minAirHum',
  'maxLux',
  'maxWaterDistance',
];

const loadStoredThresholds = () => {
  try {
    const saved = localStorage.getItem('iot_thresholds');
    return saved ? JSON.parse(saved) : { ...DEFAULT_CONFIG };
  } catch (e) {
    return { ...DEFAULT_CONFIG };
  }
};

const thresholdsEqual = (a, b) => (
  THRESHOLD_KEYS.every((key) => Number(a?.[key]) === Number(b?.[key]))
);

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

const maskEnvValue = (value) => {
  if (!value) return '(empty)';
  if (value.length <= 6) return '***';
  return `${value.slice(0, 3)}***${value.slice(-2)}`;
};

function App() {
  const [sensorData, setSensorData] = useState(null);
  const [history, setHistory] = useState([]);
  const [connected, setConnected] = useState(false);
  const [mqttStatus, setMqttStatus] = useState('connecting');
  const [latestLoaded, setLatestLoaded] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [presetsLoaded, setPresetsLoaded] = useState(false);
  const [historyFilter, setHistoryFilter] = useState(20);
  const [historyDate, setHistoryDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [customPresets, setCustomPresets] = useState(() => loadCustomPresets());
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true); // chờ Firebase restore session
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
  const [deployedThresholds, setDeployedThresholds] = useState(loadStoredThresholds);
  const [draftThresholds, setDraftThresholds] = useState(loadStoredThresholds);

  const presets = [...BASE_PRESETS, ...customPresets];
  const canEdit = role === 'admin';
  const canControl = role === 'admin';

  useEffect(() => {
    const envSnapshot = {
      REACT_APP_API_URL: process.env.REACT_APP_API_URL || '(empty)',
      REACT_APP_MQTT_URL: process.env.REACT_APP_MQTT_URL || '(empty)',
      REACT_APP_MQTT_USERNAME: process.env.REACT_APP_MQTT_USERNAME || '(empty)',
      REACT_APP_MQTT_PASSWORD: maskEnvValue(process.env.REACT_APP_MQTT_PASSWORD),
      REACT_APP_MQTT_CLIENT_ID: process.env.REACT_APP_MQTT_CLIENT_ID || '(empty)',
      REACT_APP_FIREBASE_API_KEY: maskEnvValue(process.env.REACT_APP_FIREBASE_API_KEY),
      REACT_APP_FIREBASE_AUTH_DOMAIN:
        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || '(empty)',
      REACT_APP_FIREBASE_DB_URL: process.env.REACT_APP_FIREBASE_DB_URL || '(empty)',
      REACT_APP_FIREBASE_PROJECT_ID:
        process.env.REACT_APP_FIREBASE_PROJECT_ID || '(empty)',
      REACT_APP_FIREBASE_STORAGE_BUCKET:
        process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || '(empty)',
      REACT_APP_FIREBASE_MESSAGING_SENDER_ID:
        process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '(empty)',
      REACT_APP_FIREBASE_APP_ID: maskEnvValue(process.env.REACT_APP_FIREBASE_APP_ID),
      REACT_APP_DEVICE_ID: process.env.REACT_APP_DEVICE_ID || '(empty)',
    };
    console.log('[Env] Thong tin bien moi truong:', envSnapshot);
  }, []);

  const handleSensor = useCallback((data) => {
    setSensorData(data || null);
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
    const unsubscribeLatest = firebaseService.subscribeLatest((data) => {
      setLatestLoaded(true);
      handleSensor(data);
    }, () => {
      setLatestLoaded(true);
      setToast({ type: 'warning', message: 'Không thể tải dữ liệu Firebase.' });
    });
    return () => unsubscribeLatest();
  }, [handleSensor]);

  useEffect(() => {
    setHistoryLoaded(false);
    const unsubscribeHistory = firebaseService.subscribeHistory(
      historyDate,
      (data) => {
        setHistoryLoaded(true);
        setHistory(buildHistoryFromFirebase(data));
      },
      () => {
        setHistoryLoaded(true);
        setToast({ type: 'warning', message: 'Không thể tải lịch sử Firebase.' });
      }
    );
    return () => unsubscribeHistory();
  }, [historyDate]);

  useEffect(() => {
    const unsubscribePresets = firebaseService.subscribePresets((data) => {
      setPresetsLoaded(true);
      const entries = Object.entries(data || {}).map(([key, value]) => ({
        key,
        name: value.name,
        config: value.config,
        isCustom: true,
      }));
      setCustomPresets(entries);
      saveCustomPresets(entries);
    }, () => {
      setPresetsLoaded(true);
      setToast({ type: 'warning', message: 'Không thể tải preset từ Firebase.' });
    });

    return () => unsubscribePresets();
  }, []);

  useEffect(() => {
    const unsubscribeConfig = firebaseService.subscribeConfig((config) => {
      const cleaned = { ...config };
      delete cleaned.updatedAt;
      setDeployedThresholds((prevDeployed) => {
        setDraftThresholds((prevDraft) => (
          thresholdsEqual(prevDraft, prevDeployed) ? cleaned : prevDraft
        ));
        return cleaned;
      });
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
      setAuthLoading(false); // Firebase đã kiểm tra xong, cho phép render route
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

  const hasUnsavedDraft = useMemo(
    () => !thresholdsEqual(draftThresholds, deployedThresholds),
    [draftThresholds, deployedThresholds]
  );

  useEffect(() => {
    if (hasUnsavedDraft) return;
    const matched = presets.find((item) => thresholdsEqual(item.config, deployedThresholds));
    setSelectedPreset(matched?.key || '');
  }, [deployedThresholds, presets, hasUnsavedDraft]);

  const applyDraftThresholds = (config) => {
    if (!canEdit) {
      setToast({ type: 'warning', message: 'Bạn không có quyền chỉnh cấu hình.' });
      return;
    }
    setSelectedPreset('');
    setDraftThresholds({ ...config });
    setToast({ type: 'success', message: 'Đã cập nhật bản nháp. Bấm "Lưu & Gửi ESP32" để áp dụng.' });
  };

  const discardDraft = () => {
    setDraftThresholds({ ...deployedThresholds });
    const matchedPreset = presets.find((item) => thresholdsEqual(item.config, deployedThresholds));
    setSelectedPreset(matchedPreset?.key || '');
    setToast({ type: 'success', message: 'Đã khôi phục cấu hình đang chạy trên ESP32.' });
  };

  const saveThresholds = () => {
    if (!canEdit) {
      setToast({ type: 'warning', message: 'Bạn không có quyền chỉnh cấu hình.' });
      return;
    }
    if (!hasUnsavedDraft) {
      setToast({ type: 'warning', message: 'Không có thay đổi mới để gửi.' });
      return;
    }
    setDeployedThresholds({ ...draftThresholds });
    localStorage.setItem('iot_thresholds', JSON.stringify(draftThresholds));
    firebaseService.saveConfig(draftThresholds);
    mqttService.publishConfig(draftThresholds);
    setConfigReady(true);
    const presetName = presets.find((item) => item.key === selectedPreset)?.name;
    setToast({
      type: 'success',
      message: presetName
        ? `Đã gửi preset "${presetName}" xuống ESP32`
        : 'Đã gửi cấu hình xuống ESP32',
    });
  };

  const selectPreset = (presetKey) => {
    if (!canEdit) {
      setToast({ type: 'warning', message: 'Bạn không có quyền chọn preset.' });
      return;
    }
    if (!presetKey) {
      setSelectedPreset('');
      return;
    }
    const preset = presets.find((item) => item.key === presetKey);
    if (!preset) return;
    setSelectedPreset(presetKey);
    setDraftThresholds({ ...preset.config });
    setToast({
      type: 'success',
      message: `Đã chọn preset "${preset.name}". Bấm "Lưu & Gửi ESP32" để áp dụng.`,
    });
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
    firebaseService.savePreset(key, { name: trimmed, config: { ...config } });
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

  const isMqttConnecting = mqttStatus === 'connecting' || mqttStatus === 'reconnecting';
  const isFirebaseLoading = !historyLoaded || !presetsLoaded || !latestLoaded;
  const showLoading = isMqttConnecting || isFirebaseLoading;
  const loadingMessages = [];
  if (isMqttConnecting) loadingMessages.push('Dang ket noi MQTT...');
  if (isFirebaseLoading) loadingMessages.push('Dang tai du lieu Firebase...');

  const hasConfig = Boolean(
    sensorData?.has_config ?? sensorData?.config ?? configReady
  );

  const alerts = useMemo(() => {
    const nextAlerts = [];
    if (sensorData && hasConfig) {
      if (sensorData.do_am_dat < deployedThresholds.minSoil) {
        nextAlerts.push('Đất đang khô, cần tưới');
      }
      if (sensorData.nhiet_do > deployedThresholds.maxTemp) {
        nextAlerts.push('Nhiệt độ cao');
      }
      if (sensorData.do_am_khong_khi < deployedThresholds.minAirHum) {
        nextAlerts.push('Không khí khô');
      }
      if (sensorData.anh_sang > deployedThresholds.maxLux) {
        nextAlerts.push('Ánh sáng quá mạnh');
      }
      if (sensorData.muc_nuoc > deployedThresholds.maxWaterDistance) {
        nextAlerts.push('Cảnh báo: mực nước thấp');
      }
    }
    return nextAlerts;
  }, [sensorData, hasConfig, deployedThresholds]);

  useEffect(() => {
    if (alerts.length > 0 && hasConfig) {
      setToast({ type: 'warning', message: alerts[0] });
    }
  }, [alerts, hasConfig]);

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
    if (soil < deployedThresholds.minSoil || temp > deployedThresholds.maxTemp || humi < deployedThresholds.minAirHum) {
      status = 'CAN_CHU_Y';
    }
    if (
      soil < deployedThresholds.minSoil - 10 ||
      temp > deployedThresholds.maxTemp + 5 ||
      humi < deployedThresholds.minAirHum - 10
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

  const autoModeLabelMap = {
    BAT: 'Tự động',
    TAT: 'Thủ công',
  };
  const autoModeLabel = autoModeLabelMap[autoMode] || autoMode || '---';
  const modeTone = autoMode === 'BAT' ? 'on' : autoMode === 'TAT' ? 'off' : 'muted';
  const pumpTone = pumpStatus === 'DANG_TUOI' ? 'on' : pumpStatus === 'KHONG_TUOI' ? 'off' : 'muted';
  const pumpOn = pumpStatus === 'DANG_TUOI';
  const waterDistance = sensorData?.muc_nuoc ?? null;
  const waterPct = waterDistance !== null
    ? Math.min(100, Math.max(0, 100 - Math.round((waterDistance / (deployedThresholds.maxWaterDistance ?? 25)) * 100)))
    : 0;

  const needsWatering = Boolean(
    hasConfig && sensorData && sensorData.do_am_dat < deployedThresholds.minSoil
  );

  useEffect(() => {
    console.log('[iot] Cấu hình ngưỡng hiện tại:', deployedThresholds);
  }, [deployedThresholds]);

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

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Chào buổi sáng';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  })();

  const displayName = authUser?.email
    ? authUser.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Bạn';

  /* Chờ Firebase kiểm tra session — tránh flash màn hình login */
  if (authLoading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
        gap: 16,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #22c55e',
          animation: 'spin 0.8s linear infinite',
        }}/>
        <div style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 500 }}>
          Đang khôi phục phiên đăng nhập...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="app">
        {/* ===== SIDEBAR ===== */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 0 1 0 20"/>
              <path d="M12 2C6.48 2 2 6.48 2 12"/>
              <path d="M7 15c1.5-2 3.5-3 5-3s3.5 1 5 3"/>
              <line x1="12" y1="12" x2="12" y2="20"/>
            </svg>
          </div>

          <nav className="sidebar-nav">
            <Link className={`sidebar-icon ${activeTab === 'dashboard' ? 'active' : ''}`} to="/dashboard" title="Dashboard" onClick={() => setActiveTab('dashboard')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </Link>
            <Link className={`sidebar-icon ${activeTab === 'config' ? 'active' : ''}`} to="/dashboard" title="Cấu hình" onClick={() => setActiveTab('config')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </Link>
            <div className="sidebar-divider"/>
            {canEdit && (
              <Link className="sidebar-icon" to="/admin" title="Quản trị">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </Link>
            )}
            <div className="sidebar-divider"/>
            <Link
              className={`sidebar-icon ${activeTab === 'settings' ? 'active' : ''}`}
              to="/settings"
              title="Điều khiển bơm"
              onClick={() => setActiveTab('settings')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </Link>
          </nav>

          <div className="sidebar-bottom">
            {authUser ? (
              <div className="sidebar-avatar" title={authUser.email} onClick={handleSignOut}>
                {displayName[0]}
              </div>
            ) : (
              <Link className="sidebar-icon" to="/dang-nhap" title="Đăng nhập">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                  <polyline points="10 17 15 12 10 7"/>
                  <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
              </Link>
            )}
          </div>
        </aside>

        {/* ===== CONTENT ===== */}
        <div className="app-content">
          {showLoading && (
            <div className="loading-overlay" aria-live="polite">
              <div className="loading-card">
                <div className="loading-spinner" />
                <div className="loading-title">Đang kết nối hệ thống</div>
                <div className="loading-subtitle">{loadingMessages.join(' ')}</div>
              </div>
            </div>
          )}

          <header className="app-header">
            <div className="header-greeting">
              <h2>{greeting}, {displayName}!</h2>
              <p>Đây là cập nhật mới nhất từ vườn thông minh của bạn</p>
            </div>
            <div className="header-actions">
              <div className={`connection-badge ${currentStatus.cls}`}>
                {connected ? 'Đã kết nối' : mqttStatus === 'reconnecting' ? 'Đang kết nối...' : 'Mất kết nối'}
              </div>
              {authUser && (
                <>
                  <span className={`role-pill ${role}`}>{role || 'viewer'}</span>
                  <button className="btn-support" onClick={handleSignOut}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                      <polyline points="16 17 21 12 16 7"/>
                      <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Đăng xuất
                  </button>
                </>
              )}
              <button className="btn-sync" onClick={() => window.location.reload()}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"/>
                  <polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                Sync dữ liệu
              </button>
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
                  authLoading ? null :
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
                  authLoading
                    ? null
                    : <Navigate to={authUser ? '/dashboard' : '/dang-nhap'} replace />
                }
              />
              <Route
                path="/dashboard"
                element={
                  authLoading ? null :
                  authUser ? (
                    activeTab === 'dashboard' ? (
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
                        thresholds={deployedThresholds}
                      />
                    ) : (
                      <ConfigPage
                        presets={presets}
                        selectedPreset={selectedPreset}
                        configReady={configReady}
                        draftThresholds={draftThresholds}
                        deployedThresholds={deployedThresholds}
                        hasUnsavedDraft={hasUnsavedDraft}
                        sensorData={sensorData}
                        onSelectPreset={selectPreset}
                        onApplyDraft={applyDraftThresholds}
                        onDiscardDraft={discardDraft}
                        onSave={saveThresholds}
                        onAddPreset={addPreset}
                        onUpdatePreset={updatePreset}
                        onDeletePreset={deletePreset}
                        canEdit={canEdit}
                      />
                    )
                  ) : (
                    <Navigate to="/dang-nhap" replace />
                  )
                }
              />
              <Route
                path="/settings"
                element={
                  authLoading ? null :
                  authUser ? (
                    <div className="settings-panel">
                      <ControlButtons
                        connected={connected}
                        autoMode={autoMode}
                        pumpStatus={pumpStatus}
                        manualSwitch={Boolean(sensorData?.manual_switch)}
                        manualSwitchActive={Boolean(sensorData?.manual_switch_active)}
                        pumpWebRequest={Boolean(sensorData?.pump_web_request)}
                        canControl={canControl}
                      />

                      <div className="settings-info">
                        <div className={`settings-visual-card water-flow-card ${pumpOn ? 'flowing' : 'idle'}`}>
                          <div className="visual-header">
                            <span className="visual-title">Dòng chảy bơm</span>
                            <span className={`mode-pill ${pumpTone}`}>{pumpStatusLabel || '---'}</span>
                          </div>
                          <div className="water-scene">
                            <div className="tank">
                              <div className="tank-water" style={{ height: `${waterPct}%` }} />
                              <div className="tank-level">
                                {waterDistance !== null ? `${waterPct}%` : '--'}
                              </div>
                              <div className="tank-sub">
                                {waterDistance !== null ? `${waterDistance} cm` : '--'}
                              </div>
                            </div>
                            <div className="pipe">
                              <div className="pipe-line" />
                              <div className="pipe-flow" />
                            </div>
                            <div className="pump-unit">
                              <div className="pump-core" />
                              <div className="pump-label">PUMP</div>
                            </div>
                            <div className="water-drops">
                              <span className="drop d1" />
                              <span className="drop d2" />
                              <span className="drop d3" />
                            </div>
                          </div>
                        </div>

                        <div className={`settings-visual-card auto-mode-card ${autoMode === 'BAT' ? 'auto-on' : 'auto-off'}`}>
                          <div className="visual-header">
                            <span className="visual-title">Chế độ tưới</span>
                            <span className={`mode-pill ${modeTone}`}>{autoModeLabel}</span>
                          </div>
                          <div className="robot-figure">
                            <img
                              src={`${process.env.PUBLIC_URL}/robot-garden.png`}
                              alt="Robot AI tưới cây"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Navigate to="/dang-nhap" replace />
                  )
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>

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
