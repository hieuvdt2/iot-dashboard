#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <WiFiManager.h>
#include <Preferences.h>

// ================= MQTT =================
const char* mqtt_server = "916cc55df8ed4fa2bfff8e4d25fd0f56.s1.eu.hivemq.cloud";
const int mqtt_port = 8883;

const char* mqtt_user = "location";
const char* mqtt_pass = "Abc12345";

WiFiClientSecure espClient;
PubSubClient client(espClient);
Preferences prefs;

// ================= SENSOR =================
#define DHTPIN 4
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

#define SOIL_PIN 34
int dry = 3500;
int wet = 1500;

#define RELAY_PIN 27
#define MANUAL_SWITCH_PIN 14          // Code cu dung GPIO14; doi sang 26 neu da han noi day
#define MANUAL_SWITCH_ENABLED true    // false = chua noi cong tac, bo qua GPIO

#define TRIG 5
#define ECHO 18

// Cam bien anh sang moi: module cam quang 3 pin (DO) — thay BH1750 I2C da hong
#define LIGHT_DO_PIN 33
#define LIGHT_ACTIVE_LOW true         // DO = LOW khi du sang; doi false neu bi nguoc
#define LUX_WHEN_DARK  300.0f
#define LUX_WHEN_BRIGHT 12000.0f

// ================= STATE =================
bool autoMode = true;
bool pumpState = false;
bool pumpWebRequest = false;   // Yeu cau bat/tat tu web (che do thu cong)
bool suppressAutoPump = false; // Web gui tat_bom -> tam chan AUTO bat lai bom
bool configReceived = false;

int minSoil = 0;
int targetSoil = 0;
float maxTemp = 0;
float minAirHum = 0;
float maxLux = 0;
float maxWaterDistance = 0;

String gardenStatus = "CHUA_CAU_HINH";

int lastSoilPercent = -1;
float lastDistance = -1;
float lastTemp = 0;
float lastHumi = 0;
float lastLux = 0;
bool hasSensorData = false;
unsigned long lastMqttRetry = 0;

// Debounce công tắc cơ
bool manualSwitchStable = false;
bool manualSwitchReading = false;
unsigned long manualSwitchLastChange = 0;
const unsigned long MANUAL_DEBOUNCE_MS = 50;

// ================= TIME =================
unsigned long lastSend = 0;
unsigned long pumpStartTime = 0;
const long interval = 3000;
const unsigned long MAX_PUMP_MS = 5UL * 60 * 1000;
const unsigned long MQTT_RETRY_MS = 3000;

// PubSubClient mac dinh chi 256 byte -> JSON day du se FAIL publish
#define MQTT_BUFFER_SIZE 1024

// ================= HELPERS =================
const char* mqttTrangThai(int state) {
  switch (state) {
    case -4: return "Het thoi gian ket noi";
    case -3: return "Mat ket noi";
    case -2: return "Ket noi that bai";
    case -1: return "Chua ket noi";
    case  0: return "Da ket noi";
    case  1: return "Giao thuc MQTT khong hop le";
    case  2: return "Client ID khong hop le";
    case  3: return "Broker khong kha dung";
    case  4: return "Sai ten dang nhap hoac mat khau";
    case  5: return "Khong co quyen truy cap";
    default: return "Loi khong xac dinh";
  }
}

bool isPumpOnHardware() {
  return digitalRead(RELAY_PIN) == LOW;
}

void setPump(bool on) {
  digitalWrite(RELAY_PIN, on ? LOW : HIGH);
  pumpState = on;
  if (on) {
    if (pumpStartTime == 0) pumpStartTime = millis();
  } else {
    pumpStartTime = 0;
  }
}

bool readManualSwitchRaw() {
  if (!MANUAL_SWITCH_ENABLED) return false;
  return digitalRead(MANUAL_SWITCH_PIN) == LOW;
}

bool readManualSwitch() {
  bool reading = readManualSwitchRaw();

  if (reading != manualSwitchReading) {
    manualSwitchLastChange = millis();
    manualSwitchReading = reading;
  }

  if ((millis() - manualSwitchLastChange) > MANUAL_DEBOUNCE_MS) {
    if (manualSwitchReading != manualSwitchStable) {
      manualSwitchStable = manualSwitchReading;

      Serial.println("\n===== CONG TAC CO =====");
      if (manualSwitchStable) {
        if (autoMode) {
          Serial.println(">> Cong tac BAT nhung BO QUA (AUTO dang bat)");
        } else {
          Serial.println(">> BAT bom thu cong bang cong tac");
        }
      } else {
        if (autoMode) {
          Serial.println(">> Cong tac TAT (AUTO dang dieu khien bom)");
        } else {
          Serial.println(">> TAT bom thu cong bang cong tac");
        }
      }
      Serial.println("========================");
    }
  }

  return manualSwitchStable;
}

