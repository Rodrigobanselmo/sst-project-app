module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo', 'module:metro-react-native-babel-preset'],
        plugins: [
            'inline-dotenv',
            '@babel/plugin-proposal-export-namespace-from',
            ['@babel/plugin-proposal-decorators', { legacy: true }],
            [
                'module:react-native-dotenv',
                {
                    envName: 'APP_ENV',
                    moduleName: '@env',
                    path: '.env',
                    blocklist: null,
                    allowlist: null,
                    safe: false,
                    allowUndefined: false,
                    verbose: false,
                },
            ],
            [
                'module-resolver',
                {
                    root: ['./src'],
                    alias: {
                        '@interfaces': './src/interfaces',
                        '@assets': './src/assets',
                        '@components': './src/components',
                        '@screens': './src/screens',
                        '@libs': './src/libs',
                        '@utils': './src/utils',
                        '@services': './src/services',
                        '@constants': './src/constants',
                        '@hooks': './src/hooks',
                        '@repositories': './src/repositories',
                        '@contexts': './src/contexts',
                        '@theme': './src/theme',
                        '@routes': './src/routes',
                    },
                },
            ],
            'react-native-reanimated/plugin',
        ],
    };
};
