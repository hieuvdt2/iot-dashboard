import React, { useMemo, useState } from 'react';

function ConfigPage({
  presets,
  selectedPreset,
  configReady,
  thresholds,
  sensorData,
  onSelectPreset,
  onChangeThreshold,
  onSave,
  onAddPreset,
  onUpdatePreset,
  onDeletePreset,
  canEdit,
}) {
  const [activeSection, setActiveSection] = useState('custom');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingKey, setEditingKey] = useState('');
  const [formValues, setFormValues] = useState({
    name: '',
    minSoil: thresholds.minSoil,
    targetSoil: thresholds.targetSoil,
    maxTemp: thresholds.maxTemp,
    minAirHum: thresholds.minAirHum,
    maxLux: thresholds.maxLux,
    maxWaterDistance: thresholds.maxWaterDistance,
  });
  const configItems = [
    { label: 'Độ ẩm đất tối thiểu (%)', value: thresholds.minSoil },
    { label: 'Mức độ ẩm đất mục tiêu (%)', value: thresholds.targetSoil },
    { label: 'Nhiệt độ tối đa (°C)', value: thresholds.maxTemp },
    { label: 'Độ ẩm KK tối thiểu (%)', value: thresholds.minAirHum },
    { label: 'Cường độ ánh sáng tối đa (lux)', value: thresholds.maxLux },
    { label: 'Khoảng cách mực nước tối đa (cm)', value: thresholds.maxWaterDistance },
  ];

  const selectedPresetConfig = useMemo(() => {
    const selected = presets.find((preset) => preset.key === selectedPreset);
    return selected ? selected.config : null;
  }, [presets, selectedPreset]);

  const preview = useMemo(() => {
    if (!sensorData || !selectedPresetConfig) return null;
    const alerts = [];
    if (sensorData.do_am_dat < selectedPresetConfig.minSoil) {
      alerts.push('Đất đang khô, cần tưới');
    }
    if (sensorData.nhiet_do > selectedPresetConfig.maxTemp) {
      alerts.push('Nhiệt độ cao');
    }
    if (sensorData.do_am_khong_khi < selectedPresetConfig.minAirHum) {
      alerts.push('Không khí khô');
    }
    if (sensorData.anh_sang > selectedPresetConfig.maxLux) {
      alerts.push('Ánh sáng quá mạnh');
    }
    if (sensorData.muc_nuoc > selectedPresetConfig.maxWaterDistance) {
      alerts.push('Cảnh báo: mực nước thấp');
    }

    let status = 'Tốt';
    if (alerts.length === 1) status = 'Cần chú ý';
    if (alerts.length >= 2) status = 'Nguy hiểm';

    return {
      alerts,
      status,
      needsWatering: sensorData.do_am_dat < selectedPresetConfig.minSoil,
    };
  }, [sensorData, selectedPresetConfig]);

  const customPresets = useMemo(
    () => presets.filter((preset) => preset.isCustom),
    [presets]
  );

  const openCreateModal = () => {
    if (!canEdit) return;
    setModalMode('create');
    setEditingKey('');
    setFormValues({
      name: '',
      minSoil: thresholds.minSoil,
      targetSoil: thresholds.targetSoil,
      maxTemp: thresholds.maxTemp,
      minAirHum: thresholds.minAirHum,
      maxLux: thresholds.maxLux,
      maxWaterDistance: thresholds.maxWaterDistance,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (preset) => {
    if (!canEdit) return;
    setModalMode('edit');
    setEditingKey(preset.key);
    setFormValues({
      name: preset.name,
      minSoil: preset.config.minSoil,
      targetSoil: preset.config.targetSoil,
      maxTemp: preset.config.maxTemp,
      minAirHum: preset.config.minAirHum,
      maxLux: preset.config.maxLux,
      maxWaterDistance: preset.config.maxWaterDistance,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleModalSave = () => {
    if (!canEdit) return;
    const payload = {
      minSoil: Number(formValues.minSoil),
      targetSoil: Number(formValues.targetSoil),
      maxTemp: Number(formValues.maxTemp),
      minAirHum: Number(formValues.minAirHum),
      maxLux: Number(formValues.maxLux),
      maxWaterDistance: Number(formValues.maxWaterDistance),
    };
    if (modalMode === 'create') {
      onAddPreset(formValues.name, payload);
    } else {
      onUpdatePreset(editingKey, formValues.name, payload);
    }
    setIsModalOpen(false);
  };

  const handleDeletePreset = (presetKey) => {
    const confirmed = window.confirm('Bạn có chắc muốn xóa preset này?');
    if (!confirmed) return;
    onDeletePreset(presetKey);
  };

  const previewStatusClass = preview
    ? preview.status === 'Tốt'
      ? 'ok'
      : preview.status === 'Cần chú ý'
        ? 'warn'
        : 'danger'
    : '';

  return (
    <>
      <section className="section config-shell">
        <div className="config-tabs">
          <button
            type="button"
            className={`config-tab ${activeSection === 'custom' ? 'active' : ''}`}
            onClick={() => setActiveSection('custom')}
          >
            Tự cấu hình
          </button>
          <button
            type="button"
            className={`config-tab ${activeSection === 'preset' ? 'active' : ''}`}
            onClick={() => setActiveSection('preset')}
          >
            Preset cây trồng
          </button>
        </div>

        {activeSection === 'custom' ? (
          <div className="config-grid">
            <div className="config-card">
              <div className="config-header">
                <div>
                  <h3>🌿 Cấu hình AUTO</h3>
                  <div className={`config-status ${configReady ? 'ready' : 'empty'}`}>
                    {configReady ? 'Đã cấu hình' : 'Chưa cấu hình cây trồng'}
                  </div>
                </div>
                <button className="btn-save" onClick={onSave} disabled={!canEdit}>
                  Lưu & Gửi ESP32
                </button>
              </div>
              <p className="config-note">
                Hệ thống sẽ tưới tự động khi đất khô và dừng khi đạt mục tiêu.
              </p>
              {!canEdit && (
                <div className="config-warning">
                  ⚠️ Tài khoản hiện tại chỉ có quyền xem.
                </div>
              )}
              <div className="config-list">
                {configItems.map((item) => (
                  <div key={item.label} className="config-item">
                    <span>{item.label}</span>
                    <strong>{item.value ?? '--'}</strong>
                  </div>
                ))}
              </div>
            </div>

            <section className="settings-section">
              <div className="settings-header">
                <h3>🛠️ Tùy chỉnh ngưỡng</h3>
                <span className="settings-subtitle">
                  Thay đổi thông số rồi bấm “Lưu & Gửi ESP32”.
                </span>
              </div>
              <div className="settings-grid">
                <label className="setting-field">
                  <span>Độ ẩm đất tối thiểu (%)</span>
                  <input
                    type="number"
                    value={thresholds.minSoil}
                    onChange={(e) => onChangeThreshold('minSoil', Number(e.target.value))}
                    disabled={!canEdit}
                  />
                </label>
                <label className="setting-field">
                  <span>Mức độ ẩm đất mục tiêu (%)</span>
                  <input
                    type="number"
                    value={thresholds.targetSoil}
                    onChange={(e) => onChangeThreshold('targetSoil', Number(e.target.value))}
                    disabled={!canEdit}
                  />
                </label>
                <label className="setting-field">
                  <span>Nhiệt độ tối đa (°C)</span>
                  <input
                    type="number"
                    value={thresholds.maxTemp}
                    onChange={(e) => onChangeThreshold('maxTemp', Number(e.target.value))}
                    disabled={!canEdit}
                  />
                </label>
                <label className="setting-field">
                  <span>Độ ẩm KK tối thiểu (%)</span>
                  <input
                    type="number"
                    value={thresholds.minAirHum}
                    onChange={(e) => onChangeThreshold('minAirHum', Number(e.target.value))}
                    disabled={!canEdit}
                  />
                </label>
                <label className="setting-field">
                  <span>Cường độ ánh sáng tối đa (lux)</span>
                  <input
                    type="number"
                    value={thresholds.maxLux}
                    onChange={(e) => onChangeThreshold('maxLux', Number(e.target.value))}
                    disabled={!canEdit}
                  />
                </label>
                <label className="setting-field">
                  <span>Khoảng cách mực nước tối đa (cm)</span>
                  <input
                    type="number"
                    value={thresholds.maxWaterDistance}
                    onChange={(e) => onChangeThreshold('maxWaterDistance', Number(e.target.value))}
                    disabled={!canEdit}
                  />
                </label>
              </div>
            </section>
          </div>
        ) : (
          <div className="preset-layout">
            <div className="preset-card">
              <div className="preset-header">
                <h3>🌱 Preset cây trồng</h3>
                <p>Chọn preset để áp dụng nhanh cấu hình cho ESP32.</p>
              </div>
              <select
                className="preset-select"
                value={selectedPreset}
                onChange={(e) => onSelectPreset(e.target.value)}
                disabled={!canEdit}
              >
                <option value="">Chọn preset</option>
                {presets.map((preset) => (
                  <option key={preset.key} value={preset.key}>
                    {preset.name}
                  </option>
                ))}
              </select>
              <div className="preset-actions">
                <button className="btn-save" onClick={openCreateModal} disabled={!canEdit}>
                  Thêm preset
                </button>
              </div>
              {customPresets.length > 0 && (
                <div className="preset-list">
                  {customPresets.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      className="preset-row"
                      onClick={() => openEditModal(preset)}
                      disabled={!canEdit}
                    >
                      <div>
                        <strong>{preset.name}</strong>
                        <span>Preset tùy chỉnh</span>
                      </div>
                      <div className="preset-row-actions">
                        <span className="preset-hint">Bấm để sửa</span>
                        <button
                          type="button"
                          className="btn-ghost danger"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeletePreset(preset.key);
                          }}
                          disabled={!canEdit}
                        >
                          Xóa
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="preview-card">
              <div className="preview-header">
                <h3>🔎 Xem trước tình trạng vườn</h3>
                <span>Dựa trên preset đã chọn</span>
              </div>
              {!selectedPresetConfig && (
                <div className="preview-empty">
                  Chọn preset để xem trước tình trạng vườn.
                </div>
              )}
              {selectedPresetConfig && !sensorData && (
                <div className="preview-empty">
                  Chưa có dữ liệu cảm biến để xem trước.
                </div>
              )}
              {selectedPresetConfig && preview && (
                <div className="preview-body">
                  <div className={`preview-status ${previewStatusClass}`}>
                    {preview.status}
                  </div>
                  <div className="preview-row">
                    <span>Cần tưới:</span>
                    <strong>{preview.needsWatering ? 'Có' : 'Không'}</strong>
                  </div>
                  <div className="preview-list">
                    {preview.alerts.length > 0 ? (
                      preview.alerts.map((item, index) => (
                        <div key={`${item}-${index}`} className="preview-item">
                          {item}
                        </div>
                      ))
                    ) : (
                      <div className="preview-item muted">Không có cảnh báo.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {isModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-header">
              <h3>{modalMode === 'create' ? 'Thêm preset mới' : 'Sửa preset'}</h3>
              <button className="btn-ghost" onClick={closeModal}>
                Đóng
              </button>
            </div>
            <div className="modal-body">
              <label className="modal-field">
                <span>Tên preset</span>
                <input
                  type="text"
                  value={formValues.name}
                  onChange={(e) => setFormValues((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))}
                />
              </label>
              <div className="modal-grid">
                <label className="modal-field">
                  <span>Độ ẩm đất tối thiểu (%)</span>
                  <input
                    type="number"
                    value={formValues.minSoil}
                    onChange={(e) => setFormValues((prev) => ({
                      ...prev,
                      minSoil: e.target.value,
                    }))}
                  />
                </label>
                <label className="modal-field">
                  <span>Mức độ ẩm đất mục tiêu (%)</span>
                  <input
                    type="number"
                    value={formValues.targetSoil}
                    onChange={(e) => setFormValues((prev) => ({
                      ...prev,
                      targetSoil: e.target.value,
                    }))}
                  />
                </label>
                <label className="modal-field">
                  <span>Nhiệt độ tối đa (°C)</span>
                  <input
                    type="number"
                    value={formValues.maxTemp}
                    onChange={(e) => setFormValues((prev) => ({
                      ...prev,
                      maxTemp: e.target.value,
                    }))}
                  />
                </label>
                <label className="modal-field">
                  <span>Độ ẩm KK tối thiểu (%)</span>
                  <input
                    type="number"
                    value={formValues.minAirHum}
                    onChange={(e) => setFormValues((prev) => ({
                      ...prev,
                      minAirHum: e.target.value,
                    }))}
                  />
                </label>
                <label className="modal-field">
                  <span>Cường độ ánh sáng tối đa (lux)</span>
                  <input
                    type="number"
                    value={formValues.maxLux}
                    onChange={(e) => setFormValues((prev) => ({
                      ...prev,
                      maxLux: e.target.value,
                    }))}
                  />
                </label>
                <label className="modal-field">
                  <span>Khoảng cách mực nước tối đa (cm)</span>
                  <input
                    type="number"
                    value={formValues.maxWaterDistance}
                    onChange={(e) => setFormValues((prev) => ({
                      ...prev,
                      maxWaterDistance: e.target.value,
                    }))}
                  />
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={closeModal}>
                Hủy
              </button>
              <button className="btn-save" onClick={handleModalSave}>
                {modalMode === 'create' ? 'Lưu preset' : 'Cập nhật'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ConfigPage;
