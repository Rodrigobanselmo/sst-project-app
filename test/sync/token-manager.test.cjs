require('../register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios').default;
const { AxiosError, AxiosHeaders } = require('axios');
const { installTokenManager, apiError } = require('../../src/services/token-manager.ts');
function failure(config, status = 401, data = { message: 'Unauthorized' }) {
  return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, {}, { data, status, statusText: String(status), headers: {}, config });
}
function setup(t, adapter, refreshAdapter, extras = {}) {
  const api = axios.create({ baseURL: 'http://offline-test.invalid', adapter });
  const refreshClient = axios.create({ baseURL: 'http://offline-test.invalid', adapter: refreshAdapter });
  let tokens = { token: 'old-token', refresh_token: 'old-refresh' }, actor = '11', signsOut = 0, saves = 0;
  api.defaults.headers.common.Authorization = 'Bearer old-token';
  const dispose = installTokenManager(api, {
    refreshClient, refreshPath: '/refresh', getTokens: async () => ({ ...tokens }),
    saveTokens: async (next) => { saves++; tokens = next; }, getActor: async () => actor,
    signOut: async () => { signsOut++; },
    ...extras,
  });
  t.after(dispose);
  return { api, state: () => ({ tokens, actor, signsOut, saves }), setActor: (value) => { actor = value; }, dispose };
}
const success = (config, data = { ok: true }) => ({ status: 200, statusText: 'OK', data, config, headers: {} });

test('refresh replays the same FormData and idempotency headers without parsing or rebuilding it', async (t) => {
  const form = new FormData(); form.append('operationId', 'synthetic-operation'); form.append('file', new Blob(['synthetic-image'], { type: 'image/jpeg' }), 'visit.jpg');
  const seen = [];
  const f = setup(t, async (config) => {
    seen.push({ data: config.data, operation: AxiosHeaders.from(config.headers).get('x-sst-operation-id') });
    if (AxiosHeaders.from(config.headers).get('Authorization') === 'Bearer old-token') throw failure(config);
    return success(config);
  }, async (config) => success(config, { token: 'renewed-token', refresh_token: 'renewed-refresh' }));
  const response = await f.api.post('/mobile-sync/media', form, { headers: { 'x-sst-operation-id': 'stable-operation-id', 'content-type': 'multipart/form-data' } });
  assert.equal(response.status, 200); assert.equal(seen.length, 2);
  assert.strictEqual(seen[0].data, form); assert.strictEqual(seen[1].data, form);
  assert.deepEqual(seen.map((entry) => entry.operation), ['stable-operation-id', 'stable-operation-id']);
  assert.equal(f.state().signsOut, 0); assert.equal(f.state().saves, 1);
});

test('coalesces concurrent expired-token responses into one refresh and replays both JSON requests intact', async (t) => {
  let refreshCalls = 0;
  const seen = [];
  const f = setup(t, async (config) => {
    seen.push({ url: config.url, data: config.data, auth: AxiosHeaders.from(config.headers).get('Authorization') });
    if (AxiosHeaders.from(config.headers).get('Authorization') === 'Bearer old-token') throw failure(config);
    return success(config);
  }, async (config) => { refreshCalls++; await new Promise((resolve) => setTimeout(resolve, 10)); return success(config, { token: 'new-token', refresh_token: 'new-refresh' }); });
  await Promise.all([f.api.post('/operations', { operationId: 'one', payload: { probability: 3 } }), f.api.post('/operations', { operationId: 'two', payload: { probability: 4 } })]);
  assert.equal(refreshCalls, 1); assert.equal(f.state().saves, 1);
  for (const id of ['one', 'two']) {
    const versions = seen.filter((item) => JSON.parse(item.data).operationId === id);
    assert.equal(versions.length, 2); assert.equal(versions[0].data, versions[1].data);
  }
});

test('a network failure while refreshing preserves credentials and makes the operation retryable', async (t) => {
  const f = setup(t, async (config) => { throw failure(config); }, async (config) => { throw new AxiosError('Network unavailable', 'ECONNRESET', config); });
  await assert.rejects(f.api.post('/operations', { operationId: 'visit' }), (error) => {
    assert.equal(error.code, 'AUTH_REFRESH_UNAVAILABLE'); assert.equal(error.retryable, true); return true;
  });
  assert.equal(f.state().signsOut, 0); assert.equal(f.state().saves, 0);
  assert.equal(f.state().tokens.refresh_token, 'old-refresh');
});

test('an actually rejected refresh asks for login without replaying the visit under another session', async (t) => {
  let sends = 0;
  const f = setup(t, async (config) => { sends++; throw failure(config); }, async (config) => { throw failure(config, 403); });
  await assert.rejects(f.api.post('/operations', { operationId: 'visit' }), (error) => error.code === 'AUTH_EXPIRED' && error.status === 401 && error.retryable === false);
  assert.equal(sends, 1); assert.equal(f.state().signsOut, 1); assert.equal(f.state().saves, 0);
});

test('does not persist refreshed credentials or replay when the active user changes during refresh', async (t) => {
  let started, release;
  const start = new Promise((resolve) => { started = resolve; });
  const wait = new Promise((resolve) => { release = resolve; });
  let sends = 0;
  const f = setup(t, async (config) => { sends++; throw failure(config); }, async (config) => { started(); await wait; return success(config, { token: 'new-token', refresh_token: 'new-refresh' }); });
  const pending = f.api.post('/operations', { operationId: 'visit' });
  const rejected = assert.rejects(pending, (error) => error.code === 'AUTH_SESSION_CHANGED');
  await start; f.setActor('22'); release(); await rejected;
  assert.equal(sends, 1); assert.equal(f.state().saves, 0); assert.equal(f.state().signsOut, 0);
});

test('a second unauthorized response after refresh terminates replay instead of looping forever', async (t) => {
  let sends = 0, refreshCalls = 0;
  const f = setup(t, async (config) => { sends++; throw failure(config); }, async (config) => { refreshCalls++; return success(config, { token: 'new-token', refresh_token: 'new-refresh' }); });
  await assert.rejects(f.api.post('/operations', { operationId: 'visit' }), (error) => error.code === 'AUTH_EXPIRED');
  assert.equal(sends, 2); assert.equal(refreshCalls, 1); assert.equal(f.state().signsOut, 1);
});

test('preserves structured validation and eSocial conflict information for per-item review', () => {
  const details = { code: 'SST_DECISION_REQUIRED', message: 'Informe a vigência', expectedHead: 'a'.repeat(64) };
  const parsed = apiError({ response: { status: 409, data: details } });
  assert.equal(parsed.code, details.code); assert.equal(parsed.status, 409); assert.equal(parsed.retryable, false);
  assert.deepEqual(parsed.details, details);
  assert.equal(apiError({ message: 'timeout', code: 'ETIMEDOUT' }).retryable, true);
});

test('keeps the selected company when refreshing instead of switching to a default company', async (t) => {
  let refreshBody;
  const f = setup(t, async (config) => {
    if (AxiosHeaders.from(config.headers).get('Authorization') === 'Bearer old-token') throw failure(config);
    return success(config);
  }, async (config) => { refreshBody = JSON.parse(config.data); return success(config, { token: 'renewed-token', refresh_token: 'renewed-refresh' }); }, {
    getRefreshContext: async () => ({ companyId: 'selected-company' }),
  });
  await f.api.post('/operations', { operationId: 'visit' });
  assert.equal(refreshBody.companyId, 'selected-company');
  assert.equal(refreshBody.isApp, true); assert.equal(refreshBody.refresh_token, 'old-refresh');
});
