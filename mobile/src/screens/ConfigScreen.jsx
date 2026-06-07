import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, ActivityIndicator, SafeAreaView, Alert,
} from 'react-native';
import { C } from '../theme';
import { useMqtt } from '../MqttContext';
import { firebaseService } from '../services/firebaseService';
import {
  buildFirebaseConfigPayload,
  buildMqttConfigPayload,
  DEFAULT_TANK_FULL_DISTANCE,
  formatCmForInput,
  formatDistanceLabel,
  loadTankDistanceUnit,
  parseInputToCm,
  saveTankDistanceUnit,
  splitDeviceConfig,
  tankConfigEqual,
  WATER_CALIBRATION_KEY,
  waterDistanceToPercent,
} from '../utils/waterLevel';

/* ─── Constants ─── */
// maxWaterDistance là cài đặt phần cứng (kích thước bể), không thuộc cây trồng
const DEFAULT_CONFIG = {
  minSoil:    35,
  targetSoil: 65,
  maxTemp:    35,
  minAirHum:  50,
  maxLux:  20000,
};

const DEFAULT_MAX_WATER_DISTANCE = 20;

const FIELDS = [
  { key: 'minSoil',    label: 'Độ ẩm đất tối thiểu', unit: '%' },
  { key: 'targetSoil', label: 'Độ ẩm đất mục tiêu',  unit: '%' },
  { key: 'maxTemp',    label: 'Nhiệt độ tối đa',      unit: '°C' },
  { key: 'minAirHum',  label: 'Độ ẩm KK tối thiểu',  unit: '%' },
  { key: 'maxLux',     label: 'Ánh sáng tối đa',      unit: 'lux' },
];

const BASE_PRESETS = [
  {
    key: 'rau', name: '🥬 Rau', isCustom: false,
    config: { minSoil: 45, targetSoil: 70, maxTemp: 32, minAirHum: 55, maxLux: 18000 },
  },
  {
    key: 'xuong_rong', name: '🌵 Xương rồng', isCustom: false,
    config: { minSoil: 15, targetSoil: 30, maxTemp: 38, minAirHum: 35, maxLux: 22000 },
  },
  {
    key: 'lan', name: '🌸 Lan', isCustom: false,
    config: { minSoil: 40, targetSoil: 60, maxTemp: 30, minAirHum: 60, maxLux: 16000 },
  },
  {
    key: 'cay_canh', name: '🌿 Cây cảnh', isCustom: false,
    config: { minSoil: 35, targetSoil: 55, maxTemp: 34, minAirHum: 50, maxLux: 18000 },
  },
];

const thresholdsEqual = (a, b) =>
  FIELDS.every(f => Number(a?.[f.key]) === Number(b?.[f.key]));

const toKey = (name) =>
  `custom_${name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_')}_${Date.now()}`;

/* ─── Threshold number input ─── */
function NumericField({ label, unit, value, error, onChange }) {
  return (
    <View style={fs.field}>
      <Text style={fs.fieldLabel}>{label}</Text>
      <View style={[fs.inputRow, error && fs.inputRowError]}>
        <TextInput
          style={fs.input}
          value={String(value ?? '')}
          onChangeText={onChange}
          keyboardType="numeric"
          placeholder="--"
          placeholderTextColor={C.text3}
        />
        <Text style={fs.inputUnit}>{unit}</Text>
      </View>
      {error ? <Text style={fs.fieldError}>{error}</Text> : null}
    </View>
  );
}

