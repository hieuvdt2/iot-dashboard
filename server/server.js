const mqtt = require('mqtt');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

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
});

mqttClient.on('message', (topic, message) => {
  const raw = message.toString();
  console.log(`[MQTT] Received on ${topic}:`, raw);

  if (topic === TOPICS.SENSOR) {
    try {
      lastSensorData = JSON.parse(raw);
      // Broadcast to all Socket.IO clients
      io.emit('sensor', raw);
    } catch (e) {
      console.error('[MQTT] Failed to parse:', e);
      io.emit('sensor', raw);
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
});
