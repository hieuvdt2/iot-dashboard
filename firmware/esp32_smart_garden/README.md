# Firmware ESP32 — Vườn thông minh (v3.4.0)

Mã nguồn Arduino cho ESP32, đồng bộ với dashboard `iot-dashboard` (MQTT + Firebase).

## Cảm biến ánh sáng

Dùng **module cảm quang 3 pin (DO)** trên **GPIO 33** — không còn BH1750 I2C.

- VCC → 3.3V, GND → GND, DO → GPIO 33
- Vặn pot trên module để chỉnh ngưỡng sáng/tối
- Firmware map DO → lux giả (`300` tối / `12000` sáng) cho dashboard
- Nếu sáng/tối bị ngược: đổi `LIGHT_ACTIVE_LOW` trong sketch

## Cài đặt

1. Arduino IDE 2.x + board **esp32** (Espressif).
2. Cài thư viện: PubSubClient, DHT sensor library, ArduinoJson, WiFiManager.
3. Mở `esp32_smart_garden.ino`, điền `mqtt_user` và `mqtt_pass` (HiveMQ Cloud).
4. Nạp firmware, mở Serial Monitor **115200**.

## WiFi lần đầu

- AP: `SMART_GARDEN_SETUP` (mật khẩu AP cấu hình trong sketch).
- Chọn Wi‑Fi nhà → ESP32 lưu và tự kết nối lại.

## Topic MQTT

| Topic | Vai trò |
|-------|---------|
| `esp32/sensor` | Publish dữ liệu cảm biến |
| `esp32/control` | Subscribe lệnh bơm / AUTO |
| `esp32/config` | Subscribe ngưỡng |
| `esp32/status` | Online / offline (LWT) |

## Bảo mật

Không commit username/password MQTT lên Git công khai. File trong repo dùng placeholder `<MQTT_USERNAME>` / `<MQTT_PASSWORD>`.
