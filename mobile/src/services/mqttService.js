import mqtt from 'mqtt';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeSensorPayload } from '../utils/normalizeSensor';

const MQTT_URL = 'wss://916cc55df8ed4fa2bfff8e4d25fd0f56.s1.eu.hivemq.cloud:8884/mqtt';
const CLIENT_ID_KEY = 'iot_mqtt_client_id';

const MQTT_BASE_OPTIONS = {
  username: 'location',
  password: 'Abc12345',
  clean: true,
  reconnectPeriod: 3000,
  connectTimeout: 10000,
};

const SENSOR_TOPIC = 'esp32/sensor';
const CONTROL_TOPIC = 'esp32/control';

/** Mỗi thiết bị cần clientId cố định & unique — trùng ID trên HiveMQ sẽ đá client cũ */
async function getMobileClientId() {
  try {
    const existing = await AsyncStorage.getItem(CLIENT_ID_KEY);
    if (existing) return existing;
    const id = `iot_mobile_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 10)}`;
    await AsyncStorage.setItem(CLIENT_ID_KEY, id);
    return id;
  } catch {
    return `iot_mobile_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 10)}`;
  }
}

export default class MqttService {
  constructor() {
    this.client = null;
    this.connecting = false;
    this.listeners = new Map();
  }

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(fn);
  }

  off(event, fn) {
    if (this.listeners.has(event)) {
      this.listeners.set(event, this.listeners.get(event).filter((l) => l !== fn));
    }
  }

  _emit(event, data) {
    (this.listeners.get(event) || []).forEach((fn) => fn(data));
  }

  connect() {
    if (this.client || this.connecting) return;
    this.connecting = true;
    this._openConnection();
  }

  async _openConnection() {
    try {
      const clientId = await getMobileClientId();
      this.client = mqtt.connect(MQTT_URL, { ...MQTT_BASE_OPTIONS, clientId });
      console.log('[MQTT] Ket noi voi clientId:', clientId);

      this.client.on('connect', () => {
        this.connecting = false;
        console.log('[MQTT] Connected');
        this._emit('status', 'online');
        this.client.subscribe(SENSOR_TOPIC, { qos: 1 });
      });

      this.client.on('message', (topic, message) => {
        if (topic !== SENSOR_TOPIC) return;
        try {
          const raw = JSON.parse(message.toString());
          const data = normalizeSensorPayload(raw);
          this._emit('sensorData', data);
          if (raw.pumpStatus !== undefined) {
            this._emit('pumpStatus', raw.pumpStatus);
          }
          if (raw.autoMode !== undefined) {
            this._emit('autoMode', raw.autoMode);
          }
        } catch (e) {
          console.warn('[MQTT] Parse error:', e.message);
        }
      });

      this.client.on('reconnect', () => this._emit('status', 'reconnecting'));

      this.client.on('close', () => {
        this.connecting = false;
        this._emit('status', 'offline');
      });

      this.client.on('error', (err) => {
        this.connecting = false;
        console.warn('[MQTT] Error:', err.message);
        this._emit('status', 'offline');
      });
    } catch (err) {
      this.connecting = false;
      console.warn('[MQTT] Init error:', err.message);
      this._emit('status', 'offline');
    }
  }

  publish(topic, payload) {
    if (this.client?.connected) {
      this.client.publish(topic, String(payload), { qos: 1 });
    } else {
      console.warn('[MQTT] Not connected — cannot publish');
    }
  }

  disconnect() {
    if (this.client) {
      this.client.end(true);
      this.client = null;
      this.connecting = false;
    }
  }
}
