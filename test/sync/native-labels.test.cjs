require('../register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { addDotsText } = require('../../src/utils/helpers/addDotsText.ts');

test('company/workspace cards accept missing optional API labels without crashing the native picker', () => {
  for (const text of [null, undefined, '']) assert.equal(addDotsText({ text, maxLength: 25 }), '');
  assert.equal(addDotsText({ text: 'Unidade Centro', maxLength: 25 }), 'Unidade Centro');
  assert.equal(addDotsText({ text: 'Empresa com nome maior que o espaço do cartão', maxLength: 7 }), 'Empresa...');
});
