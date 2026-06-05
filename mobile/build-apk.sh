#!/bin/bash
# ============================================
# Script build APK cho IoT Dashboard
# Chạy: cd mobile && bash build-apk.sh
# ============================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  IoT Dashboard - Build APK (Android)  ${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Kiểm tra eas-cli
if ! command -v eas &> /dev/null; then
    echo -e "${YELLOW}Đang cài eas-cli...${NC}"
    npm install -g eas-cli
fi

echo -e "${GREEN}✓ EAS CLI: $(eas --version)${NC}"
echo ""

# Đăng nhập Expo
echo -e "${YELLOW}Bước 1: Đăng nhập Expo (tạo tài khoản miễn phí tại https://expo.dev)${NC}"
if eas whoami &> /dev/null; then
    echo -e "${GREEN}✓ Đã đăng nhập: $(eas whoami)${NC}"
else
    echo -e "${YELLOW}Vui lòng đăng nhập:${NC}"
    eas login
fi

echo ""

# Khởi tạo project EAS
echo -e "${YELLOW}Bước 2: Liên kết project với Expo...${NC}"
if ! grep -q '"projectId"' app.json 2>/dev/null || grep -q '"projectId": ""' app.json; then
    eas init --id $(eas project:info --json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null) 2>/dev/null || eas init
fi
echo -e "${GREEN}✓ Project đã được liên kết${NC}"
echo ""

# Build APK
echo -e "${YELLOW}Bước 3: Bắt đầu build APK (preview)...${NC}"
echo -e "${CYAN}Quá trình build sẽ mất khoảng 5-15 phút trên Expo cloud.${NC}"
echo -e "${CYAN}Bạn sẽ nhận được link tải APK khi hoàn thành.${NC}"
echo ""

eas build --platform android --profile preview --non-interactive

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Build hoàn thành!${NC}"
echo -e "${GREEN}  Tải APK tại: https://expo.dev${NC}"
echo -e "${GREEN}========================================${NC}"