// Cong tac chi dieu khien bom khi AUTO tat
bool manualSwitchControlsPump() {
  return MANUAL_SWITCH_ENABLED && readManualSwitch() && !autoMode;
}

bool isTankEmpty(float distance) {
  return configReceived
    && maxWaterDistance > 0
    && distance > 0
    && distance > maxWaterDistance;
}

float readLightLux() {
  int state = digitalRead(LIGHT_DO_PIN);
  bool isBright = LIGHT_ACTIVE_LOW ? (state == LOW) : (state == HIGH);
  return isBright ? LUX_WHEN_BRIGHT : LUX_WHEN_DARK;
}

void saveConfigToNVS() {
  prefs.begin("garden", false);
  prefs.putInt("minSoil", minSoil);
  prefs.putInt("targetSoil", targetSoil);
  prefs.putFloat("maxTemp", maxTemp);
  prefs.putFloat("minAirHum", minAirHum);
  prefs.putFloat("maxLux", maxLux);
  prefs.putFloat("maxWaterDistance", maxWaterDistance);
  prefs.putBool("hasConfig", true);
  prefs.putBool("autoMode", autoMode);
  prefs.end();
}

void loadConfigFromNVS() {
  prefs.begin("garden", true);
  minSoil = prefs.getInt("minSoil", 0);
  targetSoil = prefs.getInt("targetSoil", 0);
  maxTemp = prefs.getFloat("maxTemp", 0);
  minAirHum = prefs.getFloat("minAirHum", 0);
  maxLux = prefs.getFloat("maxLux", 0);
  maxWaterDistance = prefs.getFloat("maxWaterDistance", 0);
  autoMode = prefs.getBool("autoMode", true);
  configReceived = prefs.getBool("hasConfig", false)
    && minSoil > 0 && targetSoil > 0 && maxTemp > 0 && minAirHum > 0;
  prefs.end();

  if (configReceived) {
    Serial.println("Da tai cau hinh tu bo nho NVS");
    Serial.print("Che do AUTO: ");
    Serial.println(autoMode ? "BAT" : "TAT");
  } else {
    Serial.println("Chua co cau hinh nguong (cho dashboard gui esp32/config)");
  }
}

void updateGardenStatus(int soilPercent, float temp, float humi) {
  if (!configReceived) {
    gardenStatus = "CHUA_CAU_HINH";
    return;
  }

  bool soilDry = soilPercent < minSoil;
  bool weatherHot = temp > maxTemp;
  bool airDry = humi < minAirHum;

  gardenStatus = "TOT";

  if (soilDry || weatherHot || airDry) {
    gardenStatus = "CAN_CHU_Y";
  }

  if (soilPercent < (minSoil - 10)
      || temp > (maxTemp + 5)
      || humi < (minAirHum - 10)) {
    gardenStatus = "NGUY_HIEM";
  }
}

void applyPumpLogic(int soilPercent, float distance) {
  // --- An toan: be can / timeout (uu tien cao nhat) ---
  if (hasSensorData && isTankEmpty(distance)) {
    if (pumpState) Serial.println("[BOM] Be het nuoc -> tat bom");
    setPump(false);
    return;
  }

  if (pumpState && pumpStartTime > 0 && (millis() - pumpStartTime > MAX_PUMP_MS)) {
    Serial.println("[BOM] Qua 5 phut bom lien tuc -> tat bom");
    setPump(false);
    client.publish("esp32/alert", "pump_timeout");
    return;
  }

  // --- AUTO bat: chi AI quyet dinh (tru khi web vua gui tat_bom) ---
  if (autoMode) {
    if (suppressAutoPump) {
      setPump(false);
      return;
    }

    if (configReceived && hasSensorData) {
      bool needWater = soilPercent < minSoil;

      if (needWater) {
        setPump(true);
      } else if (pumpState) {
        if (soilPercent >= targetSoil) {
          Serial.println("[AUTO] Dat du am -> tat bom");
        }
        setPump(false);
      }
    } else if (pumpState) {
      setPump(false);
    }
    return;
  }

  // --- AUTO tat: cong tac co uu tien hon web ---
  if (manualSwitchControlsPump()) {
    setPump(true);
    return;
  }

  // Che do thu cong tu web (AUTO da tat, cong tac co TAT)
  setPump(pumpWebRequest);
}

