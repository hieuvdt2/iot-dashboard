# BÁO CÁO ĐỒ ÁN TỐT NGHIỆP

**TRƯỜNG ĐẠI HỌC GIAO THÔNG VẬN TẢI**  
**KHOA CÔNG NGHỆ THÔNG TIN**

---

## THIẾT KẾ VÀ XÂY DỰNG HỆ THỐNG VƯỜN THÔNG MINH

*Triển khai giám sát, tưới cây tự động và dashboard đa nền tảng qua MQTT & Firebase*

---

| | |
|---|---|
| **Sinh viên thực hiện** | **Vũ Đức Trọng Hiếu** |
| **Mã số sinh viên** | **5240086** |
| **Lớp** | CNTT2 |
| **Khóa** | K28.1 |
| **Hệ đào tạo** | Liên thông chính quy |
| **Ngành** | Công nghệ Thông tin |
| **Điện thoại** | 0965073926 |
| **Email** | hieuvdt2@gmail.com |
| **Giảng viên hướng dẫn** | **ThS. Đỗ Văn Đức** |
| **Đơn vị công tác** | Trường Đại học Giao thông Vận tải |
| **Email GVHD** | ducdvgtvt@gmail.com |
| **Điện thoại GVHD** | 0912324873 |
| **Mã đề cương** | 5240086_VuDucTrongHieu_CNTT2_K28.1.1 |
| **Ngày đề cương** | 10/02/2025 |
| **Ngày hoàn thành báo cáo** | *[Điền: ngày/tháng/năm]* |
| **Mã nguồn triển khai** | `iot-dashboard` |

<div style="page-break-after: always;"></div>

---

## LỜI CẢM ƠN

Lời đầu tiên, em xin trân thành cảm ơn **ThS. Đỗ Văn Đức**, người đã hết lòng chỉ dẫn, truyền đạt những kiến thức chuyên môn cũng như những kinh nghiệm liên quan cho em trong suốt quá trình thực hiện đồ án **“Thiết kế và xây dựng hệ thống vườn thông minh”**.

Xin chân thành cảm ơn đến tất cả Quý Thầy, Cô nhà trường nói chung và các Thầy, Cô **Khoa Công nghệ Thông tin** nói riêng của **Trường Đại học Giao thông Vận tải** đã giảng dạy, trang bị cho em những kiến thức rất bổ ích và quý báu trong suốt quá trình học tập để em có thể áp dụng, nghiên cứu và hoàn thành đề tài này.

Trong quá trình thực hiện đồ án, với điều kiện thời gian cũng như kinh nghiệm, kiến thức còn hạn chế nên báo cáo không thể tránh khỏi những thiếu sót. Em rất mong nhận được những ý kiến đóng góp của Thầy, Cô và các bạn để em có thêm được nhiều kinh nghiệm vào công việc trong tương lai.

Cuối cùng, em xin chân thành cảm ơn **gia đình và bạn bè**, đã luôn tạo điều kiện, quan tâm, giúp đỡ, động viên em trong suốt quá trình học tập và hoàn thành đồ án này.

Em xin chân thành cảm ơn!

**Hà Nội, ngày …… tháng …… năm 2025**

**Sinh viên thực hiện đề tài**

**Vũ Đức Trọng Hiếu**

<div style="page-break-after: always;"></div>

---

## MỤC LỤC

### Phần mở đầu

