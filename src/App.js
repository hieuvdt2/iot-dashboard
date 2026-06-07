import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import './App.css';

import DashboardPage from './shared/components/DashboardPage';
import ConfigPage from './shared/components/ConfigPage';
import ControlButtons from './shared/components/ControlButtons';
import SettingsStatusPanel from './shared/components/control/SettingsStatusPanel';
import GardenAssistant from './shared/components/GardenAssistant';
import EnvironmentToast from './shared/components/EnvironmentToast';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminPage from './pages/AdminPage';
import { mqttService, normalizeSensorPayload } from './shared/services/mqttService';
import { normalizeEntry } from './shared/utils/sensorHistory';
import { mergeSensorRecord, buildSensorPatch } from './shared/utils/sensorMerge';
import { firebaseService } from './shared/services/firebaseService';
import {
  buildHistoryFromFirebase,
} from './shared/utils/sensorHistory';
import {
  buildEnvironmentAlerts,
} from './shared/utils/environmentAlerts';
import {
  DEFAULT_TANK_FULL_DISTANCE,
  buildFirebaseConfigPayload,
  buildMqttConfigPayload,
  getWaterLevelStatus,
  isWaterTankCalibrated,
  loadStoredTankEmptyDistance,
  loadStoredTankFullDistance,
  markWaterTankCalibrated,
  pickPlantThresholds,
  splitDeviceConfig,
  waterDistanceToPercent,
} from './shared/utils/waterLevel';

const DEFAULT_CONFIG = {
  minSoil: 35,
  targetSoil: 65,
  maxTemp: 35,
  minAirHum: 50,
  maxLux: 20000,
};

// maxWaterDistance là cài đặt phần cứng (kích thước bể), không phải thuộc tính cây
const THRESHOLD_KEYS = [
  'minSoil',
  'targetSoil',
  'maxTemp',
  'minAirHum',
  'maxLux',
];