void publishSensorData(int soilPercent, float temp, float humi, float lux, float distance) {
  if (!client.connected()) {
    Serial.println("[MQTT] Chua ket noi -> bo qua gui du lieu cam bien");
    return;
  }

  pumpState = isPumpOnHardware();

  StaticJsonDocument<768> doc;

  doc["do_am_dat"] = soilPercent;
  doc["nhiet_do"] = temp;
  doc["do_am_khong_khi"] = humi;
  doc["anh_sang"] = lux;
  doc["muc_nuoc"] = distance;

  doc["auto_mode"] = autoMode ? "BAT" : "TAT";
  doc["trang_thai_bom"] = pumpState ? "DANG_TUOI" : "KHONG_TUOI";
  doc["has_config"] = configReceived;
  doc["garden_status"] = gardenStatus;
  doc["manual_switch"] = readManualSwitch();
  doc["manual_switch_active"] = manualSwitchControlsPump();
  doc["pump_web_request"] = pumpWebRequest;
  doc["chan_bom_auto"] = suppressAutoPump;

  // Alias nhe cho dashboard cu
  doc["soil"] = soilPercent;
  doc["temp"] = temp;
  doc["humi"] = humi;
  doc["lux"] = lux;
  doc["distance"] = distance;
  doc["auto"] = autoMode;
  doc["pump"] = pumpState;
  doc["config"] = configReceived;

  char buffer[MQTT_BUFFER_SIZE];
  size_t len = serializeJson(doc, buffer, sizeof(buffer));

  if (len >= sizeof(buffer) - 1) {
    Serial.println("[MQTT] JSON qua dai -> khong gui duoc");
    return;
  }

  bool ok = client.publish("esp32/sensor", buffer, false);

  Serial.println("\n===== GUI DU LIEU MQTT =====");
  Serial.print("Chu de: esp32/sensor | So byte: ");
  Serial.println(len);
  Serial.println(buffer);
  Serial.print("Ket qua gui: ");
  Serial.println(ok ? "Thanh cong" : "That bai");
  if (!ok) {
    Serial.print("Trang thai MQTT: ");
    Serial.print(client.state());
    Serial.print(" (");
    Serial.print(mqttTrangThai(client.state()));
    Serial.println(")");
  }
  Serial.println("----- Trang thai he thong -----");
  Serial.print("Yeu cau bom tu web: ");
  Serial.println(pumpWebRequest ? "BAT" : "TAT");
  Serial.print("Cong tac co: ");
  Serial.println(readManualSwitch() ? "BAT" : "TAT");
  Serial.print("Cong tac co dang dieu khien: ");
  Serial.println(manualSwitchControlsPump() ? "CO" : "KHONG");
  Serial.print("Che do AUTO: ");
  Serial.println(autoMode ? "BAT" : "TAT");
  Serial.print("Chan tuoi AUTO (sau tat_bom): ");
  Serial.println(suppressAutoPump ? "CO" : "KHONG");
  Serial.print("May bom: ");
  Serial.println(isPumpOnHardware() ? "DANG TUOI" : "KHONG TUOI");
  Serial.println("==============================");
}

void syncPumpStateAndPublish() {
  pumpState = isPumpOnHardware();

  if (!hasSensorData) return;

  publishSensorData(
    lastSoilPercent,
    lastTemp,
    lastHumi,
    lastLux,
    lastDistance
  );
}

// ================= WIFI =================
void setup_wifi() {
  WiFiManager wm;
  bool res = wm.autoConnect("SMART_GARDEN_SETUP", "12345678");

  if (!res) {
    Serial.println("[WiFi] Ket noi that bai -> khoi dong lai...");
    ESP.restart();
  }

  Serial.println("[WiFi] Da ket noi thanh cong");
  Serial.print("[WiFi] Dia chi IP: ");
  Serial.println(WiFi.localIP());
}

