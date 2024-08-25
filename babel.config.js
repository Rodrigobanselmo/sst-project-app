module.exports = function (api) {
    api.cache(true);
    const rootImports = {
        root: ['./src'],
        alias: {
            '@/': './src',
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
    };
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            [require.resolve('babel-plugin-module-resolver'), rootImports],
            'babel-plugin-transform-inline-environment-variables',
            'react-native-reanimated/plugin',
        ],
    };
};
