/** Chặn autolink react-native-linear-gradient — dùng expo-linear-gradient thay thế */
module.exports = {
  dependencies: {
    'react-native-linear-gradient': {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};
