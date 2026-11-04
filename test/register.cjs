// Node runs the actual app TypeScript, with no Metro bundle, device credentials or .env.
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = resolve(__dirname, '..');
const aliases = { '@interfaces': 'src/interfaces', '@components': 'src/components', '@constants': 'src/constants', '@screens': 'src/screens', '@libs': 'src/libs', '@utils': 'src/utils', '@services': 'src/services', '@hooks': 'src/hooks', '@contexts': 'src/contexts', '@repositories': 'src/repositories', '@routes': 'src/routes' };
const original = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request === '@libs/watermelon') request = resolve(__dirname, 'sync/database-binding.cjs');
  if (request === '@utils/helpers/durableMedia') request = resolve(__dirname, 'sync/os-media-boundary.cjs');
  if (request === '@services/api/sync/getSyncCharacterization') request = resolve(__dirname, 'sync/pull-http-boundary.cjs');
  const prefix = Object.keys(aliases).find((alias) => request.startsWith(alias + '/'));
  if (prefix) request = resolve(root, aliases[prefix], request.slice(prefix.length + 1));
  return original.call(this, request, parent, ...rest);
};
require.extensions['.ts'] = function (module, filename) {
  if (filename.includes('/libs/watermelon/model/')) {
    // Watermelon's @lazy uses the initializer descriptor emitted by Babel's
    // legacy property decorators, as in Metro, not TypeScript's __decorate.
    const { transformSync } = require('@babel/core');
    const result = transformSync(readFileSync(filename, 'utf8'), {
      filename, configFile: false, babelrc: false,
      presets: [require.resolve('@babel/preset-typescript')],
      plugins: [[require.resolve('@babel/plugin-proposal-decorators'), { legacy: true }],
        [require.resolve('@babel/plugin-transform-class-properties'), { loose: true }],
        require.resolve('@babel/plugin-transform-modules-commonjs')],
    });
    module._compile(result.code, filename);
    return;
  }
  const result = ts.transpileModule(readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true, useDefineForClassFields: false, esModuleInterop: true },
  });
  module._compile(result.outputText, filename);
};