const loadStoredThresholds = () => {
  try {
    const saved = localStorage.getItem('iot_thresholds');
    const parsed = saved ? JSON.parse(saved) : { ...DEFAULT_CONFIG };
    return pickPlantThresholds(parsed);
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
    config: { minSoil: 45, targetSoil: 70, maxTemp: 32, minAirHum: 55, maxLux: 18000 },
  },
  {
    key: 'xuong_rong',
    name: 'Xương rồng',
    isCustom: false,
    config: { minSoil: 15, targetSoil: 30, maxTemp: 38, minAirHum: 35, maxLux: 22000 },
  },
  {
    key: 'lan',
    name: 'Lan',
    isCustom: false,
    config: { minSoil: 40, targetSoil: 60, maxTemp: 30, minAirHum: 60, maxLux: 16000 },
  },
  {
    key: 'cay_canh',
    name: 'Cây cảnh',
    isCustom: false,
    config: { minSoil: 35, targetSoil: 55, maxTemp: 34, minAirHum: 50, maxLux: 18000 },
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

const loadBoolPref = (key, fallback = false) => {
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return fallback;
  }
};

const loadThemePref = () => {
  try {
    const saved = localStorage.getItem('iot_theme');
    return saved === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

const MOBILE_MEDIA = '(max-width: 768px)';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_MEDIA).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MEDIA);
    const onChange = (event) => setIsMobile(event.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

function App() {
  const [sensorData, setSensorData] = useState(null);
  const [history, setHistory] = useState([]);
  const [connected, setConnected] = useState(false);
  const [mqttStatus, setMqttStatus] = useState('connecting');
  const [latestLoaded, setLatestLoaded] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [presetsLoaded, setPresetsLoaded] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [historyDate] = useState(() =>
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => loadBoolPref('iot_sidebar_collapsed'));
  const isMobile = useIsMobile();
  const navCollapsed = sidebarCollapsed && !isMobile;
  const [theme, setTheme] = useState(loadThemePref);
  const userMenuRef = useRef(null);
  const tankMigrateRef = useRef(false);
  const [users, setUsers] = useState({});
  const [roles, setRoles] = useState({});
  const [adminDbError, setAdminDbError] = useState(null);
  const [configReady, setConfigReady] = useState(() => {
    try {
      return Boolean(localStorage.getItem('iot_thresholds'));
    } catch (e) {
      return false;
    }
  });
  const [deployedThresholds, setDeployedThresholds] = useState(loadStoredThresholds);
  const [draftThresholds, setDraftThresholds] = useState(loadStoredThresholds);
  const [maxWaterDistance, setMaxWaterDistance] = useState(loadStoredTankEmptyDistance);
  const [tankFullDistance, setTankFullDistance] = useState(loadStoredTankFullDistance);
  const [waterTankCalibrated, setWaterTankCalibrated] = useState(isWaterTankCalibrated);

  const handleMarkWaterCalibrated = useCallback(() => {
    markWaterTankCalibrated();
    setWaterTankCalibrated(true);
  }, []);

  const presets = useMemo(() => [...BASE_PRESETS, ...customPresets], [customPresets]);
  const canEdit = role === 'admin';
  const canControl = role === 'admin';

  const publishTankToDevice = useCallback((emptyDist, fullDist) => {
    if (!canEdit) return;
    const mqttPayload = buildMqttConfigPayload(deployedThresholds, emptyDist, fullDist);
    const fbPayload = buildFirebaseConfigPayload(deployedThresholds, emptyDist, fullDist, true);
    mqttService.publishConfig(mqttPayload);
    firebaseService.saveConfig(fbPayload);
  }, [canEdit, deployedThresholds]);

  const saveTankConfig = useCallback((emptyDist, fullDist) => {
    if (!canEdit) return;
    setMaxWaterDistance(emptyDist);
    setTankFullDistance(fullDist);
    handleMarkWaterCalibrated();
    try {
      localStorage.setItem('iot_max_water_distance', String(emptyDist));
      localStorage.setItem('iot_tank_full_distance', String(fullDist));
    } catch {
      // ignore
    }
    publishTankToDevice(emptyDist, fullDist);
    setToast({ type: 'success', message: 'Đã lưu cấu hình bể nước.' });
  }, [canEdit, handleMarkWaterCalibrated, publishTankToDevice]);

  const applyTankCalibration = useCallback((tankEmpty, tankFull) => {
    if (tankEmpty != null && Number.isFinite(tankEmpty) && tankEmpty > 0) {
      setMaxWaterDistance(tankEmpty);
      try { localStorage.setItem('iot_max_water_distance', String(tankEmpty)); } catch {}
    }
    if (tankFull != null && Number.isFinite(tankFull) && tankFull >= 0) {
      setTankFullDistance(tankFull);
      try { localStorage.setItem('iot_tank_full_distance', String(tankFull)); } catch {}
    }
    if (tankEmpty != null || tankFull != null) {
      markWaterTankCalibrated();
      setWaterTankCalibrated(true);
    }
  }, []);

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

  const handleSensor = useCallback((raw) => {
    if (!raw) return;
    setSensorData((prev) => mergeSensorRecord(prev, buildSensorPatch(raw, normalizeEntry, normalizeSensorPayload)));
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
    mqttService.on('sensor', handleSensor);
    mqttService.connect();

    return () => {
      mqttService.off('connect', handleConnect);
      mqttService.off('status', handleStatus);
      mqttService.off('sensor', handleSensor);
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
      const { thresholds, tankEmpty, tankFull, tankCalibrated } = splitDeviceConfig(config);

      if (tankCalibrated) {
        applyTankCalibration(tankEmpty, tankFull);
      } else if (isWaterTankCalibrated() && !tankMigrateRef.current) {
        tankMigrateRef.current = true;
        let empty;
        let full;
        try {
          empty = Number(localStorage.getItem('iot_max_water_distance'));
          full = Number(localStorage.getItem('iot_tank_full_distance')) || DEFAULT_TANK_FULL_DISTANCE;
        } catch {
          empty = 0;
        }
        if (empty > 0) {
          firebaseService.saveConfig(
            buildFirebaseConfigPayload(thresholds, empty, full, true),
          );
        }
      }

      setDeployedThresholds((prevDeployed) => {
        setDraftThresholds((prevDraft) => (
          thresholdsEqual(prevDraft, prevDeployed) ? thresholds : prevDraft
        ));
        return thresholds;
      });
      setConfigReady(true);
      try {
        localStorage.setItem('iot_thresholds', JSON.stringify(thresholds));
      } catch (e) {
        // Ignore storage errors.
      }
    });

    return () => unsubscribeConfig();
  }, [applyTankCalibration]);

  useEffect(() => {
    let roleUnsubscribe = null;
    const unsubscribe = firebaseService.onAuthStateChanged((user) => {
      setAuthUser(user);
      setAuthLoading(false); // Firebase đã kiểm tra xong, cho phép render route
      setAuthError('');
      if (roleUnsubscribe) roleUnsubscribe();
      if (user) {
        roleUnsubscribe = firebaseService.subscribeRole(user.uid, setRole);
        firebaseService.ensureUserProfile(user).catch(() => {});
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
      setAdminDbError(null);
      return undefined;
    }

    setAdminDbError(null);
    const onDbError = (err) => {
      setAdminDbError(err?.message || 'Không đọc được users/roles (kiểm tra Rules Firebase).');
    };
    const unsubscribeUsers = firebaseService.subscribeUsers(setUsers, onDbError);
    const unsubscribeRoles = firebaseService.subscribeRoles(setRoles, onDbError);

    return () => {
      unsubscribeUsers();
      unsubscribeRoles();
    };
  }, [authUser, role]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('iot_theme', theme);
    } catch {
      // Ignore storage errors.
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem('iot_sidebar_collapsed', String(sidebarCollapsed));
    } catch {
      // Ignore storage errors.
    }
  }, [sidebarCollapsed]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
    setUserMenuOpen(false);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  useEffect(() => {
    if (bootstrapped) return;
    const firebaseReady = latestLoaded && historyLoaded && presetsLoaded;
    const mqttReady = connected || ['offline', 'disconnected', 'connected'].includes(mqttStatus);
    if (firebaseReady && mqttReady) {
      setBootstrapped(true);
    }
  }, [bootstrapped, connected, mqttStatus, latestLoaded, historyLoaded, presetsLoaded]);

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
    setToast({ type: 'success', message: 'Đã cập nhật bản nháp. Bấm "Áp dụng lên thiết bị" để gửi.' });
  };

  const applyAssistantSuggestion = (config, presetKey = '', label = '') => {
    if (!canEdit) {
      setToast({ type: 'warning', message: 'Bạn không có quyền chỉnh cấu hình.' });
      return;
    }
    setDraftThresholds({ ...config });
    if (presetKey && presets.some((item) => item.key === presetKey)) {
      setSelectedPreset(presetKey);
    } else {
      setSelectedPreset('');
    }
    setActiveTab('config');
    setToast({
      type: 'success',
      message: label
        ? `Đã áp dụng gợi ý "${label}" vào bản nháp. Kiểm tra tab Cấu hình rồi bấm "Áp dụng lên thiết bị".`
        : 'Đã áp dụng gợi ý vào bản nháp. Kiểm tra tab Cấu hình rồi bấm "Áp dụng lên thiết bị".',
    });
  };

  const discardDraft = () => {
    setDraftThresholds({ ...deployedThresholds });
    const matchedPreset = presets.find((item) => thresholdsEqual(item.config, deployedThresholds));
    setSelectedPreset(matchedPreset?.key || '');
    setToast({ type: 'success', message: 'Đã khôi phục cài đặt đang dùng trên thiết bị.' });
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
    const mqttPayload = buildMqttConfigPayload(draftThresholds, maxWaterDistance, tankFullDistance);
    const fbPayload = buildFirebaseConfigPayload(
      draftThresholds,
      maxWaterDistance,
      tankFullDistance,
      waterTankCalibrated,
    );
    firebaseService.saveConfig(fbPayload);
    mqttService.publishConfig(mqttPayload);
    setConfigReady(true);
    const presetName = presets.find((item) => item.key === selectedPreset)?.name;
    setToast({
      type: 'success',
      message: presetName
        ? `Đã áp dụng mẫu "${presetName}" lên thiết bị`
        : 'Đã áp dụng cài đặt lên thiết bị',
    });
  };

  const selectPreset = (presetKey) => {
    if (!canEdit) {
      setToast({ type: 'warning', message: 'Bạn không có quyền chọn mẫu.' });
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
      message: `Đã chọn mẫu "${preset.name}". Bấm "Áp dụng lên thiết bị" để gửi.`,
    });
  };

  const addPreset = (name, config) => {
    if (!canEdit) {
      setToast({ type: 'warning', message: 'Bạn không có quyền thêm mẫu.' });
    return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      setToast({ type: 'warning', message: 'Vui lòng nhập tên mẫu.' });
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
    setToast({ type: 'success', message: `Đã thêm mẫu: ${trimmed}` });
  };

  const updatePreset = (presetKey, name, config) => {
    if (!canEdit) {
      setToast({ type: 'warning', message: 'Bạn không có quyền sửa mẫu.' });
    return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      setToast({ type: 'warning', message: 'Vui lòng nhập tên mẫu.' });
      return;
    }
    firebaseService.savePreset(presetKey, { name: trimmed, config: { ...config } });
    setToast({ type: 'success', message: `Đã cập nhật mẫu: ${trimmed}` });
  };

  const deletePreset = (presetKey) => {
    if (!canEdit) {
      setToast({ type: 'warning', message: 'Bạn không có quyền xóa mẫu.' });
      return;
    }
    firebaseService.deletePreset(presetKey);
    if (selectedPreset === presetKey) {
      setSelectedPreset('');
    }
    setToast({ type: 'success', message: 'Đã xóa mẫu.' });
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
    setUserMenuOpen(false);
    await firebaseService.signOut();
  };

  useEffect(() => {
    if (!userMenuOpen) return undefined;
    const onClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [userMenuOpen]);

  const handleSetRole = async (uid, nextRole) => {
    if (!canEdit) return;
    await firebaseService.setUserRole(uid, nextRole);
  };

  const statusLabel = {
    connected: { text: 'Đã kết nối', cls: 'online' },
    reconnecting: { text: 'Đang kết nối lại...', cls: 'reconnecting' },
    disconnected: { text: 'Mất kết nối', cls: 'offline' },
    offline: { text: 'Ngoại tuyến', cls: 'offline' },
    connecting: { text: 'Đang kết nối...', cls: 'reconnecting' },
  };
  const currentStatus = statusLabel[mqttStatus] || statusLabel.connecting;

  const showLoading = !bootstrapped;
  const loadingMessages = [];
  if (mqttStatus === 'connecting' && !connected) loadingMessages.push('Dang ket noi MQTT...');
  if (!latestLoaded || !historyLoaded || !presetsLoaded) {
    loadingMessages.push('Dang tai du lieu Firebase...');
  }
  if (mqttStatus === 'reconnecting') loadingMessages.push('Dang ket noi lai MQTT...');

  const hasConfig = Boolean(
    sensorData?.has_config ?? sensorData?.config ?? configReady
  );

  const alerts = useMemo(
    () => (hasConfig && sensorData ? buildEnvironmentAlerts(sensorData, deployedThresholds, maxWaterDistance) : []),
    [sensorData, hasConfig, deployedThresholds, maxWaterDistance]
  );

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

  const autoModeLabelMap = {
    BAT: 'Tự động',
    TAT: 'Thủ công',
  };
  const autoModeLabel = autoModeLabelMap[autoMode] || autoMode || '---';
  const pumpOn = pumpStatus === 'DANG_TUOI';
  const waterDistance = sensorData?.muc_nuoc ?? null;
  const waterPct = waterDistanceToPercent(waterDistance, maxWaterDistance, tankFullDistance);
  const waterLevelStatus = getWaterLevelStatus(waterDistance, maxWaterDistance, tankFullDistance);
  const waterStatus = waterDistance === null ? null : (waterLevelStatus?.key ?? null);
  const waterStatusLabel = { full: 'Đủ nước', low: 'Nước thấp', empty: 'Cạn', null: '--' }[waterStatus];
  const waterStatusIcon = { full: 'check-circle', low: 'alert-triangle', empty: 'x-circle', null: null }[waterStatus];
  const waterStatusColor = { full: '#16a34a', low: '#d97706', empty: '#dc2626', null: '#9ca3af' }[waterStatus];

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

  const roleLabelMap = {
    admin: 'Quản trị viên',
    viewer: 'Người xem',
  };
  const roleLabel = roleLabelMap[role] || role || 'Người xem';
  const avatarUrl = authUser?.photoURL || null;
  const avatarInitial = displayName[0]?.toUpperCase() || '?';

  return (
    <BrowserRouter>
      {authLoading ? (
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
          }} />
          <div style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 500 }}>
            Đang khôi phục phiên đăng nhập...
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
      <div className={`app${navCollapsed ? ' sidebar-collapsed' : ''}`}>
        {/* ===== SIDEBAR ===== */}
        <aside className="sidebar" aria-hidden={navCollapsed}>
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
              <span className="sidebar-label">Tổng quan</span>
            </Link>
            <Link className={`sidebar-icon ${activeTab === 'config' ? 'active' : ''}`} to="/dashboard" title="Cấu hình" onClick={() => setActiveTab('config')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              <span className="sidebar-label">Cấu hình</span>
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
                <span className="sidebar-label">Quản trị</span>
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
              <span className="sidebar-label">Điều khiển</span>
            </Link>
          </nav>

          <div className="sidebar-bottom">
            {authUser ? (
              <div className="sidebar-user-wrap" ref={userMenuRef}>
                <button
                  type="button"
                  className={`sidebar-avatar ${userMenuOpen ? 'is-open' : ''}`}
                  aria-label="Thông tin tài khoản"
                  aria-expanded={userMenuOpen}
                  onClick={() => setUserMenuOpen((open) => !open)}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="sidebar-avatar-img" />
                  ) : (
                    avatarInitial
                  )}
                </button>

                {userMenuOpen && (
                  <div className="user-menu-popover" role="dialog" aria-label="Thông tin tài khoản">
                    <div className="user-menu-header">
                      <div className="user-menu-avatar">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="" className="sidebar-avatar-img" />
                        ) : (
                          avatarInitial
                        )}
                      </div>
                      <div className="user-menu-meta">
                        <div className="user-menu-name">{displayName}</div>
                        <span className={`role-pill ${role}`}>{roleLabel}</span>
                      </div>
                    </div>

                    <div className="user-menu-row">
                      <span className="user-menu-label">Email</span>
                      <span className="user-menu-value">{authUser.email}</span>
                    </div>

                    <button type="button" className="user-menu-logout" onClick={handleSignOut}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                      </svg>
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link className="sidebar-icon" to="/dang-nhap" title="Đăng nhập">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                  <polyline points="10 17 15 12 10 7"/>
                  <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                <span className="sidebar-label">Đăng nhập</span>
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
              <button
                type="button"
                className="btn-icon sidebar-toggle-btn"
                onClick={toggleSidebar}
                aria-label={navCollapsed ? 'Mở thanh điều hướng' : 'Ẩn thanh điều hướng'}
                title={navCollapsed ? 'Mở menu' : 'Ẩn menu'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {navCollapsed ? (
                    <>
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <line x1="3" y1="12" x2="21" y2="12" />
                      <line x1="3" y1="18" x2="21" y2="18" />
                    </>
                  ) : (
                    <>
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="9" y1="3" x2="9" y2="21" />
                    </>
                  )}
                </svg>
              </button>
              <button
                type="button"
                className="btn-icon"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
                title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {theme === 'dark' ? (
                    <>
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="1" x2="12" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="23" />
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                      <line x1="1" y1="12" x2="3" y2="12" />
                      <line x1="21" y1="12" x2="23" y2="12" />
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </>
                  ) : (
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  )}
                </svg>
              </button>
              <div className={`connection-badge ${currentStatus.cls}`}>
                {connected ? 'Đã kết nối' : mqttStatus === 'reconnecting' ? 'Đang kết nối...' : 'Mất kết nối'}
              </div>
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



          <main className={`app-main${activeTab === 'dashboard' ? ' garden-dark' : ''}`}>
            <Routes>
              <Route
                path="/dang-nhap"
                element={
                  <LoginPage
                    onSignIn={handleSignIn}
                    authError={authError}
                    authUser={authUser}
                    authLoading={authLoading}
                  />
                }
              />
              <Route
                path="/dang-ky"
                element={
                  <RegisterPage
                    onSignUp={handleSignUp}
                    authError={authError}
                    authUser={authUser}
                    authLoading={authLoading}
                  />
                }
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
                      adminDbError={adminDbError}
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
                        gardenStatus={gardenStatus}
                        gardenStatusLabel={gardenStatusLabel}
                        autoMode={autoMode}
                        pumpStatus={pumpStatus}
                        pumpStatusLabel={pumpStatusLabel}
                        history={history}
                        thresholds={deployedThresholds}
                        maxWaterDistance={maxWaterDistance}
                        tankFullDistance={tankFullDistance}
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
                        maxWaterDistance={maxWaterDistance}
                        tankFullDistance={tankFullDistance}
                        onSaveTankConfig={saveTankConfig}
                        onMarkWaterCalibrated={handleMarkWaterCalibrated}
                        waterTankCalibrated={waterTankCalibrated}
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

                      <SettingsStatusPanel
                        waterPct={waterPct}
                        waterDistance={waterDistance}
                        waterStatusLabel={waterStatusLabel}
                        waterStatusIcon={waterStatusIcon}
                        waterStatusColor={waterStatusColor}
                        pumpOn={pumpOn}
                        pumpStatusLabel={pumpStatusLabel}
                        isAuto={autoMode === 'BAT'}
                        autoModeLabel={autoModeLabel}
                      />
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

        {configReady && alerts.length > 0 && authUser && activeTab !== 'dashboard' && (
          <EnvironmentToast alerts={alerts} />
        )}

        {toast && (
          <div className={`toast ${toast.type} ${configReady && alerts.length > 0 && authUser && activeTab !== 'dashboard' ? 'toast-stacked' : ''}`}>
            <span className="toast-message">{toast.message}</span>
            <button
              type="button"
              className="toast-close"
              onClick={() => setToast(null)}
              aria-label="Đóng thông báo"
            >
              ×
            </button>
          </div>
        )}

        {authUser && (
          <GardenAssistant
            sensorData={sensorData}
            deployedThresholds={deployedThresholds}
            presets={presets}
            gardenStatusLabel={gardenStatusLabel}
            autoMode={autoMode}
            pumpStatusLabel={pumpStatusLabel}
            canEdit={canEdit}
            onApplySuggestion={applyAssistantSuggestion}
          />
        )}
      </div>
      )}
    </BrowserRouter>
  );
}

export default App;
