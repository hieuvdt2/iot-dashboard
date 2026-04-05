# 📊 IoT Dashboard — Multi-Platform (Web · Mobile · Desktop)

Dashboard theo dõi dữ liệu cảm biến ESP32 theo thời gian thực qua MQTT.

---

## Cấu trúc dự án

```
iot-dashboard/
├── src/                          # Web App (CRA - React)
│   ├── shared/
│   │   ├── components/
│   │   │   ├── SensorCard.jsx    # Hiển thị 4 giá trị cảm biến
│   │   │   ├── SensorChart.jsx   # Biểu đồ realtime (Recharts)
│   │   │   └── ControlButtons.jsx# Nút bật/tắt bơm
│   │   ├── services/
│   │   │   └── mqttService.js    # Kết nối MQTT qua WebSocket
│   │   └── utils/
│   │       └── sensorHistory.js  # Quản lý lịch sử dữ liệu
│   ├── App.js                    # Dashboard chính
│   └── App.css                   # Dark theme styles
│
├── mobile/                       # Mobile App (Expo / React Native)
│   ├── src/
│   │   ├── components/           # RN components (SensorCard, Chart, Controls)
│   │   ├── services/             # MQTT service (React Native)
│   │   └── utils/                # History + AsyncStorage
│   ├── App.js                    # Entry point
│   └── package.json
│
├── desktop/                      # Desktop App (Electron)
│   ├── main.js                   # Electron main process
│   ├── preload.js                # Context bridge
│   └── package.json
│
└── server/                       # Node.js MQTT Bridge (tùy chọn)
    ├── server.js                 # MQTT ↔ Socket.IO bridge
    └── package.json
```

---

## Cài đặt & Chạy

### 1. Web (React)

```bash
# Tại thư mục gốc
npm install
npm start
# Mở: http://localhost:3000
```

### 2. Mobile (Expo)

```bash
cd mobile
npm install
npx expo start

# Chạy trên điện thoại: quét QR bằng Expo Go
# Chạy Android emulator: npm run android
# Chạy iOS simulator: npm run ios
```

### 3. Desktop (Electron)

```bash
# Bước 1: Build web app
npm run build

# Bước 2: Cài Electron
cd desktop
npm install

# Bước 3: Chạy Electron (dùng production build)
npm start

# Hoặc chạy với dev server (cần web đang chạy ở port 3000)
npm run dev
```

### 4. Server MQTT Bridge (tùy chọn)

Dùng khi cần bridge MQTT ↔ Socket.IO cho các client không hỗ trợ WebSocket trực tiếp.

```bash
cd server
npm install
npm start
# Server chạy tại: http://localhost:3001
```

---

## Cấu hình MQTT

| Thông số | Giá trị |
|----------|---------|
| Broker | HiveMQ Cloud |
| URL (WebSocket) | `wss://...hivemq.cloud:8884/mqtt` |
| URL (Server) | `mqtts://...hivemq.cloud:8883` |
| Username | `location` |
| Password | `Abc12345` |
| Topic Sensor | `esp32/sensor` |
| Topic Control | `esp32/control` |

---

## Dữ liệu ESP32

JSON format từ topic `esp32/sensor`:
```json
{
  "nhiet_do": 28.5,
  "do_am_khong_khi": 65,
  "do_am_dat": 42,
  "muc_nuoc": 15
}
```

Lệnh điều khiển bơm (topic `esp32/control`):
- `"bat_bom"` — Bật bơm
- `"tat_bom"` — Tắt bơm

---

## Tính năng

- **Realtime**: Cập nhật dữ liệu liên tục qua MQTT WebSocket
- **SensorCard**: Hiển thị nhiệt độ, độ ẩm đất, độ ẩm không khí, mực nước
- **SensorChart**: Biểu đồ line chart realtime, toggle từng sensor
- **ControlButtons**: Bật/tắt bơm nước với feedback trạng thái
- **History Table**: Bảng lịch sử với bộ lọc và lưu vào localStorage
- **Responsive**: Tối ưu cho desktop, tablet và mobile
- **Dark Theme**: Giao diện tối hiện đại

---

## Dependencies chính

| Package | Mục đích |
|---------|---------|
| `mqtt` | MQTT client (hỗ trợ WebSocket) |
| `recharts` | Biểu đồ cho Web |
| `react-native-chart-kit` | Biểu đồ cho Mobile |
| `electron` | Desktop wrapper |
| `socket.io` | Realtime bridge (server) |
