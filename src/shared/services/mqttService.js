import mqtt from 'mqtt';

const MQTT_URL =
  process.env.REACT_APP_MQTT_URL ||
  'wss://916cc55df8ed4fa2bfff8e4d25fd0f56.s1.eu.hivemq.cloud:8884/mqtt';

/**
 * MQTT broker chỉ cho 1 kết nối / clientId.
 * Nhiều máy/tab dùng chung ID → máy sau vào sẽ đá máy trước (reconnect loop).
 * Luôn thêm hậu tố unique per tab; không dùng env làm ID nguyên khối.
 */
const getMqttClientId = () => {
  const storageKey = 'iot_mqtt_client_id';
  let unique;
  try {
    unique = sessionStorage.getItem(storageKey);
    if (!unique) {
      unique = `${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 10)}`;
      sessionStorage.setItem(storageKey, unique);
    }
  } catch {
    unique = `${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 10)}`;
  }

  const prefix = process.env.REACT_APP_MQTT_CLIENT_ID?.trim() || 'iot_web';
  return `${prefix}_${unique}`;
};

const MQTT_BASE_OPTIONS = {
  username: process.env.REACT_APP_MQTT_USERNAME || 'location',
  password: process.env.REACT_APP_MQTT_PASSWORD || 'Abc12345',
  clean: true,
  reconnectPeriod: 3000,
  connectTimeout: 10000,
};

export const normalizeSensorPayload = (data) => {
  if (!data || typeof data !== 'object') return data;

  const normalized = { ...data };

  if (data.soil !== undefined && normalized.do_am_dat === undefined) {
    normalized.do_am_dat = data.soil;
  }
  if (data.temp !== undefined && normalized.nhiet_do === undefined) {
    normalized.nhiet_do = data.temp;
  }
  if (data.humi !== undefined && normalized.do_am_khong_khi === undefined) {
    normalized.do_am_khong_khi = data.humi;
  }
  if (data.lux !== undefined && normalized.anh_sang === undefined) {
    normalized.anh_sang = data.lux;
  }
  if (data.distance !== undefined && normalized.muc_nuoc === undefined) {
    normalized.muc_nuoc = data.distance;
  }

  if (data.config !== undefined && normalized.has_config === undefined) {
    normalized.has_config = data.config;
  }
  if (data.auto !== undefined && normalized.auto_mode === undefined) {
    normalized.auto_mode = data.auto ? 'BAT' : 'TAT';
  }
  if (data.pump !== undefined && normalized.trang_thai_bom === undefined) {
    normalized.trang_thai_bom = data.pump ? 'DANG_TUOI' : 'KHONG_TUOI';
  }

  return normalized;
};

export const TOPICS = {
  SENSOR: 'esp32/sensor',
  CONTROL: 'esp32/control',
  CONFIG: 'esp32/config',
};

class MqttService {
  constructor() {
    this.client = null;
    this.listeners = new Map();
    this.connected = false;
    this.connecting = false;
  }

  connect() {
    if (this.client || this.connecting) return;
    this.connecting = true;

    const clientId = getMqttClientId();
    this.client = mqtt.connect(MQTT_URL, { ...MQTT_BASE_OPTIONS, clientId });
    console.log('[MQTT] Ket noi voi clientId:', clientId);

    this.client.on('connect', () => {
      this.connected = true;
      this.connecting = false;
      console.log('[MQTT] Da ket noi HiveMQ');
      this.client.subscribe(TOPICS.SENSOR, (err) => {
        if (err) console.error('[MQTT] Subscribe error:', err);
        else console.log(`[MQTT] Subscribed to ${TOPICS.SENSOR}`);
      });
      this._emit('connect', true);
      this._emit('status', 'connected');
    });

    this.client.on('message', (topic, message) => {
      if (topic === TOPICS.SENSOR) {
        try {
          const data = JSON.parse(message.toString());
          this._emit('sensor', normalizeSensorPayload(data));
        } catch (e) {
          console.error('[MQTT] Parse error:', e, 'raw:', message.toString());
        }
      }
    });

    this.client.on('reconnect', () => {
      console.log('[MQTT] Dang ket noi lai...');
      this._emit('status', 'reconnecting');
    });

    this.client.on('disconnect', () => {
      this.connected = false;
      console.log('[MQTT] Mat ket noi');
      this._emit('connect', false);
      this._emit('status', 'disconnected');
    });

    this.client.on('offline', () => {
      this.connected = false;
      console.log('[MQTT] Ngoai tuyen');
      this._emit('connect', false);
      this._emit('status', 'offline');
    });

    this.client.on('error', (err) => {
      console.error('[MQTT] Error:', err);
      this.connected = false;
      this.connecting = false;
      this._emit('connect', false);
      this._emit('error', err);
    });
  }

  publishControl(command) {
    if (this.client && this.connected) {
      this.client.publish(TOPICS.CONTROL, command, { qos: 1 }, (err) => {
        if (err) console.error('[MQTT] Publish error:', err);
        else console.log(`[MQTT] Da gui len ${TOPICS.CONTROL}: ${command}`);
      });
    } else {
      console.warn('[MQTT] Khong the gui: chua ket noi');
    }
  }

  publishConfig(config) {
    if (this.client && this.connected) {
      const payload = JSON.stringify(config);
      this.client.publish(TOPICS.CONFIG, payload, { qos: 1 }, (err) => {
        if (err) console.error('[MQTT] Publish config error:', err);
        else console.log(`[MQTT] Da gui len ${TOPICS.CONFIG}: ${payload}`);
      });
    } else {
      console.warn('[MQTT] Khong the gui config: chua ket noi');
    }
  }

  on(event, listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(listener);
  }

  off(event, listener) {
    if (this.listeners.has(event)) {
      const filtered = this.listeners.get(event).filter((l) => l !== listener);
      this.listeners.set(event, filtered);
    }
  }

  _emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((l) => l(data));
    }
  }

  disconnect() {
    if (this.client) {
      this.client.end(true);
      this.client = null;
      this.connected = false;
      this.connecting = false;
    }
  }

  isConnected() {
    return this.connected;
  }
}

export const mqttService = new MqttService();
