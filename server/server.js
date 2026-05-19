const mqtt = require('mqtt');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const admin = require('firebase-admin');

// ===== MQTT CONFIG =====
const MQTT_URL = 'mqtts://916cc55df8ed4fa2bfff8e4d25fd0f56.s1.eu.hivemq.cloud:8883';
const MQTT_OPTIONS = {
  username: 'location',
  password: 'Abc12345',
  clientId: `iot_server_${Math.random().toString(16).slice(2, 10)}`,
  clean: true,
  reconnectPeriod: 3000,
};

const TOPICS = {
  SENSOR: 'esp32/sensor',
  CONTROL: 'esp32/control',
  CONFIG: 'esp32/config',
};

// ===== FIREBASE CONFIG =====
const FIREBASE_DB_URL =
  process.env.FIREBASE_DB_URL ||
  'https://smart-garden-eace0-default-rtdb.asia-southeast1.firebasedatabase.app';
const FIREBASE_SERVICE_ACCOUNT =
  process.env.FIREBASE_SERVICE_ACCOUNT ||
  path.join(__dirname, 'smart-garden-firebase.json');
const DEVICE_ID = process.env.DEVICE_ID || 'esp32_01';

let firebaseReady = false;
let firebaseDb = null;

try {
  const serviceAccount = require(FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: FIREBASE_DB_URL,
  });
  firebaseDb = admin.database();
  firebaseReady = true;
  console.log('[Firebase] Connected');
} catch (err) {
  console.error('[Firebase] Init error:', err.message);
}

const normalizeSensorPayload = (data) => {
  if (!data || typeof data !== 'object') return null;

  const soil = data.soil ?? data.do_am_dat;
  const temp = data.temp ?? data.nhiet_do;
  const humi = data.humi ?? data.do_am_khong_khi;
  const lux = data.lux ?? data.anh_sang;
  const distance = data.distance ?? data.muc_nuoc;

  let auto = data.auto;
  if (auto === undefined && typeof data.auto_mode === 'string') {
    auto = data.auto_mode === 'BAT';
  }

  let pump = data.pump;
  if (pump === undefined && typeof data.trang_thai_bom === 'string') {
    pump = data.trang_thai_bom === 'DANG_TUOI';
  }

  const config = data.config ?? data.has_config;
  const ts = Date.now();

  const normalized = {
    soil,
    temp,
    humi,
    lux,
    distance,
    pump,
    auto,
    config,
    ts,
  };

  if (soil !== undefined) normalized.do_am_dat = soil;
  if (temp !== undefined) normalized.nhiet_do = temp;
  if (humi !== undefined) normalized.do_am_khong_khi = humi;
  if (lux !== undefined) normalized.anh_sang = lux;
  if (distance !== undefined) normalized.muc_nuoc = distance;
  if (config !== undefined) normalized.has_config = config;
  if (auto !== undefined) normalized.auto_mode = auto ? 'BAT' : 'TAT';
  if (pump !== undefined) {
    normalized.trang_thai_bom = pump ? 'DANG_TUOI' : 'KHONG_TUOI';
  }

  return normalized;
};

const writeSensorToFirebase = async (payload) => {
  if (!firebaseReady || !firebaseDb || !payload) return;

  const ts = payload.ts || Date.now();
  const dateKey = new Date(ts).toISOString().slice(0, 10);
  const deviceRef = firebaseDb.ref(`devices/${DEVICE_ID}`);

  await deviceRef.child('latest').set(payload);
  await deviceRef.child(`history/${dateKey}/${ts}`).set(payload);
};

const writeConfigToFirebase = async (config) => {
  if (!firebaseReady || !firebaseDb || !config) return;

  const deviceRef = firebaseDb.ref(`devices/${DEVICE_ID}`);
  await deviceRef.child('config').set({
    ...config,
    updatedAt: Date.now(),
  });
};

// ===== EXPRESS + SOCKET.IO =====
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Serve web build if available
const buildPath = path.join(__dirname, '../build');
app.use(express.static(buildPath));
app.use(express.json());

// API: last sensor data
let lastSensorData = null;
app.get('/api/sensor', (req, res) => {
  res.json({ data: lastSensorData, timestamp: new Date().toISOString() });
});

// SPA fallback
app.get('*', (req, res) => {
  const indexPath = path.join(buildPath, 'index.html');
  const fs = require('fs');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ message: 'IoT Dashboard Server running. Build web app first.' });
  }
});

// ===== MQTT CLIENT =====
const mqttClient = mqtt.connect(MQTT_URL, MQTT_OPTIONS);

mqttClient.on('connect', () => {
  console.log('[MQTT] Connected to HiveMQ Cloud');
  mqttClient.subscribe(TOPICS.SENSOR, (err) => {
    if (err) console.error('[MQTT] Subscribe error:', err);
    else console.log(`[MQTT] Subscribed to ${TOPICS.SENSOR}`);
  });
  mqttClient.subscribe(TOPICS.CONFIG, (err) => {
    if (err) console.error('[MQTT] Subscribe error:', err);
    else console.log(`[MQTT] Subscribed to ${TOPICS.CONFIG}`);
  });
});

mqttClient.on('message', (topic, message) => {
  const raw = message.toString();
  console.log(`[MQTT] Received on ${topic}:`, raw);

  if (topic === TOPICS.SENSOR) {
    try {
      const parsed = JSON.parse(raw);
      const normalized = normalizeSensorPayload(parsed);
      lastSensorData = normalized || parsed;

      // Broadcast to all Socket.IO clients
      io.emit('sensor', JSON.stringify(lastSensorData));

      writeSensorToFirebase(lastSensorData).catch((err) => {
        console.error('[Firebase] Write sensor error:', err.message);
      });
    } catch (e) {
      console.error('[MQTT] Failed to parse:', e);
      io.emit('sensor', raw);
    }
  }

  if (topic === TOPICS.CONFIG) {
    try {
      const parsed = JSON.parse(raw);
      writeConfigToFirebase(parsed).catch((err) => {
        console.error('[Firebase] Write config error:', err.message);
      });
    } catch (e) {
      console.error('[MQTT] Failed to parse config:', e);
    }
  }
});

mqttClient.on('error', (err) => {
  console.error('[MQTT] Error:', err.message);
});

mqttClient.on('reconnect', () => {
  console.log('[MQTT] Reconnecting...');
});

mqttClient.on('disconnect', () => {
  console.log('[MQTT] Disconnected');
});

// ===== SOCKET.IO =====
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Send last known data to new client
  if (lastSensorData) {
    socket.emit('sensor', JSON.stringify(lastSensorData));
  }

  // Client sends pump control command
  socket.on('control', (msg) => {
    console.log(`[Socket.IO] Control from ${socket.id}: ${msg}`);
    if (mqttClient.connected) {
      mqttClient.publish(TOPICS.CONTROL, msg, { qos: 1 }, (err) => {
        if (err) console.error('[MQTT] Publish error:', err);
        else console.log(`[MQTT] Published: ${msg}`);
      });
    } else {
      console.warn('[MQTT] Not connected, cannot publish control');
      socket.emit('error', 'MQTT not connected');
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
  });
});

// ===== START =====
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 IoT Dashboard Server running`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   MQTT:    ${MQTT_URL}`);
  console.log(`   Topics:  ${TOPICS.SENSOR} (sub), ${TOPICS.CONTROL} (pub)\n`);
  console.log(`   Firebase: ${firebaseReady ? 'ready' : 'not ready'}`);
  console.log(`   Device:   ${DEVICE_ID}\n`);
});