/* ─── Config item row ─── */
function ConfigItem({ field, draft, deployed, changed }) {
  return (
    <View style={[cs.configItem, changed && cs.configItemChanged]}>
      <Text style={cs.configItemLabel}>{field.label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={cs.configItemValue}>
          {draft?.[field.key] ?? '--'} {field.unit}
        </Text>
        {changed && deployed?.[field.key] !== undefined && (
          <Text style={cs.configItemOld}>
            Thiết bị: {deployed[field.key]} {field.unit}
          </Text>
        )}
      </View>
    </View>
  );
}

/* ─── Modal: edit threshold ─── */
function ThresholdModal({ visible, initial, onSave, onClose }) {
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (visible) {
      setForm(Object.fromEntries(FIELDS.map(f => [f.key, String(initial?.[f.key] ?? '')])));
      setErrors({});
    }
  }, [visible, initial]);

  const handleChange = (key, val) => {
    const v = val.replace(',', '.');
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
    setForm(prev => ({ ...prev, [key]: v }));
  };

  const handleSave = () => {
    const errs = {};
    const payload = {};
    FIELDS.forEach(f => {
      const raw = String(form[f.key] ?? '').trim();
      if (!raw || isNaN(Number(raw))) errs[f.key] = 'Chỉ nhập số';
      else payload[f.key] = Number(raw);
    });
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave(payload);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={ms.header}>
          <Text style={ms.title}>Chỉnh sửa ngưỡng AUTO</Text>
          <TouchableOpacity onPress={onClose}><Text style={ms.close}>✕</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={ms.body} keyboardShouldPersistTaps="handled">
          <Text style={ms.note}>Thay đổi sẽ lưu vào bản nháp. Bấm "Áp dụng lên thiết bị" để gửi.</Text>
          <View style={ms.grid}>
            {FIELDS.map(f => (
              <NumericField
                key={f.key} label={f.label} unit={f.unit}
                value={form[f.key]} error={errors[f.key]}
                onChange={v => handleChange(f.key, v)}
              />
            ))}
          </View>
        </ScrollView>
        <View style={ms.footer}>
          <TouchableOpacity style={ms.btnGhost} onPress={onClose}>
            <Text style={ms.btnGhostText}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={ms.btnSave} onPress={handleSave}>
            <Text style={ms.btnSaveText}>Lưu nháp</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

/* ─── Modal: add/edit preset ─── */
function PresetModal({ visible, mode, initial, onSave, onClose }) {
  const [name, setName] = useState('');
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (visible) {
      setName(initial?.name || '');
      setForm(Object.fromEntries(FIELDS.map(f => [f.key, String(initial?.config?.[f.key] ?? '')])));
      setErrors({});
    }
  }, [visible, initial]);

  const handleChange = (key, val) => {
    const v = val.replace(',', '.');
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
    setForm(prev => ({ ...prev, [key]: v }));
  };

  const handleSave = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Nhập tên mẫu';
    const payload = {};
    FIELDS.forEach(f => {
      const raw = String(form[f.key] ?? '').trim();
      if (!raw || isNaN(Number(raw))) errs[f.key] = 'Chỉ nhập số';
      else payload[f.key] = Number(raw);
    });
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave({ name: name.trim(), config: payload });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={ms.header}>
          <Text style={ms.title}>{mode === 'create' ? 'Thêm mẫu mới' : 'Sửa mẫu'}</Text>
          <TouchableOpacity onPress={onClose}><Text style={ms.close}>✕</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={ms.body} keyboardShouldPersistTaps="handled">
          <View style={fs.field}>
            <Text style={fs.fieldLabel}>Tên mẫu</Text>
            <TextInput
              style={[fs.inputRow, errors.name && fs.inputRowError, { paddingHorizontal: 12, color: C.text }]}
              value={name} onChangeText={v => { setErrors(p => { const n={...p}; delete n.name; return n; }); setName(v); }}
              placeholder="VD: Cà chua, Ớt, Dưa leo..."
              placeholderTextColor={C.text3}
            />
            {errors.name ? <Text style={fs.fieldError}>{errors.name}</Text> : null}
          </View>
          <View style={ms.grid}>
            {FIELDS.map(f => (
              <NumericField
                key={f.key} label={f.label} unit={f.unit}
                value={form[f.key]} error={errors[f.key]}
                onChange={v => handleChange(f.key, v)}
              />
            ))}
          </View>
        </ScrollView>
        <View style={ms.footer}>
          <TouchableOpacity style={ms.btnGhost} onPress={onClose}>
            <Text style={ms.btnGhostText}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={ms.btnSave} onPress={handleSave}>
            <Text style={ms.btnSaveText}>{mode === 'create' ? 'Lưu mẫu' : 'Cập nhật'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

/* ════════════════════════════ MAIN SCREEN ════════════════════════════ */
export default function ConfigScreen() {
  const { publishConfig, sensorData } = useMqtt();
  const [tab, setTab]                 = useState('custom');     // 'custom' | 'preset'
  const [deployed, setDeployed]       = useState(DEFAULT_CONFIG);
  const [draft, setDraft]             = useState(DEFAULT_CONFIG);
  const [maxWaterDist, setMaxWaterDist] = useState(DEFAULT_MAX_WATER_DISTANCE);
  const [tankFullDist, setTankFullDist] = useState(DEFAULT_TANK_FULL_DISTANCE);
  const [waterTankCalibrated, setWaterTankCalibrated] = useState(false);
  const [tankUnit, setTankUnit] = useState('cm');
  const [draftEmptyCm, setDraftEmptyCm] = useState(DEFAULT_MAX_WATER_DISTANCE);
  const [draftFullCm, setDraftFullCm] = useState(DEFAULT_TANK_FULL_DISTANCE);
  const [emptyText, setEmptyText] = useState('');
  const [fullText, setFullText] = useState('');
  const [savingTank, setSavingTank] = useState(false);

  const markCalibrated = useCallback(async () => {
    setWaterTankCalibrated(true);
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem(WATER_CALIBRATION_KEY, 'true');
    } catch {}
  }, []);

  const persistTankConfig = useCallback(async (emptyCm, fullCm) => {
    setMaxWaterDist(emptyCm);
    setTankFullDist(fullCm);
    setDraftEmptyCm(emptyCm);
    setDraftFullCm(fullCm);
    setEmptyText(formatCmForInput(emptyCm, tankUnit));
    setFullText(formatCmForInput(fullCm, tankUnit));
    await markCalibrated();
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem('iot_max_water_distance', String(emptyCm));
      await AsyncStorage.setItem('iot_tank_full_distance', String(fullCm));
      const payload = buildFirebaseConfigPayload(deployed, emptyCm, fullCm, true);
      const mqttPayload = buildMqttConfigPayload(deployed, emptyCm, fullCm);
      await firebaseService.saveConfig(payload);
      publishConfig(mqttPayload);
    } catch {}
  }, [markCalibrated, deployed, publishConfig, tankUnit]);

  const handleSaveTank = useCallback(async () => {
    if (savingTank) return;
    const emptyCm = parseInputToCm(emptyText, tankUnit) ?? draftEmptyCm;
    const fullCm = parseInputToCm(fullText, tankUnit) ?? draftFullCm;
    if (!emptyCm || emptyCm <= 0 || fullCm == null || fullCm < 0 || emptyCm <= fullCm) {
      Alert.alert('Lỗi', 'Kiểm tra lại chiều cao bể và mức đầy.');
      return;
    }
    setSavingTank(true);
    try {
      await persistTankConfig(emptyCm, fullCm);
      Alert.alert('Thành công', 'Đã lưu cấu hình bể nước.');
    } catch (e) {
      Alert.alert('Lỗi', e.message || 'Không thể lưu cấu hình bể.');
    } finally {
      setSavingTank(false);
    }
  }, [savingTank, emptyText, fullText, tankUnit, draftEmptyCm, draftFullCm, persistTankConfig]);

  const applyTankFromSensor = useCallback(async (cm, kind) => {
    const emptyCm = kind === 'empty' ? cm : draftEmptyCm;
    const fullCm = kind === 'full' ? cm : draftFullCm;
    if (kind === 'empty') {
      setDraftEmptyCm(cm);
      setEmptyText(formatCmForInput(cm, tankUnit));
    } else {
      setDraftFullCm(cm);
      setFullText(formatCmForInput(cm, tankUnit));
    }
    setSavingTank(true);
    try {
      await persistTankConfig(emptyCm, fullCm);
    } finally {
      setSavingTank(false);
    }
  }, [draftEmptyCm, draftFullCm, persistTankConfig, tankUnit]);

  const handleTankUnitChange = useCallback(async (unit) => {
    setTankUnit(unit);
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      saveTankDistanceUnit(unit, AsyncStorage);
    } catch {}
    setEmptyText(formatCmForInput(draftEmptyCm, unit));
    setFullText(formatCmForInput(draftFullCm, unit));
  }, [draftEmptyCm, draftFullCm]);

  const hasUnsavedTank = !tankConfigEqual(draftEmptyCm, draftFullCm, maxWaterDist, tankFullDist);
  const [customPresets, setCustomPresets] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [saving, setSaving]           = useState(false);

  const [thresholdModalOpen, setThresholdModalOpen] = useState(false);
  const [presetModalOpen, setPresetModalOpen]       = useState(false);
  const [presetModalMode, setPresetModalMode]       = useState('create');
  const [editingPreset, setEditingPreset]           = useState(null);

  const allPresets = useMemo(() => [...BASE_PRESETS, ...customPresets], [customPresets]);

  const appliedPreset = useMemo(
    () => allPresets.find(p => thresholdsEqual(p.config, deployed)),
    [allPresets, deployed],
  );

  const hasDraft = !thresholdsEqual(draft, deployed);

  /* Load saved data */
  useEffect(() => {
    const unsubscribe = firebaseService.subscribeDeployedConfig((cfg) => {
      if (cfg) {
        const { thresholds, tankEmpty, tankFull, tankCalibrated } = splitDeviceConfig(cfg);
        const t = {
          minSoil:    thresholds.minSoil    ?? DEFAULT_CONFIG.minSoil,
          targetSoil: thresholds.targetSoil ?? DEFAULT_CONFIG.targetSoil,
          maxTemp:    thresholds.maxTemp    ?? DEFAULT_CONFIG.maxTemp,
          minAirHum:  thresholds.minAirHum  ?? DEFAULT_CONFIG.minAirHum,
          maxLux:     thresholds.maxLux     ?? DEFAULT_CONFIG.maxLux,
        };
        setDeployed(t);
        setDraft(prev => thresholdsEqual(prev, DEFAULT_CONFIG) ? t : prev);
        if (tankCalibrated) {
          if (tankEmpty != null && tankEmpty > 0) {
            setMaxWaterDist(tankEmpty);
            setDraftEmptyCm(tankEmpty);
            setEmptyText(formatCmForInput(tankEmpty, tankUnit));
          }
          if (tankFull != null && tankFull >= 0) {
            setTankFullDist(tankFull);
            setDraftFullCm(tankFull);
            setFullText(formatCmForInput(tankFull, tankUnit));
          }
        }
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    (async () => {
      const cp = await firebaseService.loadCustomPresets();
      setCustomPresets(cp);
      const savedDraft = await firebaseService.loadDraftThresholds(null);
      if (savedDraft) setDraft(savedDraft);
      try {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        const [emptyV, fullV, calibV] = await Promise.all([
          AsyncStorage.getItem('iot_max_water_distance'),
          AsyncStorage.getItem('iot_tank_full_distance'),
          AsyncStorage.getItem(WATER_CALIBRATION_KEY),
        ]);
        const unit = loadTankDistanceUnit(AsyncStorage);
        setTankUnit(unit);
        const emptyCm = emptyV ? Number(emptyV) : DEFAULT_MAX_WATER_DISTANCE;
        const fullCm = fullV ? Number(fullV) : DEFAULT_TANK_FULL_DISTANCE;
        setMaxWaterDist(emptyCm);
        setTankFullDist(fullCm);
        setDraftEmptyCm(emptyCm);
        setDraftFullCm(fullCm);
        setEmptyText(formatCmForInput(emptyCm, unit));
        setFullText(formatCmForInput(fullCm, unit));
        if (calibV === 'true') setWaterTankCalibrated(true);
      } catch {}
    })();
  }, []);

  /* Save & send to ESP32 */
  const handleSave = useCallback(async () => {
    if (!hasDraft || saving) return;
    setSaving(true);
    try {
      const fbPayload = buildFirebaseConfigPayload(draft, maxWaterDist, tankFullDist, waterTankCalibrated);
      const mqttPayload = buildMqttConfigPayload(draft, maxWaterDist, tankFullDist);
      await firebaseService.saveConfig(fbPayload);
      publishConfig(mqttPayload);
      setDeployed(draft);
      await firebaseService.saveDraftThresholds(draft);
      Alert.alert('Thành công', 'Đã áp dụng cài đặt lên thiết bị');
    } catch (e) {
      Alert.alert('Lỗi', e.message || 'Không thể lưu cấu hình');
    } finally {
      setSaving(false);
    }
  }, [draft, hasDraft, saving, publishConfig, maxWaterDist, tankFullDist, waterTankCalibrated]);

  /* Apply preset as draft */
  const applyPreset = useCallback((preset) => {
    setSelectedPreset(preset.key);
    setDraft({ ...preset.config });
    firebaseService.saveDraftThresholds(preset.config);
  }, []);

  /* Custom preset CRUD */
  const handleAddPreset = useCallback(async ({ name, config }) => {
    const newPreset = { key: toKey(name), name, config, isCustom: true };
    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    await firebaseService.saveCustomPresets(updated);
    setPresetModalOpen(false);
  }, [customPresets]);

  const handleEditPreset = useCallback(async ({ name, config }) => {
    const updated = customPresets.map(p =>
      p.key === editingPreset?.key ? { ...p, name, config } : p
    );
    setCustomPresets(updated);
    await firebaseService.saveCustomPresets(updated);
    setPresetModalOpen(false);
  }, [customPresets, editingPreset]);

  const handleDeletePreset = useCallback((preset) => {
    Alert.alert('Xóa mẫu', `Bạn có chắc muốn xóa "${preset.name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive',
        onPress: async () => {
          const updated = customPresets.filter(p => p.key !== preset.key);
          setCustomPresets(updated);
          await firebaseService.saveCustomPresets(updated);
          if (selectedPreset === preset.key) setSelectedPreset('');
        },
      },
    ]);
  }, [customPresets, selectedPreset]);

  /* Preview with current sensor data */
  const selectedPresetConfig = useMemo(
    () => allPresets.find(p => p.key === selectedPreset)?.config ?? null,
    [allPresets, selectedPreset],
  );

  const preview = useMemo(() => {
    if (!selectedPresetConfig || !sensorData) return null;
    const alerts = [];
    if (sensorData.soilHum  !== null && sensorData.soilHum  < selectedPresetConfig.minSoil)    alerts.push('🌱 Đất đang khô, cần tưới');
    if (sensorData.temperature !== null && sensorData.temperature > selectedPresetConfig.maxTemp) alerts.push('🌡️ Nhiệt độ quá cao');
    if (sensorData.airHum   !== null && sensorData.airHum   < selectedPresetConfig.minAirHum)  alerts.push('💧 Không khí khô');
    const status = alerts.length === 0 ? 'Tốt' : alerts.length === 1 ? 'Cần chú ý' : 'Nguy hiểm';
    return { alerts, status, needsWatering: sensorData.soilHum < selectedPresetConfig.minSoil };
  }, [selectedPresetConfig, sensorData]);

  /* ── Render: Custom config tab ── */
  const renderCustomTab = () => (
    <View style={{ gap: 12 }}>
      <View style={cs.card}>
        <View style={cs.cardHeader}>
          <View>
            <Text style={cs.cardTitle}>🌿 Cấu hình AUTO</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              {appliedPreset
                ? <View style={[cs.pill, cs.pillGreen]}><Text style={cs.pillGreenText}>Thiết bị đang dùng: {appliedPreset.name}</Text></View>
                : <View style={[cs.pill, cs.pillGray]}><Text style={cs.pillGrayText}>Cấu hình tự chỉnh</Text></View>
              }
              {hasDraft
                ? <View style={[cs.pill, cs.pillOrange]}><Text style={cs.pillOrangeText}>Chưa áp dụng</Text></View>
                : <View style={[cs.pill, cs.pillGreen]}><Text style={cs.pillGreenText}>Đã đồng bộ ✓</Text></View>
              }
            </View>
          </View>
        </View>

        {hasDraft && (
          <View style={cs.draftHint}>
            <Text style={cs.draftHintText}>Bạn đang xem bản nháp. Thiết bị vẫn chạy cấu hình cũ cho đến khi gửi.</Text>
          </View>
        )}

        {FIELDS.map(f => (
          <ConfigItem
            key={f.key} field={f} draft={draft} deployed={deployed}
            changed={hasDraft && draft[f.key] !== deployed[f.key]}
          />
        ))}

        <View style={cs.actions}>
          <TouchableOpacity style={cs.btnGhost} onPress={() => setThresholdModalOpen(true)}>
            <Text style={cs.btnGhostText}>✏️ Chỉnh sửa</Text>
          </TouchableOpacity>
          {hasDraft && (
            <TouchableOpacity style={cs.btnGhost} onPress={() => { setDraft(deployed); firebaseService.saveDraftThresholds(deployed); }}>
              <Text style={cs.btnGhostText}>↩ Hủy thay đổi</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[cs.btnSave, (!hasDraft || saving) && cs.btnDisabled]}
            onPress={handleSave}
            disabled={!hasDraft || saving}
          >
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={cs.btnSaveText}>💾 Áp dụng lên thiết bị</Text>
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* Cài đặt bể nước — device-level, không phụ thuộc loại cây */}
      <View style={cs.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={cs.cardTitle}>🪣 Cài đặt bể nước</Text>
          {hasUnsavedTank
            ? <View style={[cs.pill, cs.pillOrange]}><Text style={cs.pillOrangeText}>Chưa lưu</Text></View>
            : waterTankCalibrated && <View style={[cs.pill, cs.pillGreen]}><Text style={cs.pillGreenText}>Đã lưu ✓</Text></View>}
        </View>
        <Text style={cs.cardSub}>
          Nhập chiều cao bể để tính % mực nước — cảm biến HC-SR04 gắn trên đỉnh bể.
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: C.text2 }}>Đơn vị:</Text>
          {['cm', 'm'].map((unit) => (
            <TouchableOpacity
              key={unit}
              style={[cs.unitBtn, tankUnit === unit && cs.unitBtnActive]}
              onPress={() => handleTankUnitChange(unit)}
            >
              <Text style={[cs.unitBtnText, tankUnit === unit && cs.unitBtnTextActive]}>{unit}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={{ fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 4 }}>Chiều cao bể ({tankUnit})</Text>
        <Text style={{ fontSize: 12, color: C.text2, marginBottom: 8, lineHeight: 18 }}>
          Đo bằng thước từ đáy lên cảm biến. Dùng làm mốc 0% khi bể cạn.
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <TextInput
            style={[fs.inputRow, { flex: 1, maxWidth: 120, paddingHorizontal: 12, color: C.text }]}
            value={emptyText}
            onChangeText={(v) => {
              setEmptyText(v);
              const cm = parseInputToCm(v, tankUnit);
              if (cm != null && cm > 0) setDraftEmptyCm(cm);
            }}
            keyboardType="decimal-pad"
            placeholder={tankUnit === 'm' ? '0.13' : '13'}
            placeholderTextColor={C.text3}
          />
          <Text style={{ fontSize: 13, color: C.text2 }}>{tankUnit}</Text>
        </View>

        <Text style={{ fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 4 }}>Khoảng cách khi đầy (100%)</Text>
        <Text style={{ fontSize: 12, color: C.text2, marginBottom: 8, lineHeight: 18 }}>
          Giá trị muc_nuoc khi nước sát cảm biến — thường {tankUnit === 'm' ? '0.02–0.03 m' : '2–3 cm'}.
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <TextInput
            style={[fs.inputRow, { flex: 1, maxWidth: 120, paddingHorizontal: 12, color: C.text }]}
            value={fullText}
            onChangeText={(v) => {
              setFullText(v);
              const cm = parseInputToCm(v, tankUnit);
              if (cm != null && cm >= 0) setDraftFullCm(cm);
            }}
            keyboardType="decimal-pad"
            placeholder={tankUnit === 'm' ? '0.02' : '2'}
            placeholderTextColor={C.text3}
          />
          <Text style={{ fontSize: 13, color: C.text2 }}>{tankUnit}</Text>
        </View>

        <TouchableOpacity
          style={[cs.btnSave, { marginBottom: 12 }, (!hasUnsavedTank || savingTank) && cs.btnDisabled]}
          onPress={handleSaveTank}
          disabled={!hasUnsavedTank || savingTank}
        >
          {savingTank
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={cs.btnSaveText}>💾 Lưu cấu hình bể</Text>}
        </TouchableOpacity>

        {sensorData?.waterLevel != null && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <TouchableOpacity
              style={[cs.btnGhost, { flex: 1, minWidth: 140 }]}
              onPress={() => applyTankFromSensor(Number(sensorData.waterLevel), 'empty')}
            >
              <Text style={cs.btnGhostText}>Ghi {formatDistanceLabel(sensorData.waterLevel, tankUnit)} → cạn</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[cs.btnGhost, { flex: 1, minWidth: 140 }]}
              onPress={() => applyTankFromSensor(Number(sensorData.waterLevel), 'full')}
            >
              <Text style={cs.btnGhostText}>Ghi {formatDistanceLabel(sensorData.waterLevel, tankUnit)} → đầy</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ backgroundColor: C.blueLight, borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe', padding: 12 }}>
          <Text style={{ fontSize: 13, color: '#1e40af', lineHeight: 20 }}>
            <Text style={{ fontWeight: '700' }}>Cách tính %:</Text>
            {'\n'}% = (chiều cao bể − muc_nuoc) / (chiều cao bể − mức đầy) × 100
            {sensorData?.waterLevel != null && (
              <>
                {'\n\n'}Đọc hiện tại: {formatDistanceLabel(sensorData.waterLevel, tankUnit)}
                {' → '}
                {waterDistanceToPercent(sensorData.waterLevel, draftEmptyCm, draftFullCm) ?? '--'}%
                {hasUnsavedTank ? ' (xem trước — chưa lưu)' : ''}
              </>
            )}
            {!waterTankCalibrated && (
              <>{'\n\n'}Nhập chiều cao bể rồi bấm &quot;Lưu cấu hình bể&quot;.</>
            )}
          </Text>
        </View>
      </View>

      <ThresholdModal
        visible={thresholdModalOpen}
        initial={draft}
        onSave={(payload) => { setDraft(payload); firebaseService.saveDraftThresholds(payload); setThresholdModalOpen(false); }}
        onClose={() => setThresholdModalOpen(false)}
      />
    </View>
  );

  /* ── Render: Preset tab ── */
  const renderPresetTab = () => (
    <View style={{ gap: 12 }}>
      {/* Preset selector */}
      <View style={cs.card}>
        <Text style={cs.cardTitle}>🌱 Mẫu cây trồng</Text>
        <Text style={cs.cardSub}>Chọn mẫu để áp dụng cấu hình — bấm "Áp dụng lên thiết bị" để gửi.</Text>

        {appliedPreset && (
          <View style={[cs.pill, cs.pillGreen, { alignSelf: 'flex-start', marginTop: 8 }]}>
            <Text style={cs.pillGreenText}>Thiết bị đang dùng: {appliedPreset.name}</Text>
          </View>
        )}

        <View style={cs.presetList}>
          {allPresets.map(preset => {
            const isSelected = selectedPreset === preset.key;
            return (
              <View key={preset.key} style={[cs.presetRow, isSelected && cs.presetRowActive]}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => applyPreset(preset)}>
                  <Text style={[cs.presetName, isSelected && { color: C.greenDark }]}>{preset.name}</Text>
                  <Text style={cs.presetSub}>
                    Đất ≥{preset.config.minSoil}% · Temp ≤{preset.config.maxTemp}°C · ĐA KK ≥{preset.config.minAirHum}%
                  </Text>
                </TouchableOpacity>
                {preset.isCustom && (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      style={cs.smallBtn}
                      onPress={() => { setEditingPreset(preset); setPresetModalMode('edit'); setPresetModalOpen(true); }}
                    >
                      <Text style={cs.smallBtnText}>Sửa</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[cs.smallBtn, cs.smallBtnDanger]} onPress={() => handleDeletePreset(preset)}>
                      <Text style={[cs.smallBtnText, { color: C.red }]}>Xóa</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={cs.actions}>
          <TouchableOpacity
            style={cs.btnGhost}
            onPress={() => { setEditingPreset(null); setPresetModalMode('create'); setPresetModalOpen(true); }}
          >
            <Text style={cs.btnGhostText}>+ Thêm mẫu</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[cs.btnSave, (!hasDraft || saving) && cs.btnDisabled]}
            onPress={handleSave}
            disabled={!hasDraft || saving}
          >
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={cs.btnSaveText}>💾 Áp dụng lên thiết bị</Text>
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* Preview */}
      {selectedPreset && selectedPresetConfig && (
        <View style={[cs.card, { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }]}>
          <Text style={[cs.cardTitle, { color: C.greenDark }]}>🔎 Xem trước tình trạng vườn</Text>
          {preview ? (
            <>
              <View style={[cs.previewStatus,
                preview.status === 'Tốt' ? cs.previewOk :
                preview.status === 'Cần chú ý' ? cs.previewWarn : cs.previewDanger
              ]}>
                <Text style={cs.previewStatusText}>{preview.status}</Text>
              </View>
              <Text style={cs.previewNeedsWater}>
                Cần tưới: <Text style={{ fontWeight: '700' }}>{preview.needsWatering ? 'Có' : 'Không'}</Text>
              </Text>
              {preview.alerts.length === 0
                ? <Text style={cs.previewEmpty}>Không có cảnh báo — vườn đang ổn định.</Text>
                : preview.alerts.map((a, i) => (
                  <View key={i} style={cs.previewItem}><Text style={cs.previewItemText}>{a}</Text></View>
                ))
              }
            </>
          ) : (
            <Text style={cs.previewEmpty}>Chưa có dữ liệu cảm biến để xem trước.</Text>
          )}
        </View>
      )}

      <PresetModal
        visible={presetModalOpen}
        mode={presetModalMode}
        initial={presetModalMode === 'edit' ? editingPreset : null}
        onSave={presetModalMode === 'create' ? handleAddPreset : handleEditPreset}
        onClose={() => setPresetModalOpen(false)}
      />
    </View>
  );

  return (
    <SafeAreaView style={cs.root}>
      {/* Tab bar */}
      <View style={cs.tabs}>
        {[
          { key: 'custom', label: 'Tự cấu hình' },
          { key: 'preset', label: 'Mẫu cây trồng' },
        ].map(t => (
          <TouchableOpacity
            key={t.key}
            style={[cs.tab, tab === t.key && cs.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[cs.tabText, tab === t.key && cs.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={cs.content}>
        {tab === 'custom' ? renderCustomTab() : renderPresetTab()}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Styles ─── */
const cs = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16 },

  tabs: { flexDirection: 'row', backgroundColor: C.bgCard, borderBottomWidth: 1, borderBottomColor: C.border },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: C.green },
  tabText: { fontSize: 14, fontWeight: '500', color: C.text2 },
  tabTextActive: { color: C.greenDark, fontWeight: '700' },

  card: {
    backgroundColor: C.bgCard, borderRadius: C.radius, borderWidth: 1, borderColor: C.border,
    padding: 16, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    marginBottom: 0,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle:  { fontSize: 16, fontWeight: '700', color: C.text },
  cardSub:    { fontSize: 13, color: C.text2, marginTop: 4 },

  draftHint: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 8, padding: 10 },
  draftHintText: { fontSize: 13, color: '#92400e' },

  configItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: C.bg, borderRadius: 8, borderWidth: 1, borderColor: C.border, padding: 12,
  },
  configItemChanged: { borderColor: '#fdba74', backgroundColor: '#fff7ed' },
  configItemLabel:   { fontSize: 13, color: C.text2, flex: 1 },
  configItemValue:   { fontSize: 14, fontWeight: '700', color: C.text },
  configItemOld:     { fontSize: 11, color: '#9a3412', fontWeight: '600' },

  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  btnGhost: {
    borderWidth: 1, borderColor: C.border, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 9, backgroundColor: C.bgCard,
  },
  btnGhostText: { fontSize: 13, fontWeight: '600', color: C.text2 },
  btnSave: { backgroundColor: C.greenDark, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  btnSaveText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.4 },

  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  pillGreen: { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' },
  pillGreenText: { fontSize: 12, fontWeight: '600', color: '#166534' },
  pillOrange: { backgroundColor: '#fff7ed', borderColor: '#fed7aa' },
  pillOrangeText: { fontSize: 12, fontWeight: '600', color: '#c2410c' },
  pillGray: { backgroundColor: '#f3f4f6', borderColor: C.border },
  pillGrayText: { fontSize: 12, fontWeight: '600', color: C.text2 },

  unitBtn: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: C.bgCard,
  },
  unitBtnActive: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  unitBtnText: { fontSize: 13, fontWeight: '600', color: C.text2 },
  unitBtnTextActive: { color: '#166534', fontWeight: '700' },

  presetList: { gap: 8, marginTop: 4 },
  presetRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12,
  },
  presetRowActive: { borderColor: '#86efac', backgroundColor: '#f0fdf4' },
  presetName: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 2 },
  presetSub:  { fontSize: 12, color: C.text2 },
  smallBtn: {
    borderWidth: 1, borderColor: C.border, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 6, backgroundColor: C.bgCard,
  },
  smallBtnDanger: { borderColor: '#fecaca' },
  smallBtnText: { fontSize: 12, fontWeight: '600', color: C.text2 },

  previewStatus: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  previewOk:     { backgroundColor: '#dcfce7' },
  previewWarn:   { backgroundColor: '#fef9c3' },
  previewDanger: { backgroundColor: C.redLight },
  previewStatusText: { fontSize: 14, fontWeight: '700', color: C.text },
  previewNeedsWater: { fontSize: 14, color: C.text },
  previewItem: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#bbf7d0' },
  previewItemText: { fontSize: 13, color: C.text },
  previewEmpty: { fontSize: 13, color: C.text2, fontStyle: 'italic' },
});

const ms = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.bgCard,
  },
  title: { fontSize: 17, fontWeight: '700', color: C.text },
  close: { fontSize: 18, color: C.text2, padding: 4 },
  body:  { padding: 16, gap: 12 },
  note:  { fontSize: 13, color: C.text2, marginBottom: 4 },
  grid:  { gap: 10 },
  footer:{
    flexDirection: 'row', gap: 10, padding: 16,
    borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bgCard,
  },
  btnGhost: {
    flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 8,
    paddingVertical: 12, alignItems: 'center', backgroundColor: C.bgCard,
  },
  btnGhostText: { fontSize: 14, fontWeight: '600', color: C.text2 },
  btnSave: { flex: 2, backgroundColor: C.greenDark, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  btnSaveText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

const fs = StyleSheet.create({
  field:      { gap: 5 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.text2 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    borderRadius: 8, overflow: 'hidden',
  },
  inputRowError: { borderColor: C.red },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: C.text },
  inputUnit: {
    paddingHorizontal: 10, paddingVertical: 11,
    fontSize: 13, fontWeight: '600', color: C.text2,
    backgroundColor: C.bg, borderLeftWidth: 1, borderLeftColor: C.border,
  },
  fieldError: { fontSize: 12, color: C.red, fontWeight: '600' },
});