- [Lời cảm ơn](#lời-cảm-ơn)
- [Mục lục](#mục-lục)
- [Danh mục các từ viết tắt](#danh-mục-các-từ-viết-tắt)
- [Danh mục bảng biểu](#danh-mục-bảng-biểu)
- [Danh mục hình ảnh](#danh-mục-hình-ảnh)
- [Mở đầu](#mở-đầu)
- [Tóm tắt](#tóm-tắt)

### Nội dung chính

**[CHƯƠNG 1: TỔNG QUAN HỆ THỐNG VƯỜN THÔNG MINH](#chương-1-tổng-quan-hệ-thống-vườn-thông-minh)**

- [1.1. Nông nghiệp thông minh, lý do, mục tiêu và phạm vi](#11-nông-nghiệp-thông-minh-lý-do-chọn-đề-tài-mục-tiêu-và-phạm-vi)
- [1.2. Tổng quan Internet of Things (IoT)](#12-tổng-quan-internet-of-things-iot)
  - [1.2.1. Khái niệm và sự phát triển](#121-khái-niệm-và-sự-phát-triển-của-iot)
  - [1.2.2. Kiến trúc và mô hình phân lớp](#122-kiến-trúc-và-mô-hình-phân-lớp)
  - [1.2.3. Ứng dụng IoT trong nông nghiệp](#123-ứng-dụng-iot-trong-nông-nghiệp-và-vườn-thông-minh)
  - [1.2.4. Ưu điểm, thách thức và xu hướng](#124-ưu-điểm-thách-thức-và-xu-hướng)
  - [1.2.5. Đặc điểm hệ thống IoT trong đồ án](#125-đặc-điểm-hệ-thống-iot-trong-đồ-án)
- [1.3. MQTT và Firebase](#13-mqtt-và-firebase)
- [1.4. ESP32, cảm biến, relay và bơm](#14-esp32-cảm-biến-relay-và-bơm-nước)

**[CHƯƠNG 2: PHÂN TÍCH YÊU CẦU VÀ THIẾT KẾ HỆ THỐNG](#chương-2-phân-tích-yêu-cầu-và-thiết-kế-hệ-thống)**

- [2.1. Phân tích yêu cầu hệ thống](#21-phân-tích-yêu-cầu-hệ-thống)
  - [2.1.1. Đối tượng sử dụng và phạm vi phần mềm](#211-đối-tượng-sử-dụng-và-phạm-vi-phần-mềm)
  - [2.1.2. Yêu cầu chức năng](#212-yêu-cầu-chức-năng)
  - [2.1.3. Yêu cầu phi chức năng](#213-yêu-cầu-phi-chức-năng)
  - [2.1.4. Quy tắc cảnh báo và trạng thái vườn](#214-quy-tắc-cảnh-báo-và-trạng-thái-vườn)
- [2.2. Thiết kế kiến trúc phần mềm](#22-thiết-kế-kiến-trúc-phần-mềm)
- [2.3. Thiết kế giao tiếp MQTT](#23-thiết-kế-giao-tiếp-mqtt)
- [2.4. Thiết kế cơ sở dữ liệu Firebase và phân quyền](#24-thiết-kế-cơ-sở-dữ-liệu-firebase-và-phân-quyền)
- [2.5. Luồng dữ liệu và xử lý nghiệp vụ](#25-luồng-dữ-liệu-và-xử-lý-nghiệp-vụ)
- [2.6. Thiết kế cấu trúc mã nguồn và giao diện](#26-thiết-kế-cấu-trúc-mã-nguồn-và-giao-diện)
- [Kết chương 2](#kết-chương-2)

**[CHƯƠNG 3: XÂY DỰNG VÀ TRIỂN KHAI](#chương-3-xây-dựng-và-triển-khai)**

- [3.1. Phần cứng và mô hình thực nghiệm](#31-phần-cứng-và-mô-hình-thực-nghiệm)
- [3.2. Firmware ESP32](#32-firmware-esp32)
- [3.3. Server Node.js](#33-server-nodejs)
- [3.4. Ứng dụng Web](#34-ứng-dụng-web)
- [3.5. Mobile và Desktop](#35-ứng-dụng-mobile-và-desktop)
- [3.6. Kiểm thử, kết quả và đánh giá](#36-kiểm-thử-kết-quả-và-đánh-giá)

### Phần kết thúc

- [Kết luận và hướng phát triển](#kết-luận-và-hướng-phát-triển)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)
- [Phụ lục](#phụ-lục) (gồm Phụ lục F — Đối chiếu đề cương)

<div style="page-break-after: always;"></div>

---

## DANH MỤC CÁC TỪ VIẾT TẮT

| Viết tắt | Tiếng Anh / Thuật ngữ gốc | Nghĩa tiếng Việt |
|:--------:|---------------------------|------------------|
| API | Application Programming Interface | Giao diện lập trình ứng dụng |
| AUTO | Automatic (mode) | Chế độ tự động (tưới/bơm) |
| CI/CD | Continuous Integration / Continuous Deployment | Tích hợp và triển khai liên tục |
| CRA | Create React App | Công cụ khởi tạo dự án React |
| CRUD | Create, Read, Update, Delete | Thêm, đọc, sửa, xóa dữ liệu |
| ESP32 | — | Vi điều khiển Wi-Fi/Bluetooth của Espressif |
| FCM | Firebase Cloud Messaging | Thông báo đẩy của Firebase |
| IoT | Internet of Things | Internet vạn vật |
| JSON | JavaScript Object Notation | Định dạng trao đổi dữ liệu dạng văn bản |
| KK | Không khí | Độ ẩm không khí (trong báo cáo) |
| ML | Machine Learning | Học máy |
| MQTT | Message Queuing Telemetry Transport | Giao thức truyền thông IoT publish/subscribe |
| MVP | Minimum Viable Product | Sản phẩm khả dụng tối thiểu |
| QoS | Quality of Service | Mức chất lượng dịch vụ (MQTT) |
| REST | Representational State Transfer | Kiểu API web phổ biến |
| RTDB | Realtime Database | Cơ sở dữ liệu thời gian thực (Firebase) |
| SPA | Single Page Application | Ứng dụng một trang |
| TLS | Transport Layer Security | Bảo mật tầng vận chuyển |
| UI/UX | User Interface / User Experience | Giao diện / Trải nghiệm người dùng |
| UID | User Identifier | Mã định danh người dùng (Firebase Auth) |
| WebSocket | — | Giao thức kết nối hai chiều trên web |
| WSS | WebSocket Secure | WebSocket có mã hóa TLS |

<div style="page-break-after: always;"></div>

---

## DANH MỤC BẢNG BIỂU

| Ký hiệu | Tên bảng | Trang / Vị trí |
|:-------:|----------|----------------|
| Bảng 3.1 | Danh sách mục tiêu cụ thể và trạng thái hoàn thành | [Mục 3.2](#32-mục-tiêu-cụ-thể) |
| Bảng 4.1 | Công cụ và thư viện liên quan | [Mục 4.3](#43-công-cụ-và-thư-viện-liên-quan) |
| Bảng 5.1 | Điều kiện cảnh báo môi trường | [Mục 5.2.2](#522-cảnh-báo-và-đánh-giá-vườn) |
| Bảng 5.2 | Mã trạng thái tình trạng vườn | [Mục 5.2.2](#522-cảnh-báo-và-đánh-giá-vườn) |
| Bảng 5.3 | Lệnh điều khiển qua MQTT | [Mục 5.2.3](#523-điều-khiển) |
| Bảng 5.4 | Tham số ngưỡng cấu hình cây trồng | [Mục 5.2.4](#524-cấu-hình-cây-trồng) |
| Bảng 5.5 | Yêu cầu phi chức năng và cách đáp ứng | [Mục 5.3](#53-yêu-cầu-phi-chức-năng) |
| Bảng 5.6 | Ánh xạ alias dữ liệu ESP32 | [Mục 5.4](#54-định-dạng-dữ-liệu) |
| Bảng 6.1 | Cấu hình kết nối MQTT (Web và Server) | [Mục 6.4](#64-cấu-hình-mqtt) |
| Bảng 7.1 | Các hàm Firebase Service chính | [Mục 7.2](#72-module-firebase-firebaseservicejs) |
| Bảng 7.2 | Thành phần giao diện Web | [Mục 7.4](#74-giao-diện-người-dùng-web) |
| Bảng 7.3 | Định tuyến (routes) ứng dụng Web | [Mục 7.4](#74-giao-diện-người-dùng-web) |
| Bảng 7.4 | Giá trị preset mặc định theo loại cây | [Mục 7.7](#77-preset-mặc-định-tham-chiếu) |
| Bảng 8.1 | Biến môi trường server | [Mục 8.3](#83-biến-môi-trường-server-env) |
| Bảng 8.2 | Thành phần phần cứng tham chiếu | [Mục 3.1](#84-phần-cứng-tham-chiếu) |
| Bảng 9.1 | Kịch bản kiểm thử | [Mục 9.1](#91-kịch-bản-kiểm-thử) |
| Bảng 9.2 | Kết quả thử nghiệm theo thời gian | [Mục 9.3](#93-bảng-kết-quả-thử-nghiệm) |
| Bảng 9.3 | Thống kê tóm tắt thông số đo | [Mục 9.3](#93-bảng-kết-quả-thử-nghiệm) |
| Bảng 10.1 | So sánh tính năng giữa các nền tảng | [Mục 10.2](#102-so-sánh-các-nền-tảng) |
| Bảng A.1 | Danh sách dependency chính (Web) | [Phụ lục A](#phụ-lục-a--danh-sách-dependency-chính-web) |
| Bảng 0.1 | Kế hoạch thực hiện theo đề cương | [Mục 0.3](#03-kế-hoạch-thực-hiện-đề-cương) |
| Bảng 0.2 | Đối chiếu công nghệ đề cương và triển khai | [Mục 0.2](#02-đối-chiếu-công-nghệ-và-phạm-vi) |

> *Khi xuất Word/PDF, đánh số trang thực tế và cập nhật cột “Trang” trong danh mục.*

<div style="page-break-after: always;"></div>

---

## DANH MỤC HÌNH ẢNH

| Ký hiệu | Tên hình | Trạng thái | Vị trí |
|:-------:|----------|:----------:|--------|
| Hình 2.1 | Use case — Admin / Viewer / ESP32 | *[PlantUML use case]* | [Mục 2.1.1](#211-đối-tượng-sử-dụng-và-phạm-vi-phần-mềm) |
| Hình 2.2 | Kiến trúc phần mềm tổng thể | PlantUML → PNG (`hinh-2-2-kien-truc-phan-mem.puml`) | [Mục 2.2.1](#221-sơ-đồ-kiến-trúc-tổng-thể) |
| Hình 2.4 | Cây dữ liệu Firebase | PlantUML → PNG (`hinh-2-4-cay-firebase.puml`) | [Mục 2.4.1](#241-cấu-trúc-realtime-database) |
| Hình 2.5 | Phân quyền admin/viewer | PlantUML → PNG (`hinh-2-5-phan-quyen.puml`) | [Mục 2.4.2](#242-xác-thực-và-phân-quyền) |
| Hình 2.6 | Luồng dữ liệu realtime | PlantUML → PNG (`hinh-2-6-luong-du-lieu-realtime.puml`) | [Mục 2.5.1](#251-luồng-dữ-liệu-realtime) |
| Hình 2.7 | Luồng đăng nhập | PlantUML → PNG (`hinh-2-7-dang-nhap.puml`) | [Mục 2.5.2](#252-luồng-đăng-nhập-và-phân-quyền) |
| Hình 2.8 | Luồng cảnh báo & bơm | PlantUML → PNG (`hinh-2-8-canh-bao-bom.puml`) | [Mục 2.5.3](#253-luồng-cảnh-báo-và-điều-khiển-bơm) |
| Hình 2.9 | Luồng cấu hình mẫu cây | PlantUML → PNG (`hinh-2-9-preset-cay.puml`) | [Mục 2.5.4](#254-luồng-cấu-hình-mẫu-cây-trồng) |
| Hình 2.10 | Cây thư mục mã nguồn | *[PlantUML package]* | [Mục 2.6.1](#261-cấu-trúc-thư-mục-dự-án) |
| Hình 2.11 | Mockup Dashboard (wireframe) | *[Figma / screenshot]* | [Mục 2.6.3](#263-thiết-kế-giao-diện-người-dùng) |
| Hình 3.1 | Sơ đồ mạch phần cứng | PlantUML → PNG (`hinh-3-1-so-do-mach.puml`) | [Mục 3.1](#31-phần-cứng-và-mô-hình-thực-nghiệm) |
| Hình 3.2 | Mô hình phần cứng thực tế | *[Chụp ảnh]* | [Mục 3.1](#31-phần-cứng-và-mô-hình-thực-nghiệm) |
| Hình 3.3 | Lưu đồ firmware ESP32 | PlantUML → PNG (`hinh-3-3-firmware-activity.puml`) | [Mục 3.2](#32-firmware-esp32-arduino-ide) |
| Hình 3.4 | Serial Monitor / MQTT Explorer | *[Chụp ảnh]* | [Mục 3.2.6](#326-kết-quả-chạy-thử-firmware) |
| Hình 3.5–3.8 | Screenshot Web / Config / Admin / Firebase | *[Chụp màn hình]* | [Mục 3.6.4](#364-ảnh-minh-chứng-phần-mềm) |

<div style="page-break-after: always;"></div>

---

## MỞ ĐẦU

### 1. Lý do chọn đề tài

Trong bối cảnh đô thị hóa và xu hướng **nông nghiệp đô thị**, **vườn gia đình** và **trồng cây trên ban công** ngày càng phổ biến. Tuy nhiên, việc chăm sóc cây vẫn phụ thuộc nhiều vào kinh nghiệm cảm tính: người trồng khó biết chính xác khi nào đất khô, khi nào nhiệt độ hoặc độ ẩm không khí vượt ngưỡng an toàn, và khi nào cần bổ sung nước — dẫn đến **lãng phí nước**, **stress cho cây** hoặc **chết cây** do tưới không đúng lúc.

Song song đó, **Internet of Things (IoT)** và các nền tảng đám mây đã trưởng thành, cho phép thiết bị nhúng giá rẻ như **ESP32** thu thập dữ liệu cảm biến liên tục và truyền về trung tâm qua giao thức nhẹ **MQTT**. Điều này mở ra khả năng xây dựng **hệ thống giám sát từ xa**, **cảnh báo sớm** và **điều khiển actuator** (bơm tưới) trên nhiều thiết bị đầu cuối (điện thoại, trình duyệt, máy tính).

Em chọn đề tài **“Thiết kế và xây dựng hệ thống vườn thông minh”** (đã đăng ký trong đề cương ngày 10/02/2025, mã `5240086`) vì:

1. **Tính thực tiễn cao** — giải quyết nhu cầu cụ thể, có thể triển khai thử nghiệm với chi phí phần cứng thấp.
2. **Tính học thuật** — kết hợp nhiều kiến thức đã học: lập trình web/mobile, mạng (MQTT/WebSocket), cơ sở dữ liệu realtime, bảo mật và phân quyền người dùng.
3. **Khả năng mở rộng** — nền tảng có thể phát triển thêm chế độ AUTO, machine learning, đa thiết bị sau khi hoàn thành đồ án.
4. **Phù hợp năng lực và thời gian đồ án** — tập trung vào phần mềm (dashboard đa nền tảng, đồng bộ cloud) trong khi vẫn chuẩn hóa giao tiếp với phần cứng ESP32.

> **Lưu ý về phần lý thuyết IoT:** *Mở đầu* chỉ nêu **bối cảnh và lý do** chọn đề tài (theo quy định trình bày ĐATN). **Tổng quan Internet of Things (IoT)** — khái niệm, kiến trúc phân lớp, ứng dụng nông nghiệp, ưu nhược điểm — được trình bày **đầy đủ tại Chương 1, mục 1.2**; MQTT/Firebase tại mục 1.3; phần cứng ESP32 tại mục 1.4. Độc giả nên đọc tiếp Chương 1 sau phần Mở đầu và Tóm tắt.

### 2. Nội dung đồ án giải quyết

Đồ án tập trung **thiết kế và hiện thực phần mềm** cho hệ thống vườn thông minh, bao gồm các nội dung chính sau:

| STT | Nội dung cần giải quyết | Sản phẩm / Kết quả |
|:---:|------------------------|-------------------|
| 1 | Thu thập và hiển thị dữ liệu cảm biến theo thời gian thực | Dashboard Web/Mobile với 5 thông số: nhiệt độ, độ ẩm KK, độ ẩm đất, ánh sáng, mực nước |
| 2 | Kết nối thiết bị ESP32 với hệ thống qua MQTT | Chuẩn hóa topic `esp32/sensor`, `esp32/control`, `esp32/config` và payload JSON |
| 3 | Lưu trữ và tra cứu lịch sử theo ngày | Firebase Realtime Database (`latest`, `history/{ngày}`) |
| 4 | Cảnh báo và đánh giá tình trạng vườn | Ngưỡng theo loại cây, trạng thái Tốt / Cần chú ý / Nguy hiểm |
| 5 | Điều khiển bơm và chế độ tự động | Giao diện bật/tắt bơm, AUTO; publish lệnh MQTT |
| 6 | Cấu hình theo preset cây trồng | Preset Rau, Xương rồng, Lan, Cây cảnh; preset tùy chỉnh đồng bộ cloud |
| 7 | Quản lý người dùng và phân quyền | Firebase Authentication; vai trò `admin` / `viewer` |
| 8 | Triển khai đa nền tảng | Web (React), Mobile (Expo), Desktop (Electron), Server bridge (Node.js) |

**Phạm vi không giải quyết trong đồ án:** thiết kế chi tiết mạch in và firmware ESP32 (mô tả tham chiếu); triển khai sản xuất quy mô lớn; mô hình học máy dự đoán tưới (đề xuất hướng phát triển).

### 3. Phương pháp thực hiện

Đồ án áp dụng kết hợp các phương pháp sau:

**a) Phương pháp phân tích — thiết kế hệ thống**

- Khảo sát yêu cầu chức năng và phi chức năng từ bài toán chăm sóc cây.
- Mô hình hóa kiến trúc phân lớp: tầng phần cứng (ESP32) → tầng truyền thông (MQTT broker) → tầng ứng dụng (Web/Mobile/Desktop) → tầng lưu trữ (Firebase).
- Thiết kế giao diện người dùng theo hướng dashboard trực quan, tiếng Việt, dark theme.

**b) Phương pháp phát triển phần mềm lặp — tăng dần (iterative / incremental)**

- Xây dựng phiên bản cốt lõi: kết nối MQTT và hiển thị sensor.
- Mở rộng tuần tự: biểu đồ, lịch sử Firebase, cảnh báo, preset, điều khiển bơm, đăng nhập và admin.
- Tách mã dùng chung (`shared/`) trên web; mobile tái sử dụng logic tương tự.

**c) Phương pháp thử nghiệm — kiểm thử**

- Kiểm thử tích hợp: publish payload mẫu lên broker, quan sát UI và dữ liệu Firebase.
- Kiểm thử chức năng: điều khiển, phân quyền, cảnh báo ngưỡng, reconnect MQTT.
- Ghi nhận kết quả dưới dạng bảng số liệu và ảnh màn hình (mục 9).

**d) Công nghệ và công cụ**

- **MQTT (HiveMQ Cloud)** — truyền dữ liệu realtime, hỗ trợ WebSocket cho trình duyệt.
- **React 19, React Router, Recharts** — ứng dụng web.
- **Expo / React Native** — ứng dụng di động.
- **Electron** — ứng dụng desktop.
- **Node.js, Express, Socket.IO, firebase-admin** — server bridge.
- **Firebase Authentication & Realtime Database** — xác thực và đồng bộ dữ liệu.

### 4. Cấu trúc của đồ án

Đồ án được trình bày theo cấu trúc sau (sau phần mở đầu và các danh mục):

| Chương | Tiêu đề | Nội dung chính |
|:------:|---------|----------------|
| — | Mở đầu | Lý do chọn đề tài, nội dung giải quyết, phương pháp, cấu trúc |
| — | Tóm tắt | Tóm lược mục tiêu, phương pháp, kết quả |
| 1 | Tổng quan hệ thống vườn thông minh | 1.1 Nông nghiệp thông minh & mục tiêu; **1.2 Tổng quan IoT**; 1.3 MQTT/Firebase; 1.4 ESP32 & cảm biến |
| 2 | Thiết kế hệ thống giám sát và điều khiển | Sơ đồ khối, luồng dữ liệu, MQTT, Firebase |
| 3 | Xây dựng và triển khai | Phần cứng, firmware, server, web/mobile/desktop, kiểm thử |
| — | Kết luận và hướng phát triển | Đánh giá và đề xuất |
| — | Tài liệu tham khảo & Phụ lục | Nguồn trích dẫn, mã nguồn, đối chiếu đề cương |

**Luồng đọc đề xuất:** Mở đầu → Tóm tắt → Chương 1 → Chương 2 → Chương 3 → Kết luận.

---

<div style="page-break-after: always;"></div>

## TÓM TẮT

Đồ án **Thiết kế và xây dựng hệ thống vườn thông minh** (sinh viên Vũ Đức Trọng Hiếu, MSSV 5240086, GVHD ThS. Đỗ Văn Đức) xây dựng hệ thống Internet of Things (IoT) giám sát môi trường cây trồng theo thời gian thực. Thiết bị **ESP32** thu thập dữ liệu từ các cảm biến (nhiệt độ, độ ẩm không khí, độ ẩm đất, ánh sáng, mực nước), đẩy lên broker **MQTT** (HiveMQ Cloud). Phần mềm đa nền tảng — **Web** (React), **Mobile** (Expo/React Native), **Desktop** (Electron) — hiển thị dashboard, cảnh báo ngưỡng, điều khiển bơm và đồng bộ lịch sử qua **Firebase Realtime Database**.

**Phương pháp:** Thiết kế theo mô hình publish/subscribe MQTT; client web kết nối broker qua WebSocket (`wss`); server Node.js tùy chọn làm bridge MQTT → Firebase + Socket.IO; chuẩn hóa payload đa định dạng; phân quyền người dùng bằng Firebase Authentication.

**Kết quả chính:** Hoàn thiện dashboard web với đăng nhập, preset cây trồng, cảnh báo môi trường, điều khiển bơm thủ công/chế độ AUTO; ứng dụng mobile và desktop bổ trợ; server ghi nhận lịch sử theo ngày trên Firebase.

**Từ khóa:** IoT, MQTT, ESP32, React, Firebase, Dashboard, Vườn thông minh.

---

## CHƯƠNG 1: TỔNG QUAN HỆ THỐNG VƯỜN THÔNG MINH

### 1.1. Nông nghiệp thông minh, lý do chọn đề tài, mục tiêu và phạm vi

#### 1.1.1. Bối cảnh và vấn đề



Nông nghiệp đô thị và vườn gia đình ngày càng phổ biến, nhưng việc theo dõi độ ẩm đất, nhiệt độ và tưới nước thường phụ thuộc kinh nghiệm thủ công, dễ dẫn đến tưới thiếu hoặc thừa. Công nghệ IoT cho phép thu thập dữ liệu liên tục, điều khiển từ xa và lưu lịch sử để phân tích xu hướng.

#### 1.1.2. Vấn đề cần giải quyết

- Không có giao diện tập trung để xem trạng thái vườn theo thời gian thực.
- Khó lưu trữ và tra cứu dữ liệu cảm biến theo ngày.
- Thiếu cơ chế cảnh báo khi môi trường vượt ngưỡng phù hợp từng loại cây.
- Điều khiển bơm tưới chưa được tích hợp vào cùng một hệ thống giám sát.

#### 1.1.3. Ý nghĩa thực tiễn

- Tiết kiệm nước nhờ tưới theo nhu cầu thực tế của đất.
- Giảm lao động chăm sóc thủ công.
- Tạo nền tảng mở rộng cho tự động hóa (AUTO), machine learning và quy mô lớn hơn.

---



#### 1.1.4. Mục tiêu chính

Xây dựng hệ thống phần mềm giám sát và điều khiển vườn thông minh, kết nối ESP32 qua MQTT, triển khai dashboard đa nền tảng và lưu trữ dữ liệu trên cloud.

#### 1.1.5. Mục tiêu cụ thể

*Bảng 1.1. Danh sách mục tiêu cụ thể và trạng thái hoàn thành*

| STT | Mục tiêu | Trạng thái |
|:---:|----------|:------------:|
| 1 | ESP32 publish dữ liệu cảm biến lên topic `esp32/sensor` | Đã thiết kế giao thức (phần cứng ngoài repo) |
| 2 | Web dashboard realtime + biểu đồ + lịch sử | Hoàn thành |
| 3 | Mobile app (Expo) xem và điều khiển qua MQTT | Hoàn thành |
| 4 | Desktop app (Electron) bọc web | Hoàn thành |
| 5 | Server bridge MQTT → Firebase + Socket.IO | Hoàn thành |
| 6 | Đăng nhập, phân quyền admin/viewer | Hoàn thành (Web) |
| 7 | Preset và ngưỡng theo loại cây | Hoàn thành (Web) |

#### 1.1.6. Phạm vi đồ án

*Phạm vi thống nhất với Đề cương đồ án tốt nghiệp (10/02/2025).*

**Trong phạm vi:**

- Nghiên cứu, thiết kế và xây dựng **hệ thống vườn thông minh** cho mô hình vườn **quy mô nhỏ / hộ gia đình**, phục vụ nghiên cứu và thử nghiệm.
- Giám sát thông số môi trường: **độ ẩm đất**, **ánh sáng**, **nhiệt độ**, **độ ẩm không khí**, **mực nước** theo thời gian thực qua cảm biến và MQTT.
- **Tưới nước tự động** theo ngưỡng và **điều khiển từ xa** qua web/app (bật/tắt bơm, chế độ AUTO).
- **Thu thập, lưu trữ lịch sử** trên Firebase; hỗ trợ theo dõi và **gợi ý thời điểm tưới** qua cảnh báo và preset loại cây.
- Phần mềm: Web (React), Mobile (Expo), Desktop (Electron), Server Node.js.
- Mô tả phần cứng tham chiếu: ESP32, cảm biến, relay, bơm (theo đề cương).

**Ngoài phạm vi (theo đề cương):**

- Mô hình vườn **quy mô lớn**, nông trại công nghiệp.
- Phân tích chuyên sâu hoặc **tối ưu bằng trí tuệ nhân tạo** (chỉ đề xuất hướng phát triển).
- Phụ thuộc vào **một loại cây trồng cố định** — hệ thống dùng preset cấu hình linh hoạt.
- Thiết kế chi tiết mạch in (Proteus/Fritzing) và **mã firmware ESP32** đầy đủ trong repository (mô tả giao thức, triển khai ngoài repo).

---

#### 1.1.7. Lý do chọn đề tài (tóm tắt)

*Nội dung chi tiết xem [Mở đầu — mục 1](#1-lý-do-chọn-đề-tài).*

### 1.2. Tổng quan Internet of Things (IoT)

Phần này trình bày cơ sở lý thuyết về **Internet of Things (IoT)** — nền tảng công nghệ của đồ án — trước khi đi vào giao thức MQTT, Firebase và phần cứng cụ thể ở các mục tiếp theo.

#### 1.2.1. Khái niệm và sự phát triển của IoT

**Internet of Things (IoT)** — *Internet vạn vật* — là mạng lưới các **đối tượng vật lý** (thiết bị, cảm biến, actuator) được gắn chip, phần mềm và khả năng **kết nối mạng**, cho phép thu thập, trao đổi dữ liệu và **điều khiển từ xa** mà không cần con người thao tác trực tiếp trên từng thiết bị. Khác với Internet truyền thống chủ yếu kết nối máy tính và người dùng, IoT mở rộng sang **mọi “vật”** có thể đo lường và tác động: nhiệt độ, độ ẩm, ánh sáng, relay, van, bơm, v.v.

IoT hình thành từ sự kết hợp của:

- **Vi điều khiển giá rẻ, tiêu thụ điện thấp** (ESP32, ESP8266, Arduino, Raspberry Pi).
- **Cảm biến và module truyền thông** ngày càng phổ biến (Wi-Fi, Bluetooth, LoRa).
- **Điện toán đám mây (cloud)** và API mở cho lưu trữ, phân tích dữ liệu lớn.
- **Ứng dụng di động và web** giúp người dùng cuối giám sát mọi lúc, mọi nơi.

Theo hướng ứng dụng, IoT đã được triển khai rộng rãi trong **nhà thông minh (smart home)**, **thành phố thông minh**, **y tế**, **công nghiệp 4.0** và đặc biệt là **nông nghiệp thông minh (smart agriculture)** — lĩnh vực trực tiếp liên quan đến đề tài vườn thông minh của đồ án.

#### 1.2.2. Kiến trúc và mô hình phân lớp

Kiến trúc IoT thường được mô tả theo **ba tầng chức năng** hoặc **bốn tầng** khi tách riêng lớp dữ liệu:

| Tầng | Chức năng | Ví dụ trong đồ án |
|------|-----------|-------------------|
| **Tầng cảm biến / thiết bị (Perception)** | Thu thập tín hiệu vật lý, điều khiển actuator | ESP32, DHT22, cảm biến đất, relay, bơm |
| **Tầng mạng (Network)** | Truyền dữ liệu, định tuyến, bảo mật kết nối | Wi-Fi, MQTT (HiveMQ Cloud), TLS/WebSocket |
| **Tầng xử lý / ứng dụng (Application)** | Hiển thị, cảnh báo, điều khiển, giao diện người dùng | Web React, Mobile Expo, Desktop Electron, Server Node.js |
| **Tầng dữ liệu (Data / Cloud)** | Lưu trữ, đồng bộ, phân quyền, lịch sử | Firebase Realtime Database, Firebase Auth |

*Hình 1.2. Mô hình phân lớp IoT áp dụng cho hệ thống vườn thông minh*

*[CHÈN HÌNH 1.2 — PlantUML layered diagram hoặc infographic 4 tầng: Device / Network / Application / Data — khớp bảng trên; khác Hình 2.2 vì đây là mô hình IoT tổng quát]*

Luồng dữ liệu điển hình trong đồ án:

1. **Thu thập:** ESP32 đọc cảm biến theo chu kỳ (vài giây đến vài chục giây).
2. **Truyền tải:** Gói JSON được **publish** lên broker MQTT (`esp32/sensor`).
3. **Tiêu thụ:** Client Web/Mobile **subscribe** topic, cập nhật dashboard realtime; server (nếu bật) ghi thêm vào Firebase.
4. **Điều khiển ngược:** Người dùng hoặc logic AUTO gửi lệnh qua `esp32/control`; ESP32 **subscribe** và bật/tắt relay bơm.
5. **Lưu trữ & tra cứu:** Firebase lưu `latest`, `history/{ngày}`, `config`, `presets` để xem biểu đồ và cấu hình theo loại cây.

Mô hình **publish/subscribe** của MQTT phù hợp IoT vì thiết bị nhúng không cần biết địa chỉ IP của từng client — chỉ cần kết nối broker, giảm độ phức tạp khi thêm Web, Mobile hoặc server.

#### 1.2.3. Ứng dụng IoT trong nông nghiệp và vườn thông minh

IoT trong nông nghiệp (**Agri-IoT**, **Smart Farming**) nhằm **số hóa môi trường canh tác**: thay cho việc quan sát bằng mắt và kinh nghiệm, hệ thống đo liên tục các chỉ số ảnh hưởng đến sinh trưởng cây trồng.

Các ứng dụng phổ biến:

| Ứng dụng | Mô tả | Liên quan đồ án |
|----------|--------|-----------------|
| Giám sát đất và khí hậu vi | Độ ẩm đất, nhiệt độ, độ ẩm KK, ánh sáng | Có — dashboard realtime |
| Tưới tiêu tự động | Bật bơm khi đất khô hoặc theo lịch | Có — relay + chế độ AUTO |
| Cảnh báo sớm | Thông báo khi vượt ngưỡng | Có — alert trên Web |
| Quản lý mực nước | Tránh cạn hoặc tràn bồ chứa | Có — cảm biến mực nước |
| Phân tích dài hạn | Dự báo, ML, báo cáo nông trại lớn | Ngoài phạm vi (đề xuất mở rộng) |

Với **vườn gia đình / ban công**, IoT mang lại quy mô vừa đủ: chi phí phần cứng thấp, triển khai nhanh, người dùng không chuyên vẫn theo dõi được qua điện thoại. Đồ án hướng tới mô hình này thay vì nông trại công nghiệp quy mô lớn.

#### 1.2.4. Ưu điểm, thách thức và xu hướng

**Ưu điểm chính của IoT (trong bối cảnh đồ án):**

- **Giám sát theo thời gian thực** — phát hiện sớm đất khô, nhiệt cao, thiếu sáng.
- **Điều khiển từ xa** — bật tưới khi đi vắng.
- **Lưu lịch sử** — so sánh ngày, đánh giá hiệu quả chăm sóc.
- **Mở rộng linh hoạt** — thêm client hoặc thiết bị mà không thay đổi toàn bộ kiến trúc.
- **Chi phí đầu tư ban đầu thấp** nhờ board ESP32 và dịch vụ cloud miễn phí/gói nhỏ.

**Thách thức cần lưu ý:**

- **Bảo mật:** MQTT/Firebase cần xác thực, TLS; tránh lộ API key trên client công khai.
- **Độ tin cậy mạng:** Wi-Fi mất kết nối → mất dữ liệu realtime (cần cơ chế reconnect, buffer cục bộ trên ESP32 nếu mở rộng).
- **Nguồn điện và chống nước** cho cảm biến ngoài trời.
- **Hiệu chuẩn cảm biến** — độ ẩm đất analog có sai số theo loại đất.

**Xu hướng:** tích hợp **AI/ML** dự báo tưới, **năng lượng mặt trời** cho node ngoài trời, chuẩn **Matter/Thread**, và nền tảng **low-code IoT**. Đồ án tập trung nền tảng phần mềm ổn định (MQTT + Firebase + đa nền tảng) làm bước đệm cho các hướng trên.

#### 1.2.5. Đặc điểm hệ thống IoT trong đồ án

Hệ thống **Vườn Thông Minh** (`iot-dashboard`) thể hiện mô hình IoT 4 tầng như sau:

| Đặc điểm IoT | Cách hiện thực trong dự án |
|--------------|---------------------------|
| Kết nối liên tục | ESP32 publish định kỳ lên `esp32/sensor`; client subscribe realtime |
| Định danh thiết bị | `DEVICE_ID` (ví dụ `esp32_01`) trên Firebase và MQTT |
| Xử lý phân tán | Thu thập tại vườn (ESP32); hiển thị & lưu trữ trên cloud/app |
| Điều khiển vòng kín | Cảm biến → ngưỡng/preset → cảnh báo hoặc lệnh bơm (`esp32/control`) |
| Đa nền tảng | Cùng luồng dữ liệu MQTT cho Web, Mobile, Desktop |
| Khả năng mở rộng | Thêm thiết bị mới bằng topic/`DEVICE_ID` mới; thêm client không đổi firmware |

Như vậy, mục **1.2** cung cấp khung lý thuyết IoT; các mục **1.3** (MQTT, Firebase) và **1.4** (ESP32, cảm biến) đi sâu vào công nghệ cụ thể phục vụ thiết kế và triển khai ở chương 2, 3.

### 1.3. MQTT và Firebase

#### 1.3.1. Giao thức MQTT

MQTT (Message Queuing Telemetry Transport) là giao thức publish/subscribe nhẹ, phù hợp thiết bị nhúng. ESP32 publish lên topic; client subscribe để nhận dữ liệu realtime. Broker cloud (HiveMQ) hỗ trợ TLS và WebSocket cho trình duyệt.

#### 1.3.2. Firebase Realtime Database và Authentication

- **Realtime Database** — lưu `latest`, `history/{ngày}`, `config`, `presets`.
- **Authentication** — đăng nhập email/password; phân quyền `admin` / `viewer` tại node `roles/{uid}`.

#### 1.3.3. Nền tảng phần mềm và công cụ

- **React 19** — SPA dashboard, routing, state.
- **React Native (Expo)** — ứng dụng di động.
- **Electron** — ứng dụng desktop.
- **Node.js + Express** — server bridge MQTT → Firebase (tùy chọn).

*Bảng 1.2. Công cụ và thư viện liên quan*

| Công nghệ | Vai trò trong dự án |
|-----------|---------------------|
| `mqtt.js` | Client MQTT (WebSocket trên web) |
| `recharts` | Biểu đồ line chart (web) |
| `react-native-chart-kit` | Biểu đồ (mobile) |
| `firebase-admin` | Ghi dữ liệu MQTT → Firebase (server bridge) |
| `express` | HTTP API tùy chọn trên server |

---

### 1.4. ESP32, cảm biến, relay và bơm nước

| Thành phần | Vai trò |
|------------|---------|
| ESP32-WROOM-32 | Vi điều khiển Wi-Fi, publish/subscribe MQTT |
| DHT22 / BME280 | Đo nhiệt độ và độ ẩm không khí |
| Cảm biến độ ẩm đất | Đo độ ẩm đất (ADC) |
| BH1750 / quang trở | Đo cường độ ánh sáng (lux) |
| HC-SR04 / cảm biến mực nước | Đo mực nước bồ chứa (cm) |
| Module relay 5V | Điều khiển bơm tưới |
| Bơm mini / van điện từ | Tưới nước cho vườn |

*Hình 1.1. Sơ đồ khối kết nối phần cứng (tham chiếu)*

*[CHÈN HÌNH 1.1 — Sơ đồ khối/Fritzing: ESP32 trung tâm, các cảm biến, relay, bơm; mũi tên GPIO/Wi-Fi/MQTT]*

![Hình 1.1 — Phần cứng](images/hinh-1-1-phần-cứng.png)

---

## CHƯƠNG 2: PHÂN TÍCH YÊU CẦU VÀ THIẾT KẾ HỆ THỐNG

Chương 1 đã trình bày bối cảnh bài toán, cơ sở lý thuyết IoT, MQTT, Firebase và mô hình phần cứng tham chiếu. **Chương 2** tập trung **phân tích yêu cầu** và **thiết kế hệ thống phần mềm**: kiến trúc ứng dụng, đặc tả giao tiếp MQTT, cấu trúc dữ liệu Firebase, luồng xử lý nghiệp vụ và thiết kế giao diện. Chương **không lặp lại** định nghĩa IoT hay mô tả chi tiết linh kiện phần cứng; phần hiện thực mã nguồn và kiểm thử được trình bày tại **Chương 3**.

> Các dòng *[CHÈN HÌNH …]* trong chương là **gợi ý chèn ảnh vào Word**: ghi rõ **loại sơ đồ/ảnh** và **nội dung cần có**. Sơ đồ kỹ thuật nên vẽ bằng **PlantUML** (plantuml.com) hoặc xuất **PNG từ Mermaid**; giao diện dùng **screenshot** hoặc wireframe.

---

### 2.1. Phân tích yêu cầu hệ thống

#### 2.1.1. Đối tượng sử dụng và phạm vi phần mềm

Hệ thống phần mềm phục vụ mô hình **vườn quy mô nhỏ / hộ gia đình**, kết nối một thiết bị ESP32 (mã `esp32_01`) với dashboard đa nền tảng.

| Vai trò | Quyền hạn chính |
|---------|-----------------|
| **Admin** | Xem dữ liệu; cấu hình ngưỡng và cấu hình mẫu theo loại cây; điều khiển bơm/AUTO; quản lý người dùng |
| **Viewer** | Chỉ xem dữ liệu và biểu đồ; không điều khiển, không sửa cấu hình |
| **Người vận hành** | Sử dụng Web/Mobile/Desktop để theo dõi vườn từ xa |

Phạm vi phần mềm trong chương này: **Web (React)**, **Mobile (Expo)**, **Desktop (Electron)**, **server bridge MQTT → Firebase (tùy chọn)**. Firmware ESP32 và lắp ráp mạch thuộc phạm vi tham chiếu (Chương 1, Chương 3).

*[CHÈN HÌNH 2.1 — PlantUML use case diagram: tác nhân Admin (cấu hình, điều khiển, quản lý user), Viewer (xem), ESP32 (gửi sensor, nhận lệnh); các use case F1–F12 tương ứng Bảng 2.1]*

#### 2.1.2. Yêu cầu chức năng

Các vấn đề tại mục 1.1.2 được chuyển thành yêu cầu chức năng cụ thể như sau.

*Bảng 2.1. Ma trận yêu cầu chức năng*

| STT | Yêu cầu | Mô tả | Thành phần đáp ứng |
|:---:|---------|-------|---------------------|
| F1 | Giám sát realtime | Hiển thị 5 thông số: nhiệt độ, độ ẩm KK, độ ẩm đất, ánh sáng, mực nước | Dashboard Web/Mobile |
| F2 | Lịch sử dữ liệu | Tra cứu theo ngày (`history/{YYYY-MM-DD}`) | Firebase + biểu đồ |
| F3 | Cảnh báo ngưỡng | Thông báo khi vượt ngưỡng theo loại cây | Logic `App.js`, banner UI |
| F4 | Đánh giá vườn | Trạng thái Tốt / Cần chú ý / Nguy hiểm | `garden_status`, UI |
| F5 | Điều khiển bơm | Bật/tắt bơm từ xa | MQTT `esp32/control` |
| F6 | Chế độ AUTO | Bật/tắt tưới tự động theo độ ẩm đất | MQTT + firmware |
| F7 | Cấu hình ngưỡng | Lưu `config`, đồng bộ ESP32 | Firebase + `esp32/config` |
| F8 | Cấu hình mẫu cây | Chọn/lưu mẫu theo loại cây (`presets/`) | `ConfigPage` |
| F9 | Xác thực | Đăng nhập/đăng ký email-password | Firebase Auth |
| F10 | Phân quyền | Admin / viewer | `roles/{uid}` |
| F11 | Đa nền tảng | Web, Mobile, Desktop cùng nguồn dữ liệu | React, Expo, Electron |
| F12 | Đồng bộ cloud (tùy chọn) | Server ghi MQTT → Firebase | `server/server.js` |

#### 2.1.3. Yêu cầu phi chức năng

*Bảng 2.2. Yêu cầu phi chức năng và cách đáp ứng*

| Yêu cầu | Tiêu chí | Cách đáp ứng trong thiết kế |
|---------|----------|------------------------------|
| Hiệu năng / độ trễ | Cập nhật gần realtime | MQTT publish/subscribe; Firebase `onValue` |
| Khả dụng mạng | Tự kết nối lại khi mất MQTT | `reconnectPeriod: 3000` ms (`mqttService.js`) |
| Khả năng mở rộng | Thêm client không đổi firmware | Broker trung gian; `DEVICE_ID` |
| Đa nền tảng | Web + Mobile + Desktop | Kiến trúc tách service dùng chung |
| Giao diện | Dễ đọc, responsive, dark theme | Component tái sử dụng |
| Bảo mật cơ bản | Không truy cập trái phép | MQTT auth; Firebase Auth; role-based UI |
| Bảo trì | Cấu trúc thư mục rõ ràng | `src/shared/services`, `pages`, `components` |

#### 2.1.4. Quy tắc cảnh báo và trạng thái vườn

*Bảng 2.3. Điều kiện cảnh báo môi trường*

| Điều kiện | Thông báo |
|-----------|-----------|
| `do_am_dat < minSoil` | Đất đang khô, cần tưới |
| `nhiet_do > maxTemp` | Nhiệt độ cao |
| `do_am_khong_khi < minAirHum` | Không khí khô |
| `anh_sang > maxLux` | Ánh sáng quá mạnh |
| `muc_nuoc > maxWaterDistance` | Cảnh báo: mực nước thấp |

*Bảng 2.4. Mã trạng thái tình trạng vườn*

| Mã | Nhãn hiển thị |
|----|---------------|
| `TOT` | Tốt |
| `CAN_CHU_Y` | Cần chú ý |
| `NGUY_HIEM` | Nguy hiểm |
| `CHUA_CAU_HINH` | Chưa cấu hình cây trồng |

*[CHÈN HÌNH 2.1b (tùy chọn) — PlantUML state diagram: chuyển trạng thái vườn TOT → CAN_CHU_Y → NGUY_HIEM theo số cảnh báo; hoặc bỏ qua nếu đã đủ Bảng 2.3–2.4]*

---

### 2.2. Thiết kế kiến trúc phần mềm

Kiến trúc Chương 2 mô tả **luồng phần mềm và cloud**, khác với mô hình phân lớp IoT tổng quát tại Chương 1 (mục 1.2).

#### 2.2.1. Sơ đồ kiến trúc tổng thể

*Hình 2.2. Sơ đồ kiến trúc phần mềm hệ thống Vườn Thông Minh*

*[CHÈN HÌNH 2.2 — Xuất PNG từ `docs/diagrams/hinh-2-2-kien-truc-phan-mem.puml` (PlantUML component diagram)]*

**Luồng chính (khuyến nghị):** ESP32 → MQTT → Web/Mobile (subscribe trực tiếp); đồng thời client đọc `latest`, `history`, `config` từ Firebase. **Server bridge** chỉ dùng khi cần ghi lịch sử tập trung mà không phụ thuộc client đang mở.

#### 2.2.2. Vai trò các thành phần phần mềm

*Bảng 2.5. Vai trò thành phần trong kiến trúc phần mềm*

| Thành phần | Công nghệ | Vai trò |
|------------|-----------|---------|
| Web App | React 19, mqtt.js, Recharts | Dashboard, cấu hình, admin; MQTT + Firebase |
| Mobile App | Expo, mqtt.js | Giám sát và điều khiển trên điện thoại |
| Desktop App | Electron | Bao bọc Web, triển khai máy tính |
| MQTT Service | `mqttService.js` | Kết nối broker, publish/subscribe topic |
| Firebase Service | `firebaseService.js` | Auth, RTDB, preset, role |
| Server bridge | Node.js, Express, firebase-admin | (Tùy chọn) MQTT → Firebase |
| Firmware ESP32 | Arduino IDE | Thu thập cảm biến, thực thi lệnh (ngoài repo chính) |

---

### 2.3. Thiết kế giao tiếp MQTT

Phần này đặc tả **giao thức triển khai** giữa ESP32 và ứng dụng; không trình bày lại khái niệm MQTT (xem mục 1.3.1).

#### 2.3.1. Cấu hình kết nối broker

*Bảng 2.6. Cấu hình kết nối MQTT (Web và Server)*

| Thông số | Web (WebSocket) | Server (TCP/TLS) |
|----------|-----------------|------------------|
| Giao thức | `wss://...hivemq.cloud:8884/mqtt` | `mqtts://...hivemq.cloud:8883` |
| Topic sensor | `esp32/sensor` (subscribe) | `esp32/sensor` (subscribe) |
| Topic control | `esp32/control` (publish) | `esp32/control` (publish) |
| Topic config | `esp32/config` (publish) | `esp32/config` (subscribe + ghi FB) |

> **Lưu ý bảo mật:** Thông tin đăng nhập broker trong mã nguồn chỉ phục vụ demo. Khi triển khai thực tế, dùng biến môi trường và không commit secret lên Git.

#### 2.3.2. Topic, payload và lệnh điều khiển

*Bảng 2.7. Lệnh điều khiển qua MQTT (topic `esp32/control`)*

| Lệnh | Chức năng |
|------|-----------|
| `bat_bom` | Bật bơm |
| `tat_bom` | Tắt bơm |
| `auto_on` | Bật chế độ tự động |
| `auto_off` | Tắt chế độ tự động |

*Bảng 2.8. Tham số ngưỡng (topic `esp32/config`)*

| Tham số | Ý nghĩa |
|---------|---------|
| `minSoil` | Độ ẩm đất tối thiểu (%) |
| `targetSoil` | Mức độ ẩm đất mục tiêu (%) |
| `maxTemp` | Nhiệt độ tối đa (°C) |
| `minAirHum` | Độ ẩm KK tối thiểu (%) |
| `maxLux` | Ánh sáng tối đa (lux) |
| `maxWaterDistance` | Khoảng cách mực nước tối đa (cm) |

**Payload mẫu (`esp32/sensor`):**

```json
{
  "nhiet_do": 28.5,
  "do_am_khong_khi": 65,
  "do_am_dat": 42,
  "anh_sang": 1200,
  "muc_nuoc": 15,
  "auto": true,
  "pump": false,
  "config": true,
  "garden_status": "TOT"
}
```

*Bảng 2.9. Ánh xạ alias dữ liệu ESP32*

| Alias | Trường chuẩn |
|-------|---------------|
| `temp` | `nhiet_do` |
| `humi` | `do_am_khong_khi` |
| `soil` | `do_am_dat` |
| `lux` | `anh_sang` |
| `distance` | `muc_nuoc` |

#### 2.3.3. Module MQTT (`mqttService.js`)

- Singleton `MqttService`: `connect()`, `publishControl()`, `publishConfig()`.
- Hàm `normalizeSensorPayload()` chuẩn hóa alias tiếng Anh ↔ tiếng Việt trước khi hiển thị.

---

### 2.4. Thiết kế cơ sở dữ liệu Firebase và phân quyền

#### 2.4.1. Cấu trúc Realtime Database

```
devices/
  esp32_01/
    latest/              # Bản ghi cảm biến mới nhất
    history/
      {YYYY-MM-DD}/
        {timestamp}/     # Lịch sử theo mốc thời gian
    config/              # Ngưỡng đang áp dụng
    presets/
      {key}/             # Cấu hình mẫu theo loại cây (tùy chỉnh)
users/
  {uid}/                 # Hồ sơ người dùng (email, displayName, ...)
roles/
  {uid}/                 # "admin" | "viewer"
```

*Hình 2.4. Cây dữ liệu Firebase Realtime Database*

*[CHÈN HÌNH 2.4 — Xuất PNG từ `docs/diagrams/hinh-2-4-cay-firebase.puml` (WBS / cây thư mục RTDB)]*

#### 2.4.2. Xác thực và phân quyền

Hệ thống sử dụng **Firebase Authentication** để quản lý đăng nhập bằng email và mật khẩu.

Sau khi đăng nhập thành công:

1. Firebase trả về `uid`.
2. Ứng dụng đọc `roles/{uid}` (Realtime Database).
3. Hệ thống xác định quyền **admin** hoặc **viewer**.
4. Giao diện thay đổi theo quyền (`canEdit`, `canControl` trong `App.js`).

**Admin** có quyền: điều khiển bơm; bật/tắt AUTO; cấu hình hệ thống (ngưỡng, preset); quản lý user tại `/admin`.

**Viewer** chỉ xem dữ liệu: `subscribeLatest`, `subscribeHistory`; không gọi `publishControl` / `saveConfig`; ẩn trang quản trị.

*Hình 2.5. Sequence diagram phân quyền Admin / Viewer*

*[CHÈN HÌNH 2.5 — Xuất PNG từ `docs/diagrams/hinh-2-5-phan-quyen.puml`]*

> **Phân biệt với Hình 2.7 (mục 2.5.2):** Hình 2.5 nhấn **nhánh admin/viewer**; Hình 2.7 là **5 bước đăng nhập** gọn cho luồng nghiệp vụ.

#### 2.4.3. API dịch vụ Firebase (`firebaseService.js`)

*Bảng 2.10. Các hàm Firebase Service chính*

| Hàm | Mô tả |
|-----|-------|
| `subscribeLatest` | Lắng nghe `devices/{id}/latest`, cập nhật UI |
| `subscribeHistory(dateKey)` | Lịch sử theo ngày |
| `subscribeConfig` | Đồng bộ ngưỡng `config` |
| `subscribePresets` | Đồng bộ cấu hình mẫu tùy chỉnh |
| `subscribeRole(uid)` | Lấy quyền người dùng |
| `saveConfig` / `savePreset` | Ghi cấu hình và mẫu |
| `signIn` / `signUp` / `signOut` | Xác thực |

---

### 2.5. Luồng dữ liệu và xử lý nghiệp vụ

#### 2.5.1. Luồng dữ liệu realtime

Quá trình xử lý dữ liệu realtime diễn ra theo các bước:

1. ESP32 đọc dữ liệu cảm biến.
2. ESP32 publish dữ liệu lên topic `esp32/sensor`.
3. MQTT Broker chuyển dữ liệu tới các client.
4. Web/Mobile subscribe và cập nhật giao diện realtime.
5. Server bridge (nếu có) ghi dữ liệu lên Firebase (`latest`, `history`).

> Web còn subscribe Firebase `latest` / `history` song song MQTT để vẽ biểu đồ; luồng điều khiển bơm và cấu hình mô tả ở mục 2.5.3–2.5.4.

*Hình 2.6. Sequence diagram luồng dữ liệu realtime*

*[CHÈN HÌNH 2.6 — Xuất PNG từ `docs/diagrams/hinh-2-6-luong-du-lieu-realtime.puml`]*

#### 2.5.2. Luồng đăng nhập và phân quyền

1. Người dùng nhập email và mật khẩu.
2. Ứng dụng gửi yêu cầu xác thực tới Firebase Authentication.
3. Firebase trả về `uid`.
4. Hệ thống đọc `roles/{uid}`.
5. Giao diện hiển thị theo quyền user (admin / viewer).

*Hình 2.7. Sequence diagram đăng nhập*

*[CHÈN HÌNH 2.7 — Xuất PNG từ `docs/diagrams/hinh-2-7-dang-nhap.puml`]*

> Nhánh quyền chi tiết (admin vs viewer) xem **Hình 2.5** (mục 2.4.2). Hình 2.7 tóm tắt **5 bước** theo luồng nghiệp vụ.

#### 2.5.3. Luồng cảnh báo và điều khiển bơm

1. Hệ thống nhận payload cảm biến.
2. So sánh dữ liệu với cấu hình ngưỡng.
3. Sinh danh sách cảnh báo (`alerts`).
4. Xác định trạng thái vườn (`garden_status`).
5. Hiển thị banner cảnh báo.
6. Admin có thể bật/tắt bơm hoặc AUTO (`esp32/control`).

*Hình 2.8. Activity diagram cảnh báo và điều khiển bơm*

*[CHÈN HÌNH 2.8 — Xuất PNG từ `docs/diagrams/hinh-2-8-canh-bao-bom.puml`]*

#### 2.5.4. Luồng cấu hình mẫu cây trồng

1. Người dùng chọn loại cây (preset).
2. Hệ thống nạp cấu hình mẫu lên form.
3. Người dùng chỉnh sửa nếu cần.
4. Cấu hình được lưu lên Firebase (`saveConfig`).
5. Hệ thống publish cấu hình xuống ESP32 (`publishConfig` → `esp32/config`).

*Hình 2.9. Activity diagram preset cây trồng*

*[CHÈN HÌNH 2.9 — Xuất PNG từ `docs/diagrams/hinh-2-9-preset-cay.puml`]*

---

### 2.6. Thiết kế cấu trúc mã nguồn và giao diện

#### 2.6.1. Cấu trúc thư mục dự án

*Hình 2.10. Cây thư mục mã nguồn `iot-dashboard`*

*[CHÈN HÌNH 2.10 — PlantUML package diagram hoặc screenshot cây thư mục VS Code: `src/`, `mobile/`, `desktop/`, `server/` và các file chính như bảng dưới]*

```
iot-dashboard/
├── src/                              # Web (Create React App)
│   ├── App.js                        # Routing, state, logic nghiệp vụ
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   └── AdminPage.jsx
│   └── shared/
│       ├── components/
│       │   ├── DashboardPage.jsx
│       │   ├── ConfigPage.jsx
│       │   ├── SensorCard.jsx
│       │   ├── SensorChart.jsx
│       │   └── ControlButtons.jsx
│       ├── services/
│       │   ├── mqttService.js
│       │   └── firebaseService.js
│       └── utils/
│           └── sensorHistory.js
├── mobile/                           # Expo / React Native
├── desktop/                          # Electron (main.js, preload.js)
├── server/                           # MQTT bridge + Firebase Admin (tùy chọn)
│   ├── server.js
│   └── .env.example
├── public/
├── package.json
└── README.md
```

#### 2.6.2. Logic nghiệp vụ tầng ứng dụng (`App.js`)

- Kết hợp MQTT (trạng thái thiết bị) và Firebase (sensor, history, config, role).
- Tính toán: `alerts`, `gardenStatus`, `needsWatering`, `pumpStatus`, `autoMode`.
- Điều hướng tab **Dashboard** và **Cấu hình cây trồng**; toast cho cảnh báo và thao tác thành công.

#### 2.6.3. Thiết kế giao diện người dùng

Thiết kế tập trung **Web** làm chuẩn; Mobile tái sử dụng luồng tương tự; Desktop nhúng Web.

*Bảng 2.11. Thành phần giao diện Web*

| Component | Chức năng |
|-----------|-----------|
| `SensorCard` | 5 ô metric với icon và màu theo ngưỡng |
| `SensorChart` | Line chart Recharts, bật/tắt từng series |
| `ControlButtons` | AUTO on/off, bật/tắt bơm (admin) |
| `DashboardPage` | Banner cảnh báo, trạng thái vườn, lịch sử |
| `ConfigPage` | Chọn mẫu cây, chỉnh ngưỡng, CRUD cấu hình mẫu |
| `AdminPage` | Bảng user, đổi role |

*Bảng 2.12. Định tuyến (routes) ứng dụng Web*

| Đường dẫn | Trang |
|-----------|-------|
| `/` | Dashboard + Cấu hình (tab) |
| `/dang-nhap` | Đăng nhập |
| `/dang-ky` | Đăng ký |
| `/admin` | Quản trị (chỉ admin) |

*Bảng 2.13. Giá trị cấu hình mẫu mặc định theo loại cây*

| Mẫu cây | minSoil | targetSoil | maxTemp | minAirHum | maxLux |
|---------|:-------:|:----------:|:-------:|:---------:|:------:|
| Rau | 45 | 70 | 32 | 55 | 18000 |
| Xương rồng | 15 | 30 | 38 | 35 | 22000 |
| Lan | 40 | 60 | 30 | 60 | 16000 |
| Cây cảnh | 35 | 55 | 34 | 50 | 18000 |

*Hình 2.11. Thiết kế giao diện Dashboard (wireframe / mockup)*

*[CHÈN HÌNH 2.11 — Wireframe hoặc screenshot nháp: 5 SensorCard, biểu đồ, banner trạng thái vườn, nút AUTO/bơm; có thể dùng ảnh thật Hình 3.2 ở Chương 3 nếu trùng nội dung]*

Ảnh chụp màn hình **đã triển khai** (Dashboard, Cấu hình, Admin, Mobile, Firebase Console) — xem **Hình 3.2–3.7** tại mục 3.6.4.

---

### Kết chương 2

Chương 2 đã phân tích yêu cầu chức năng và phi chức năng, thiết kế kiến trúc phần mềm, đặc tả MQTT, cấu trúc Firebase, các luồng xử lý nghiệp vụ và khung giao diện đa nền tảng. Đây là cơ sở để **Chương 3** trình bày hiện thực mã nguồn, triển khai, kiểm thử và đánh giá kết quả.

---

## CHƯƠNG 3: XÂY DỰNG VÀ TRIỂN KHAI

### 3.1. Phần cứng và mô hình thực nghiệm

#### 3.1.1. Thành phần phần cứng

*Bảng 3.1.1. Thành phần phần cứng tham chiếu*

| Thành phần | Ghi chú |
|------------|---------|
| ESP32-WROOM-32 | Wi-Fi, publish MQTT |
| DHT11 | Nhiệt độ, độ ẩm không khí (GPIO 4) |
| Cảm biến độ ẩm đất | Analog ADC GPIO 34 |
| BH1750 (I2C) | Ánh sáng (lux), SDA/SCL 21/22 |
| HC-SR04 | Mực nước (cm), TRIG 5 / ECHO 18 |
| Công tắc cơ (tùy chọn) | GPIO 14, INPUT_PULLUP |
| Relay 5V + bơm mini | Điều khiển tưới |

*Hình 3.1. Sơ đồ kết nối phần cứng ESP32, cảm biến và relay bơm*

*[CHÈN HÌNH 3.1 — Xuất PNG từ `docs/diagrams/hinh-3-1-so-do-mach.puml` (sơ đồ khối GPIO); hoặc thay bằng Fritzing/Proteus/ảnh thực tế nếu có]*

<!-- Ảnh cũ (nếu có): images/hinh-8-1-so-do-mach.png -->

*Hình 3.2. Mô hình phần cứng thực tế*

*[CHÈN HÌNH 3.2 — Chụp ảnh: breadboard, ESP32 CH340, cảm biến, relay, bơm mini]*

### 3.2. Firmware ESP32 (Arduino IDE)

Firmware nhúng được phát triển bằng **Arduino IDE** cho board **ESP32**, phiên bản **v3.3.3**. Chương trình thực hiện: kết nối Wi‑Fi (WiFiManager), kết nối MQTT qua TLS (HiveMQ Cloud, cổng 8883), đọc cảm biến, điều khiển relay/bơm, lưu cấu hình ngưỡng vào **NVS (Preferences)** và trao đổi dữ liệu với dashboard theo đặc tả Chương 2.

> **Lưu ý bảo mật:** Trong báo cáo in và repository công khai, **không** đưa username/password MQTT hoặc mật khẩu AP WiFiManager. Mã đầy đủ lưu tại `firmware/esp32_smart_garden/` (thông tin đăng nhập được thay bằng placeholder).

#### 3.2.1. Thư viện và công cụ

*Bảng 3.2.1. Thư viện Arduino sử dụng*

| Thư viện | Vai trò |
|----------|---------|
| `WiFi.h` / `WiFiClientSecure` | Kết nối Wi‑Fi và MQTT TLS |
| `PubSubClient` | Giao thức MQTT |
| `DHT sensor library` | Cảm biến DHT11 |
| `BH1750` | Đo cường độ ánh sáng (lux) |
| `ArduinoJson` | Tạo/parse JSON payload |
| `WiFiManager` | Cấu hình Wi‑Fi lần đầu (AP `SMART_GARDEN_SETUP`) |
| `Preferences` | Lưu ngưỡng và chế độ AUTO vào NVS |

#### 3.2.2. Sơ đồ ghim GPIO

*Bảng 3.2.2. Ghim ESP32 và thiết bị ngoại vi*

| GPIO | Thiết bị / Chức năng |
|:----:|----------------------|
| 4 | DHT11 (dữ liệu) |
| 34 | Cảm biến độ ẩm đất (ADC) |
| 27 | Relay bơm (LOW = bật bơm) |
| 14 | Công tắc cơ thủ công (INPUT_PULLUP, tùy chọn) |
| 5 | HC-SR04 Trigger |
| 18 | HC-SR04 Echo |
| 21, 22 | BH1750 SDA / SCL (I2C) |

Hiệu chuẩn độ ẩm đất: `dry = 3500`, `wet = 1500` (map ADC → 0–100%).

#### 3.2.3. Cấu trúc chương trình

| Khối / Hàm | Mô tả |
|------------|--------|
| `setup()` | Khởi tạo chân, DHT, I2C, BH1750; `loadConfigFromNVS()`; `setup_wifi()`; cấu hình MQTT |
| `loop()` | `ensureMqttConnected()`, `client.loop()`; đọc công tắc; `applyPumpLogic()`; mỗi 3 giây đọc cảm biến và `publishSensorData()` |
| `callback()` | Xử lý `esp32/control` (bat_bom, tat_bom, auto_on, auto_off) và `esp32/config` (ngưỡng) |
| `applyPumpLogic()` | AUTO tưới theo `minSoil`/`targetSoil`; an toàn bể cạn và timeout 5 phút |
| `updateGardenStatus()` | Tính `garden_status`: TOT / CAN_CHU_Y / NGUY_HIEM / CHUA_CAU_HINH |
| `publishSensorData()` | Publish JSON lên `esp32/sensor` (buffer MQTT 1024 byte) |

*Hình 3.3. Lưu đồ hoạt động firmware ESP32*

*[CHÈN HÌNH 3.3 — Xuất PNG từ `docs/diagrams/hinh-3-3-firmware-activity.puml`]*

#### 3.2.4. Giao tiếp MQTT (triển khai firmware)

| Topic | Hướng | Nội dung |
|-------|-------|----------|
| `esp32/sensor` | Publish | JSON: `do_am_dat`, `nhiet_do`, `do_am_khong_khi`, `anh_sang`, `muc_nuoc`, `garden_status`, `auto_mode`, `trang_thai_bom`, … + alias `soil`, `temp`, … |
| `esp32/control` | Subscribe | `bat_bom`, `tat_bom`, `auto_on`, `auto_off` |
| `esp32/config` | Subscribe | `minSoil`, `targetSoil`, `maxTemp`, `minAirHum`, `maxLux`, `maxWaterDistance` |
| `esp32/status` | Publish (LWT) | `online` / `offline` |
| `esp32/alert` | Publish | Cảnh báo ví dụ `pump_timeout` |

**Đoạn mã minh họa — publish cảm biến (rút gọn):**

```cpp
doc["do_am_dat"] = soilPercent;
doc["nhiet_do"] = temp;
doc["garden_status"] = gardenStatus;
doc["auto_mode"] = autoMode ? "BAT" : "TAT";
client.publish("esp32/sensor", buffer);
```

**Đoạn mã minh họa — nhận lệnh điều khiển:**

```cpp
if (message == "auto_on") { autoMode = true; suppressAutoPump = false; }
else if (message == "bat_bom") { /* thủ công khi AUTO tắt */ setPump(true); }
else if (message == "tat_bom") { suppressAutoPump = true; setPump(false); }
```

#### 3.2.5. Logic điều khiển bơm và an toàn

1. **Chế độ AUTO:** Khi `do_am_dat < minSoil` → bật bơm; khi `>= targetSoil` → tắt. Sau lệnh `tat_bom` từ web → `suppressAutoPump` chặn AUTO bật lại tạm thời.
2. **Chế độ thủ công:** AUTO tắt → web (`bat_bom`/`tat_bom`) hoặc **công tắc cơ** (GPIO 14) ưu tiên khi AUTO tắt.
3. **An toàn:** Nếu `muc_nuoc > maxWaterDistance` (bể cạn) hoặc bơm chạy quá **5 phút** → tắt bơm, có thể gửi `esp32/alert`.

Logic `garden_status` trên firmware **khớp** với xử lý trên Web (`App.js`) và sơ đồ trạng thái **Hình 2.1b**.

#### 3.2.6. Kết quả chạy thử firmware

- Serial Monitor **115200 baud**: log đọc cảm biến, trạng thái MQTT, lệnh điều khiển.
- Chu kỳ gửi dữ liệu: **3 giây** (`interval = 3000` ms).
*Hình 3.4. Serial Monitor khi ESP32 hoạt động*

*[CHÈN HÌNH 3.4 — Chụp ảnh Serial Monitor 115200 baud hoặc MQTT Explorer (topic esp32/sensor)]*

**Mã nguồn đầy đủ:** xem thư mục `firmware/esp32_smart_garden/esp32_smart_garden.ino` và **Phụ lục G**.

### 3.3. Server Node.js

#### 3.3.1. Yêu cầu môi trường

- Node.js ≥ 18, npm; HiveMQ Cloud; Firebase project `smart-garden-eace0`.
- (Tùy chọn) Service account JSON cho `firebase-admin`.

#### 3.3.2. Biến môi trường server

*Bảng 3.3.1. Biến môi trường server*

| Biến | Mô tả |
|------|-------|
| `MQTT_URL` | URL broker mqtts |
| `MQTT_USERNAME` | Username broker |
| `MQTT_PASSWORD` | Password broker |
| `FIREBASE_DB_URL` | URL Realtime Database |
| `FIREBASE_SERVICE_ACCOUNT` | Đường dẫn file JSON |
| `DEVICE_ID` | Mã thiết bị (`esp32_01`) |
| `PORT` | Cổng server (3001) |

#### 3.3.3. Cài đặt và chạy Server

```bash
cd server
cp .env.example .env
npm install
npm start
```

### 3.4. Ứng dụng Web

#### 3.4.1. Cài đặt và chạy Web

```bash
cd iot-dashboard
npm install
npm start
# http://localhost:3000
```

Chạy web + server: `npm run dev` (web port 3002, server 3001).

Thiết kế giao diện và cấu hình mẫu — xem Bảng 2.11–2.13 tại [mục 2.6.3](#263-thiết-kế-giao-diện-người-dùng). Ảnh chụp màn hình tại mục 3.6.

### 3.5. Ứng dụng Mobile và Desktop

#### 3.5.1. Mobile (Expo)

```bash
cd mobile
npm install
npx expo start
```

#### 3.5.2. Desktop (Electron)

```bash
npm run build
cd desktop
npm install
npm start
```

### 3.6. Kiểm thử, kết quả và đánh giá

#### 3.6.1. Kịch bản kiểm thử

*Bảng 3.6.1. Kịch bản kiểm thử*

| ID | Kịch bản | Cách thực hiện | Kết quả mong đợi |
|----|----------|----------------|------------------|
| TC01 | Kết nối MQTT web | Mở dashboard | Badge “Đã kết nối” |
| TC02 | Nhận sensor | Publish JSON lên `esp32/sensor` | SensorCard cập nhật |
| TC03 | Chuẩn hóa alias | Gửi `temp`, `soil`, `humi` | Hiển thị đúng nhãn VN |
| TC04 | Bật bơm | Admin bấm “Bật bơm” | Publish `bat_bom` |
| TC05 | Khóa điều khiển AUTO | `auto: true` trên payload | Nút bơm disabled |
| TC06 | Cảnh báo đất khô | `do_am_dat < minSoil` | Banner cảnh báo |
| TC07 | Lưu Firebase | Chạy server + publish sensor | Node `latest` và `history` có dữ liệu |
| TC08 | Đăng ký / đăng nhập | Tạo tài khoản mới | Role mặc định `viewer` |
| TC09 | Phân quyền admin | Admin đổi role | Viewer không vào được cấu hình |
| TC10 | Gửi config | Lưu preset → Save | Publish `esp32/config` + Firebase `config` |
| TC11 | Reconnect MQTT | Ngắt mạng tạm thời | Tự reconnect, status cập nhật |
| TC12 | API server | `GET /api/sensor` | JSON `data` khớp lần publish cuối |

#### 3.6.2. Công cụ giả lập ESP32

*[CHÈN HÌNH 3.8 (tùy chọn) — Screenshot MQTT Explorer / HiveMQ Web Client / terminal `mosquitto_pub`: publish thử lên `esp32/sensor`]*

Dùng `mosquitto_pub` hoặc script Node:

```bash
mosquitto_pub -h <broker-host> -p 8883 \
  -u location -P <password> \
  --cafile <path-to-ca> \
  -t esp32/sensor \
  -m '{"nhiet_do":26.1,"do_am_khong_khi":58,"do_am_dat":38,"anh_sang":900,"muc_nuoc":14,"auto":false,"pump":false,"config":true}'
```

#### 3.6.3. Bảng kết quả thử nghiệm

*[Điền sau khi chạy thực nghiệm với ESP32 hoặc dữ liệu giả lập]*

**Thời gian thử nghiệm:** *[Điền: dd/mm/yyyy, hh:mm – hh:mm]*  
**Môi trường:** *[Điền: trong nhà / ban công / lab]*  
**Tần suất gửi ESP32:** *[Điền: ví dụ 5 giây/message]*

*Bảng 3.6.2. Kết quả thử nghiệm theo thời gian*

| Thời gian | Nhiệt độ (°C) | Độ ẩm KK (%) | Độ ẩm đất (%) | Ánh sáng (lux) | Mực nước (cm) | Trạng thái MQTT | Ghi chú |
|----------|:-------------:|:------------:|:-------------:|:--------------:|:-------------:|:---------------:|--------|
| 09:00:01 | 25.3 | 55 | 40 | 800 | 12 | OK | Publish thử |
| 09:00:06 | 25.4 | 54 | 40 | 810 | 12 | OK | |
| 09:00:11 | 25.5 | 54 | 39 | 820 | 11 | OK | |
| … | … | … | … | … | … | … | |

**Thống kê tóm tắt (mẫu — thay bằng số đo thực):**

*Bảng 3.6.3. Thống kê tóm tắt thông số đo*

| Thông số | Min | Max | Trung bình |
|----------|:---:|:---:|:----------:|
| Nhiệt độ | — | — | — |
| Độ ẩm đất | — | — | — |

#### 3.6.4. Ảnh minh chứng phần mềm

*Hình 3.5. Dashboard Web — giám sát realtime*

*[CHÈN HÌNH 3.5 — Chụp màn hình `localhost:3000`: SensorCard, biểu đồ, trạng thái MQTT]*

![Hình 3.5 — Dashboard](images/hinh-9-1-dashboard.png)

*Hình 3.6. Giao diện cấu hình cây trồng*

*[CHÈN HÌNH 3.6 — Chụp màn hình tab Cấu hình: preset, ngưỡng, Lưu]*

![Hình 3.6 — Cấu hình cây](images/hinh-9-2-config.png)

*Hình 3.7. Trang quản trị Admin*

*[CHÈN HÌNH 3.7 — Chụp màn hình `/admin`: bảng user, phân quyền]*

![Hình 3.7 — Admin](images/hinh-9-4-admin.png)

*Hình 3.8. Firebase Realtime Database*

*[CHÈN HÌNH 3.8 — Chụp màn hình Firebase Console: `latest`, `history`, `config`]*

![Hình 3.8 — Firebase](images/hinh-9-6-firebase.png)

> *(Tùy chọn)* Banner cảnh báo: `images/hinh-9-3-alert.png` — Mobile Expo: `images/hinh-9-5-mobile.png`

> *Lưu ảnh vào thư mục `images/` cùng cấp file báo cáo, hoặc chèn trực tiếp khi xuất Word.*  

---



#### 3.6.5. Sản phẩm đạt được

- **Dashboard web** đầy đủ: realtime, biểu đồ, lịch sử theo ngày, cảnh báo, preset cây, điều khiển bơm/AUTO, đăng nhập và phân quyền.
- **Ứng dụng mobile** giám sát và điều khiển qua MQTT, lưu lịch sử cục bộ.
- **Ứng dụng desktop** đóng gói trải nghiệm web.
- **Server bridge** tích hợp MQTT, Firebase, Socket.IO và API REST.
- **Chuẩn hóa dữ liệu** linh hoạt giữa firmware ESP32 và nhiều client.

#### 3.6.6. So sánh các nền tảng

*Bảng 3.6.4. So sánh tính năng giữa các nền tảng*

| Tính năng | Web | Mobile | Desktop |
|-----------|:---:|:------:|:-------:|
| MQTT realtime | ✓ | ✓ | ✓ (qua web) |
| Firebase sync | ✓ | ✗ | ✓ |
| Auth / phân quyền | ✓ | ✗ | ✓ |
| Preset / ngưỡng | ✓ | ✗ | ✓ |
| Biểu đồ | Recharts | chart-kit | Recharts |
| Lịch sử cloud | ✓ | Local only | ✓ |

#### 3.6.7. Đánh giá ưu điểm

- Kiến trúc tách lớp rõ: hardware ↔ MQTT ↔ app ↔ Firebase.
- Mở rộng đa client từ một broker trung tâm.
- UX tiếng Việt, dark theme, phản hồi trạng thái kết nối rõ ràng.
- Preset theo loại cây giúp người dùng không chuyên cấu hình nhanh.

#### 3.6.8. Hạn chế

- Credential MQTT/Firebase hardcode trong repo web — chưa tách hết secret ra môi trường.
- Mobile chưa đồng bộ Firebase và auth như web.
- Firmware ESP32 không nằm trong repository — khó tái hiện end-to-end chỉ từ Git.
- Chưa có bộ test tự động (unit/e2e) trong CI.
- Chưa đo số liệu hiệu năng chính thức (latency P95, throughput).

#### 3.6.9. Hướng cải tiến kỹ thuật

- Dùng `.env` cho toàn bộ client; rotate credential broker.
- Đồng bộ mobile với Firebase Auth và preset.
- OpenAPI cho REST server; Docker Compose triển khai.
- InfluxDB/TimescaleDB cho time-series dài hạn.
- Rule engine hoặc ML gợi ý lịch tưới.

---

## KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN

### Kết luận

Dự án **Vườn Thông Minh** đã hiện thực hóa một hệ thống IoT phần mềm hoàn chỉnh: từ giao thức MQTT, dashboard đa nền tảng, lưu trữ đám mây, đến cảnh báo và điều khiển actuactor (bơm). Hệ thống đáp ứng nhu cầu giám sát realtime, cấu hình theo loại cây và quản lý người dùng cơ bản, phù hợp làm đồ án tốt nghiệp hoặc sản phẩm MVP cho vườn gia đình.

### Hướng phát triển

1. **Phần cứng:** Hoàn thiện firmware ESP32, lọc nhiễu ADC, watchdog reconnect Wi-Fi/MQTT.  
2. **Thông minh hóa:** Lịch tưới theo ML từ lịch sử Firebase.  
3. **Thông báo:** Push notification (FCM) khi `NGUY_HIEM`.  
4. **Vận hành:** CI/CD, monitoring broker, backup Firebase định kỳ.  
5. **Mở rộng:** Nhiều thiết bị (`DEVICE_ID` động), dashboard đa vườn.

---

## TÀI LIỆU THAM KHẢO

1. OASIS. *MQTT Version 5.0*. https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html  
2. HiveMQ. *HiveMQ Cloud Documentation*. https://www.hivemq.com/docs/  
3. Meta. *React Documentation*. https://react.dev/  
4. Expo. *Expo Documentation*. https://docs.expo.dev/  
5. Electron. *Electron Documentation*. https://www.electronjs.org/docs  
6. Google. *Firebase Realtime Database*. https://firebase.google.com/docs/database  
7. Google. *Firebase Authentication*. https://firebase.google.com/docs/auth  
8. Recharts. *Recharts API*. https://recharts.org/  
9. Socket.IO. *Documentation*. https://socket.io/docs/v4/  
10. Espressif. *ESP32 Technical Reference*. https://www.espressif.com/en/products/socs/esp32  

---

## PHỤ LỤC

### Phụ lục A — Danh sách dependency chính (Web)

*Bảng A.1. Danh sách dependency chính (Web)*

| Package | Phiên bản (package.json) | Mục đích |
|---------|--------------------------|----------|
| react | ^19.2.4 | UI framework |
| react-router-dom | ^6.26.2 | Điều hướng |
| mqtt | ^5.15.1 | MQTT over WebSocket |
| firebase | ^10.14.1 | Auth + Realtime DB |
| recharts | ^3.8.1 | Biểu đồ |

### Phụ lục G — Mã nguồn firmware ESP32 (Arduino)

File: `firmware/esp32_smart_garden/esp32_smart_garden.ino` (phiên bản v3.3.3).

Nội dung chính: WiFiManager, MQTT HiveMQ TLS, DHT11, BH1750, độ ẩm đất ADC, HC-SR04, relay GPIO 27, NVS lưu config, publish/subscribe theo Chương 2.

> Khi nộp báo cáo in: có thể đính kèm in toàn bộ file `.ino` ở cuối luận văn; trong bản PDF công khai nên **xóa** dòng `mqtt_user` / `mqtt_pass` thật.

### Phụ lục B — Mã lệnh điều khiển và topic

```
Topic esp32/sensor  → ESP32 → Clients (subscribe)
Topic esp32/control → Clients → ESP32 (publish)
Topic esp32/config  → Clients → ESP32 (publish)
```

### Phụ lục C — Đoạn mã tiêu biểu: chuẩn hóa payload

```javascript
// src/shared/services/mqttService.js (rút gọn)
const normalizeSensorPayload = (data) => {
  const normalized = { ...data };
  if (data.soil !== undefined && normalized.do_am_dat === undefined)
    normalized.do_am_dat = data.soil;
  if (data.temp !== undefined && normalized.nhiet_do === undefined)
    normalized.nhiet_do = data.temp;
  // ...
  return normalized;
};
```

### Phụ lục D — Cấu trúc Firebase mẫu

```json
{
  "devices": {
    "esp32_01": {
      "latest": {
        "nhiet_do": 28.5,
        "do_am_dat": 42,
        "ts": 1716364800000
      },
      "config": {
        "minSoil": 35,
        "targetSoil": 65,
        "updatedAt": 1716364800000
      }
    }
  },
  "roles": {
    "uid_admin_example": "admin",
    "uid_viewer_example": "viewer"
  }
}
```

### Phụ lục E — Checklist hoàn thiện báo cáo Word/PDF

- [x] Điền họ tên, MSSV, GVHD, khoa (từ đề cương `5240086_VuDucTrongHieu_CNTT2_K28.1.1`)
- [ ] Điền ngày hoàn thành báo cáo (trang đầu, Lời cảm ơn)
- [ ] Chèn ảnh sơ đồ phần cứng
- [ ] Chèn ảnh chụp màn hình dashboard, config, admin, mobile
- [ ] Điền bảng kết quả thử nghiệm với số liệu thực
- [ ] Vẽ biểu đồ từ dữ liệu thử nghiệm (Excel / Python)
- [ ] Ký xác nhận (nếu trường yêu cầu)

### Phụ lục F — Đối chiếu với đề cương đã đăng ký

Tổng hợp từ `5240086_VuDucTrongHieu_CNTT2_K28.1.1.docx` (10/02/2025).

#### F.1. Thông tin đề cương

| Hạng mục | Nội dung |
|----------|----------|
| Sinh viên | Vũ Đức Trọng Hiếu — 5240086 — CNTT2 — K28.1 |
| GVHD | ThS. Đỗ Văn Đức |
| Đề tài | Thiết kế và xây dựng hệ thống vườn thông minh |

#### F.2. Đối chiếu công nghệ

*Bảng F.2. Đề cương vs triển khai*

| Hạng mục | Đề cương | Triển khai |
|----------|----------|------------|
| MCU | ESP8266/ESP32 | ESP32 |
| Giao thức | HTTP/MQTT | MQTT (HiveMQ) |
| Backend | Node/PHP | Node.js |
| CSDL | MySQL/Firebase | Firebase RTDB |
| Web | Vue/React | React 19 |
| Mobile | Flutter/RN | Expo (RN) |

#### F.3. Kế hoạch thực hiện

*Bảng F.1. Kế hoạch 01/2025 – 04/2025* — 9 bước từ nghiên cứu lý thuyết đến báo cáo (chi tiết trong bản đề cương).

---

*Báo cáo được biên soạn từ mã nguồn `iot-dashboard` và đề cương `5240086_VuDucTrongHieu_CNTT2_K28.1.1.docx` (Vũ Đức Trọng Hiếu — GVHD ThS. Đỗ Văn Đức — ĐH Giao thông Vận tải). Các dòng **[Điền]** và *[CHÈN HÌNH …]* cần bổ sung khi hoàn thiện Word.*
