module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "@babel/plugin-proposal-export-namespace-from",
      "react-native-reanimated/plugin",
      ["@babel/plugin-proposal-decorators", { "legacy": true }],
      [
        "module:react-native-dotenv",
        {
          "envName": "APP_ENV",
          "moduleName": "@env",
          "path": ".env",
          "blocklist": null,
          "allowlist": null,
          "safe": false,
          "allowUndefined": false,
          "verbose": false
        }
      ],
      [
        "module-resolver",
        {
          root: ["./src"],
          alias: {
            "@interfaces": "./src/interfaces",
            "@assets": "./src/assets",
            "@components": "./src/components",
            "@screens": "./src/screens",
            "@libs": "./src/libs",
            "@utils": "./src/utils",
            "@services": "./src/services",
            "@constants": "./src/constants",
            "@hooks": "./src/hooks",
            "@contexts": "./src/contexts",
            "@routes": "./src/routes",
            '@theme': './src/theme',
            '@routes': './src/routes'
          },
        },
      ],
    ],
  };
};
