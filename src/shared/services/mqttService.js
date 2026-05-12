import mqtt from 'mqtt';

const MQTT_URL = 'wss://916cc55df8ed4fa2bfff8e4d25fd0f56.s1.eu.hivemq.cloud:8884/mqtt';
const MQTT_OPTIONS = {
  username: 'location',
  password: 'Abc12345',
  clientId: `iot_web_${Math.random().toString(16).slice(2, 10)}`,
  clean: true,
  reconnectPeriod: 3000,
  connectTimeout: 10000,
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

    this.client = mqtt.connect(MQTT_URL, MQTT_OPTIONS);

    this.client.on('connect', () => {
      this.connected = true;
      this.connecting = false;
      console.log('[MQTT] Connected to HiveMQ');
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
          this._emit('sensor', data);
        } catch (e) {
          console.error('[MQTT] Parse error:', e, 'raw:', message.toString());
        }
      }
    });

    this.client.on('reconnect', () => {
      this._emit('status', 'reconnecting');
    });

    this.client.on('disconnect', () => {
      this.connected = false;
      this._emit('connect', false);
      this._emit('status', 'disconnected');
    });

    this.client.on('offline', () => {
      this.connected = false;
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
        else console.log(`[MQTT] Published to ${TOPICS.CONTROL}: ${command}`);
      });
    } else {
      console.warn('[MQTT] Cannot publish: not connected');
    }
  }

  publishConfig(config) {
    if (this.client && this.connected) {
      const payload = JSON.stringify(config);
      this.client.publish(TOPICS.CONFIG, payload, { qos: 1 }, (err) => {
        if (err) console.error('[MQTT] Publish config error:', err);
        else console.log(`[MQTT] Published to ${TOPICS.CONFIG}: ${payload}`);
      });
    } else {
      console.warn('[MQTT] Cannot publish config: not connected');
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
