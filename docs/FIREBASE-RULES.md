# Firebase Realtime Database — Rules

## Lỗi `permission_denied at /roles`

Trang **Quản trị** gọi `subscribe` trên **`/roles`** và **`/users`** (cấp cha), không chỉ `roles/{uid}`.

Rules chỉ khai báo `roles/$uid` mà **không có** `.read` ở `roles/` → Firebase chặn đọc cả cây → `permission_denied`.

**Thêm 2 dòng** (giữ nguyên logic `$uid` của bạn):

```json
"roles": {
  ".read": "auth != null",
  "$uid": { ... }
},
"users": {
  ".read": "auth != null && root.child('roles').child(auth.uid).val() === 'admin'",
  "$uid": { ... }
}
```

## Cách sửa (bắt buộc trên Console)

1. Mở [Realtime Database → Rules](https://console.firebase.google.com/project/smart-garden-eace0/database/smart-garden-eace0-default-rtdb/rules)
2. Copy toàn bộ nội dung file `database.rules.json` ở thư mục gốc repo
3. Bấm **Publish**
4. Đăng xuất web → đăng nhập lại → vào **Quản trị**

## Admin đầu tiên (nếu chưa vào được trang Quản trị)

1. [Authentication → Users](https://console.firebase.google.com/project/smart-garden-eace0/authentication/users) — copy **UID**
2. [Database → Data](https://console.firebase.google.com/project/smart-garden-eace0/database/smart-garden-eace0-default-rtdb/data):
   - Thêm `roles` → `{uid}` → giá trị **`"admin"`** (kiểu chuỗi)
3. Đăng nhập lại

## Tóm tắt quyền (bản mới)

| Nhánh | Ai được đọc | Ai được ghi |
|-------|-------------|-------------|
| `roles/` | Mọi user đã đăng nhập | Chỉ admin |
| `users/` | Admin (+ user đọc hồ sơ của mình) | Admin + user sửa hồ sơ mình |
| `devices/` | User đã đăng nhập | Admin (config/presets), sensor ghi history |