// ================= MQTT CALLBACK =================
void callback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.println("\n===== MQTT NHAN =====");
  Serial.print("Chu de: ");
  Serial.println(topic);
  Serial.print("Noi dung: ");
  Serial.println(message);

  if (String(topic) == "esp32/control") {
    if (message == "auto_on") {
      autoMode = true;
      suppressAutoPump = false;
      saveConfigToNVS();
      Serial.println("[DIEU KHIEN] Bat che do AUTO - cong tac co bi vo hieu");
      if (hasSensorData) {
        applyPumpLogic(lastSoilPercent, lastDistance);
        syncPumpStateAndPublish();
      }
    } else if (message == "auto_off") {
      autoMode = false;
      saveConfigToNVS();
      Serial.println("[DIEU KHIEN] Tat che do AUTO - cong tac co hoat dong lai");
      if (manualSwitchControlsPump()) {
        setPump(true);
      } else {
        setPump(pumpWebRequest);
      }
      syncPumpStateAndPublish();
    } else if (message == "bat_bom") {
      if (autoMode) {
        Serial.println("[DIEU KHIEN] Bo qua bat_bom: AUTO dang bat (hay tat AUTO truoc)");
      } else if (manualSwitchControlsPump()) {
        Serial.println("[DIEU KHIEN] Bo qua bat_bom: cong tac co dang BAT");
      } else {
        suppressAutoPump = false;
        pumpWebRequest = true;
        setPump(true);
        Serial.println("[DIEU KHIEN] Bat bom thu cong tu web");
        syncPumpStateAndPublish();
      }
    } else if (message == "tat_bom") {
      pumpWebRequest = false;
      suppressAutoPump = true;

      if (manualSwitchControlsPump()) {
        Serial.println("[DIEU KHIEN] Dat yeu cau tat bom nhung cong tac co dang BAT -> bom van chay");
      } else {
        setPump(false);
        if (autoMode) {
          Serial.println("[DIEU KHIEN] Tat bom (AUTO dang bat -> tam chan tu tuoi tu dong)");
        } else {
          Serial.println("[DIEU KHIEN] Tat bom thu cong tu web");
        }
      }
      syncPumpStateAndPublish();
    } else {
      Serial.println("[DIEU KHIEN] Lenh khong hop le");
    }
  }

  if (String(topic) == "esp32/config") {
    StaticJsonDocument<512> doc;
    DeserializationError err = deserializeJson(doc, message);
    if (err) {
      Serial.println("[CAU HINH] Loi phan tich JSON");
      return;
    }

    if (doc.containsKey("minSoil")) minSoil = doc["minSoil"];
    if (doc.containsKey("targetSoil")) targetSoil = doc["targetSoil"];
    if (doc.containsKey("maxTemp")) maxTemp = doc["maxTemp"];
    if (doc.containsKey("minAirHum")) minAirHum = doc["minAirHum"];
    if (doc.containsKey("maxLux")) maxLux = doc["maxLux"];
    if (doc.containsKey("maxWaterDistance")) maxWaterDistance = doc["maxWaterDistance"];

    if (minSoil > 0 && targetSoil > 0 && maxTemp > 0 && minAirHum > 0) {
      configReceived = true;
      saveConfigToNVS();
      Serial.println("[CAU HINH] Da cap nhat nguong va luu vao NVS");
      Serial.print("  - Do am dat toi thieu: ");
      Serial.print(minSoil);
      Serial.print("% | Muc tieu: ");
      Serial.print(targetSoil);
      Serial.println("%");
      Serial.print("  - Nhiet do toi da: ");
      Serial.print(maxTemp);
      Serial.print(" C | Do am kk toi thieu: ");
      Serial.print(minAirHum);
      Serial.println(" %");
    } else {
      Serial.println("[CAU HINH] Du lieu chua du, chua luu");
    }
  }
}

// ================= MQTT RECONNECT (non-blocking) =================
void ensureMqttConnected() {
  if (client.connected()) return;

  unsigned long now = millis();
  if (now - lastMqttRetry < MQTT_RETRY_MS) return;
  lastMqttRetry = now;

  Serial.print("[MQTT] Dang ket noi toi HiveMQ...");

  String clientId = "ESP32_" + String((uint32_t)ESP.getEfuseMac(), HEX);

  if (client.connect(clientId.c_str(), mqtt_user, mqtt_pass,
                     "esp32/status", 0, true, "offline")) {
    Serial.println(" Thanh cong");
    client.setBufferSize(MQTT_BUFFER_SIZE);
    client.subscribe("esp32/control");
    client.subscribe("esp32/config");
    client.publish("esp32/status", "online", true);
    Serial.println("[MQTT] Da dang ky esp32/control va esp32/config");
  } else {
    Serial.print(" That bai (ma ");
    Serial.print(client.state());
    Serial.print(" - ");
    Serial.print(mqttTrangThai(client.state()));
    Serial.println(")");
  }
}

