import mqtt from 'mqtt';
import { normalizeSensorPayload } from '../utils/normalizeSensor';

const MQTT_URL = 'wss://916cc55df8ed4fa2bfff8e4d25fd0f56.s1.eu.hivemq.cloud:8884/mqtt';
const MQTT_OPTIONS = {
  username: 'location',
  password: 'Abc12345',
  clientId: `iot_mobile_${Math.random().toString(16).slice(2, 10)}`,
  clean: true,
  reconnectPeriod: 3000,
  connectTimeout: 10000,
};

const SENSOR_TOPIC  = 'esp32/sensor';
const CONTROL_TOPIC = 'esp32/control';

export default class MqttService {
  constructor() {
    this.client = null;
    this.listeners = new Map();
  }

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(fn);
  }

  off(event, fn) {
    if (this.listeners.has(event)) {
      this.listeners.set(event, this.listeners.get(event).filter(l => l !== fn));
    }
  }

  _emit(event, data) {
    (this.listeners.get(event) || []).forEach(fn => fn(data));
  }

  connect() {
    if (this.client) return;
    try {
      this.client = mqtt.connect(MQTT_URL, MQTT_OPTIONS);

      this.client.on('connect', () => {
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

      this.client.on('close', () => this._emit('status', 'offline'));

      this.client.on('error', (err) => {
        console.warn('[MQTT] Error:', err.message);
        this._emit('status', 'offline');
      });
    } catch (err) {
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
    }
  }
}
