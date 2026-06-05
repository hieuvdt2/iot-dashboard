const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Bật Package Exports (package.json "exports" field) để mqtt tự chọn đúng build
// mqtt v5 có: "react-native": "./dist/mqtt.esm.js" — không cần Node.js built-ins
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = [
  'react-native',
  'browser',
  'require',
  'default',
];

// Polyfill các built-ins còn thiếu
config.resolver.alias = {
  ...config.resolver.alias,
  buffer: require.resolve('buffer'),
  process: require.resolve('process/browser'),
  events: require.resolve('events'),
  'react-native-linear-gradient': require.resolve('./shims/react-native-linear-gradient'),
};

// Hỗ trợ .cjs
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

module.exports = config;
