/** Shim: gifted-charts gọi react-native-linear-gradient, Expo dùng expo-linear-gradient */
const { LinearGradient } = require('expo-linear-gradient');

module.exports = LinearGradient;
module.exports.LinearGradient = LinearGradient;
module.exports.default = LinearGradient;
