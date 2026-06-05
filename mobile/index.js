// Entry point tùy chỉnh — polyfill chạy trước mọi thứ
import { Buffer } from 'buffer';
import process from 'process';

global.Buffer = global.Buffer ?? Buffer;
global.process = global.process ?? process;
if (!global.process.nextTick) {
  global.process.nextTick = setImmediate;
}

// Sau khi polyfill xong mới khởi động Expo app
import 'expo/AppEntry';
