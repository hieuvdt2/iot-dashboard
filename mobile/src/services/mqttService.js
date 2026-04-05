import mqtt from 'mqtt';

const MQTT_URL = 'wss://916cc55df8ed4fa2bfff8e4d25fd0f56.s1.eu.hivemq.cloud:8884/mqtt';
const MQTT_OPTIONS = {
  username: 'location',
  password: 'Abc12345',
  clientId: `iot_mobile_${Math.random().toString(16).slice(2, 10)}`,
  clean: true,
  reconnectPeriod: 3000,
  connectTimeout: 10000,
};

export const TOPICS = {
  SENSOR: 'esp32/sensor',
  CONTROL: 'esp32/control',
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
      console.log('[MQTT Mobile] Connected');
      this.client.subscribe(TOPICS.SENSOR);
      this._emit('connect', true);
      this._emit('status', 'connected');
    });

    this.client.on('message', (topic, message) => {
      if (topic === TOPICS.SENSOR) {
        try {
          const data = JSON.parse(message.toString());
          this._emit('sensor', data);
        } catch (e) {
          console.error('[MQTT Mobile] Parse error:', e);
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

    this.client.on('error', (err) => {
      console.error('[MQTT Mobile] Error:', err);
      this.connected = false;
      this.connecting = false;
      this._emit('connect', false);
      this._emit('status', 'error');
    });
  }

  publishControl(command) {
    if (this.client && this.connected) {
      this.client.publish(TOPICS.CONTROL, command, { qos: 1 });
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
    }
  }
}

export const mqttService = new MqttService();
