require('dotenv').config();

const mqtt = require('mqtt');
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const admin = require('firebase-admin');
const { handleAssistantChat, pickProvider } = require('./assistant');

// ===== MQTT CONFIG =====
const MQTT_URL = process.env.MQTT_URL;
const MQTT_OPTIONS = {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  clientId:
    process.env.MQTT_CLIENT_ID ||
    `iot_server_${Math.random().toString(16).slice(2, 10)}`,
  clean: true,
  reconnectPeriod: 3000,
};

if (!MQTT_URL) {
  console.error('[MQTT] Missing MQTT_URL. Set it in environment variables.');
  process.exit(1);
}

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
let firebaseInitError = null;

function loadServiceAccount() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawJson) {
    return JSON.parse(rawJson);
  }
  const accountPath =
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    path.join(__dirname, 'smart-garden-firebase.json');
  return require(accountPath);
}

try {
  const serviceAccount = loadServiceAccount();
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: FIREBASE_DB_URL,
  });
  firebaseDb = admin.database();
  firebaseReady = true;
  console.log('[Firebase] Admin SDK connected');
} catch (err) {
  firebaseInitError = err.message;
  console.error('[Firebase] Init error:', err.message);
  console.error(
    '[Firebase] Trên Render: thêm env FIREBASE_SERVICE_ACCOUNT_JSON (nội dung file JSON service account)',
  );
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
function parseCorsOrigins() {
  const raw = (process.env.CORS_ORIGIN || '').trim();
  if (!raw || raw === '*') return true;
  return raw.split(',').map((origin) => origin.trim()).filter(Boolean);
}

const corsOrigins = parseCorsOrigins();

const corsOptions = {
  origin: corsOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
};

const io = new Server(server, {
  cors: {
    origin: corsOrigins === true ? '*' : corsOrigins,
    methods: ['GET', 'POST', 'OPTIONS'],
  },
});

const buildPath = path.join(__dirname, '../build');
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// ===== API (đăng ký trước static để không bị che) =====
let lastSensorData = null;

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    firebase: firebaseReady,
    firebaseError: firebaseInitError,
    routes: [
      'GET /api/health',
      'GET /api/sensor',
      'GET /api/assistant/status',
      'POST /api/admin/sync-users',
      'POST /api/assistant/chat',
    ],
  });
});

app.get('/api/sensor', (req, res) => {
  res.json({ data: lastSensorData, timestamp: new Date().toISOString() });
});

app.get('/api/assistant/status', (req, res) => {
  const provider = pickProvider();
  res.json({
    enabled: Boolean(provider),
    provider: provider || null,
  });
});

/** GET vào URL sync — trình duyệt dùng GET; API thật là POST */
app.get('/api/admin/sync-users', (req, res) => {
  res.status(405).json({
    error: 'Endpoint này chỉ nhận POST. Dùng nút trên trang Quản trị hoặc: curl -X POST https://.../api/admin/sync-users',
  });
});

/** Đồng bộ mọi user Firebase Authentication → RTDB users/ + roles/ */
app.post('/api/admin/sync-users', async (req, res) => {
  if (!firebaseReady || !firebaseDb) {
    return res.status(503).json({ error: 'Firebase Admin chưa sẵn sàng' });
  }
  try {
    const updates = {};
    let synced = 0;
    let nextPageToken;
    do {
      const listResult = await admin.auth().listUsers(1000, nextPageToken);
      for (const record of listResult.users) {
        const uid = record.uid;
        const createdAt = record.metadata?.creationTime
          ? new Date(record.metadata.creationTime).getTime()
          : Date.now();
        updates[`users/${uid}/email`] = record.email || '';
        updates[`users/${uid}/createdAt`] = createdAt;
        synced += 1;
        const roleSnap = await firebaseDb.ref(`roles/${uid}`).once('value');
        if (!roleSnap.val()) {
          updates[`roles/${uid}`] = 'viewer';
        }
      }
      nextPageToken = listResult.pageToken;
    } while (nextPageToken);

    if (Object.keys(updates).length > 0) {
      await firebaseDb.ref().update(updates);
    }
    console.log(`[Admin] Synced ${synced} auth users to RTDB`);
    res.json({ ok: true, count: synced });
  } catch (err) {
    console.error('[Admin] sync-users error:', err.message);
    res.status(500).json({ error: err.message || 'Không thể đồng bộ' });
  }
});

app.post('/api/assistant/chat', async (req, res) => {
  try {
    const { messages, context } = req.body || {};
    const result = await handleAssistantChat({ messages, context });
    res.json(result);
  } catch (err) {
    console.error('[Assistant] Error:', err.message);
    res.status(err.status || 500).json({
      error: err.message || 'Không thể xử lý yêu cầu trợ lý',
    });
  }
});

// Static web build (sau API)
app.use(express.static(buildPath));

// SPA fallback — không áp dụng cho /api/*
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      error: 'API không tồn tại. Có thể server Render chưa deploy bản mới — kiểm tra GET /api/health',
      path: req.path,
      method: req.method,
    });
  }
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
  console.log(`   Device:   ${DEVICE_ID}`);
  const aiProvider = pickProvider();
  if (aiProvider) {
    console.log(`   AI:       ${aiProvider} (ready)`);
  } else {
    console.log('   AI:       DISABLED — thêm GEMINI_API_KEY vào server/.env rồi restart');
  }
  console.log(`   CORS:     ${process.env.CORS_ORIGIN?.trim() || 'all origins'}\n`);
});
