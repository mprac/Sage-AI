module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo auto-adds the reanimated/worklets plugin when the package is installed,
    // so we don't list it manually (avoids reanimated v3-vs-v4 plugin-name mismatches).
    presets: ['babel-preset-expo'],
  };
};