// ================= ULTRASONIC =================
float readDistance() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);

  long duration = pulseIn(ECHO, HIGH, 30000);
  if (duration == 0) return -1;

  return duration * 0.034 / 2;
}

float getDistanceStable() {
  float arr[5];
  int count = 0;

  for (int i = 0; i < 5; i++) {
    float d = readDistance();
    if (d > 0 && d < 400) arr[count++] = d;
    delay(20);
  }

  if (count == 0) return -1;

  for (int i = 0; i < count; i++) {
    for (int j = i + 1; j < count; j++) {
      if (arr[j] < arr[i]) {
        float t = arr[i];
        arr[i] = arr[j];
        arr[j] = t;
      }
    }
  }

  return arr[count / 2];
}

// ================= SOIL =================
int getSoilStable() {
  long sum = 0;
  for (int i = 0; i < 10; i++) {
    sum += analogRead(SOIL_PIN);
    delay(5);
  }
  return sum / 10;
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH);

  pinMode(MANUAL_SWITCH_PIN, INPUT_PULLUP);
  pinMode(LIGHT_DO_PIN, INPUT);

  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);

  dht.begin();

  loadConfigFromNVS();
  setup_wifi();

  espClient.setInsecure();

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  client.setBufferSize(MQTT_BUFFER_SIZE);  // BAT BUOC: mac dinh 256 byte -> publish FAIL
  client.setKeepAlive(60);

  Serial.println("\n========================================");
  Serial.println("  HE THONG VUON THONG MINH san sang");
  Serial.println("  Phien ban firmware: v3.3.3");
  Serial.println("========================================");
  Serial.print("Cam bien sang DO: GPIO ");
  Serial.println(LIGHT_DO_PIN);
  Serial.print("Cong tac co: GPIO ");
  Serial.print(MANUAL_SWITCH_PIN);
  Serial.println(" (chi hoat dong khi AUTO tat)");
  Serial.println("Mo Serial Monitor 115200 de theo doi");
}

// ================= LOOP =================
void loop() {
  ensureMqttConnected();
  client.loop();

  readManualSwitch();

  // Dieu khien bom moi vong (phan hoi nhanh cong tac + web)
  if (hasSensorData) {
    applyPumpLogic(lastSoilPercent, lastDistance);
  } else if (!autoMode) {
    if (manualSwitchControlsPump()) {
      setPump(true);
    } else {
      setPump(pumpWebRequest);
    }
  }

  unsigned long now = millis();
  if (now - lastSend < interval) return;
  lastSend = now;

  // Doc cam bien (goi client.loop() de giu MQTT song)
  client.loop();

  int soilRaw = getSoilStable();
  int soilPercent = map(soilRaw, dry, wet, 0, 100);
  soilPercent = constrain(soilPercent, 0, 100);

  float temp = dht.readTemperature();
  float humi = dht.readHumidity();
  float lux = readLightLux();
  client.loop();
  float distance = getDistanceStable();
  client.loop();

  if (isnan(temp) || isnan(humi)) {
    Serial.println("[CAM BIEN] Loi DHT11 -> dung gia tri lan truoc, van gui MQTT");
    temp = lastTemp;
    humi = lastHumi;
    if (isnan(temp) || isnan(humi)) {
      temp = 0;
      humi = 0;
    }
  } else {
    lastTemp = temp;
    lastHumi = humi;
  }

  lastLux = lux;

  lastSoilPercent = soilPercent;
  lastDistance = distance;
  hasSensorData = true;

  Serial.println("\n----- Doc cam bien -----");
  Serial.print("Do am dat: ");
  Serial.print(soilPercent);
  Serial.print("% | Nhiet do: ");
  Serial.print(temp);
  Serial.print(" C | Do am kk: ");
  Serial.print(humi);
  Serial.print(" % | Anh sang: ");
  Serial.print(lux);
  Serial.print(" lux | Muc nuoc: ");
  Serial.print(distance);
  Serial.println(" cm");

  applyPumpLogic(soilPercent, distance);
  updateGardenStatus(soilPercent, temp, humi);

  syncPumpStateAndPublish();
}
