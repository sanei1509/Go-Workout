module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Requerido por react-native-reanimated 4.x. Debe ir al final.
    plugins: ["react-native-worklets/plugin"],
  };
};
