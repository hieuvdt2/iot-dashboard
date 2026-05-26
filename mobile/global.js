// Polyfill toàn cục cho React Native — import file này đầu tiên trong App.js
import { Buffer } from 'buffer';
import process from 'process';

global.Buffer = Buffer;
global.process = process;

// process.nextTick không có trong RN — dùng setImmediate thay thế
if (!global.process.nextTick) {
  global.process.nextTick = setImmediate;
}
