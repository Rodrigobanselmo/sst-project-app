require('../register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { spawn } = require('node:child_process');
const { SyncJournal, canonical, archivedMedia } = require('../../src/libs/sync/journal.ts');
const { runSync } = require('../../src/libs/sync/engine.ts');
const { SqliteStorage } = require('./sqlite-storage.cjs');
const context = () => ({ userId: 11, companyId: randomUUID(), workspaceId: randomUUID(), deviceId: randomUUID() });
const clock = () => '2026-10-23T12:00:00.000Z';
const draft = (entityId = randomUUID(), payload = { description: 'Coleta offline', probability: 3 }, extra = {}) => ({ kind: 'RISK_DATA', entityId, payload, ...extra });
const ack = (operation, extra = {}) => ({ operationId: operation.operationId, kind: operation.kind, entityId: operation.entityId, state: 'APPLIED', receivedAt: clock(), appliedAt: clock(), retryable: false, result: { id: operation.entityId }, ...extra });
const applyClient = (send, extra = {}) => ({
  send: async (operations, context, options) => options?.deferApplication
    ? { receipts: operations.map((operation) => ack(operation, { state: 'RECEIVED', appliedAt: undefined, retryable: true, result: undefined })) }
    : send(operations, context), ...extra,
});
function fixture(t, customContext = context()) {
  const directory = mkdtempSync(join(tmpdir(), 'simplesst-mobile-sync-'));
  let storage = new SqliteStorage(join(directory, 'visit.sqlite'));
  t.after(() => { storage.close(); rmSync(directory, { recursive: true, force: true }); });
  const journal = () => new SyncJournal(storage, customContext, { id: randomUUID, now: clock });
  return { directory, context: customContext, journal, storage: () => storage, reopen: () => { storage.close(); storage = new SqliteStorage(join(directory, 'visit.sqlite')); return journal(); } };
}

test('archives removed media only after durable backup and the matching deletion acknowledgement', async (t) => {
  const f = fixture(t), journal = f.journal();
  const [media] = await journal.capture([{ kind: 'PHOTO', entityId: 'removed-photo', payload: { uri: 'file:///preserved/original.jpg' } }]);
  const [deletion] = await journal.capture([{ kind: 'PHOTO_DELETE', entityId: 'removed-photo', payload: { characterizationId: 'parent' } }]);
  const removed = ack(media.operation, { state: 'NEEDS_REVIEW', durable: false, appliedAt: undefined, error: { code: 'MOBILE_REMOVED_IN_VISIT', message: 'Removida na visita' } });
  await journal.updateReceipt(removed);
  await journal.updateReceipt(ack(deletion.operation));
  let entries = (await journal.read()).entries;
  assert.equal(archivedMedia(entries[0], entries), false, 'a metadata acknowledgement cannot hide bytes that were never backed up');
  await journal.updateReceipt({ ...removed, durable: true });
  entries = (await journal.read()).entries;
  assert.equal(archivedMedia(entries[0], entries), true);
  assert.equal(archivedMedia(entries[0], [{ ...entries[1], receipt: { ...entries[1].receipt, state: 'RECEIVED' } }]), false, 'a pending deletion cannot hide a media problem');
  assert.equal(archivedMedia(entries[0], [{ ...entries[1], operation: { ...entries[1].operation, entityId: 'another-photo' } }]), false);
  const summary = await runSync(journal, { send: async () => { throw new Error('Deletion is already applied'); }, upload: async () => { throw new Error('Archived original must not be resurrected'); } });
  assert.equal(summary.review, 0); assert.equal(summary.mediaPending, 0);
  assert.equal((await f.reopen().read()).entries[0].operation.payload.uri, 'file:///preserved/original.jpg');
});

test('captures immutable payloads and reuses the same operation for repeated taps/key ordering', async (t) => {
  const f = fixture(t), journal = f.journal();
  const payload = { probability: 3, notes: ['químico', 'físico'], nested: { b: 2, a: 1 } };
  const [first] = await journal.capture([draft('risk-stable', payload)]);
  payload.notes.push('mutation-after-save'); payload.nested.a = 900;
  const [second] = await journal.capture([draft('risk-stable', { nested: { a: 1, b: 2 }, notes: ['químico', 'físico'], probability: 3 })]);
  assert.equal(first.operation.operationId, second.operation.operationId);
  assert.equal((await journal.read()).entries.length, 1);
  assert.deepEqual(second.operation.payload.notes, ['químico', 'físico']);
  assert.equal(canonical({ b: undefined, a: 0 }), '{"a":0}');
});

test('serializes concurrent saves without dropping any collected item', async (t) => {
  const f = fixture(t), journal = f.journal();
  await Promise.all(Array.from({ length: 30 }, (_, index) => journal.capture([draft(`risk-${index}`, { probability: index % 5 })])));
  const saved = await f.reopen().read();
  assert.equal(saved.entries.length, 30);
  assert.equal(new Set(saved.entries.map((item) => item.operation.operationId)).size, 30);
});

test('survives an ungraceful process death immediately after saving the visit to SQLite', async (t) => {
  const f = fixture(t);
  const child = spawn(process.execPath, [join(__dirname, 'journal-process.cjs'), join(f.directory, 'visit.sqlite'), JSON.stringify(f.context)], { stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '', errors = '';
  child.stderr.on('data', (data) => { errors += data; });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('No durable checkpoint: ' + errors)); }, 10000);
    child.stdout.on('data', (data) => { output += data; if (output.includes('DURABLE')) { clearTimeout(timeout); resolve(); } });
    child.once('exit', (code) => { clearTimeout(timeout); if (!output.includes('DURABLE')) reject(new Error(`child exited ${code}: ${errors}`)); });
  });
  child.kill('SIGKILL');
  await new Promise((resolve) => child.once('exit', resolve));
  const saved = await f.reopen().read();
  assert.equal(saved.entries.length, 1);
  assert.equal(saved.entries[0].receipt.state, 'PENDING');
  assert.deepEqual(saved.entries[0].operation.payload.notes, ['offline', 'visita']);
});

test('retries the exact immutable operation when the server applies it but the response disappears', async (t) => {
  const f = fixture(t), journal = f.journal();
  await journal.capture([draft('uncertain')]);
  const received = new Map(); let effects = 0, first = true;
  const client = applyClient(async ([operation]) => {
    if (!received.has(operation.operationId)) { effects += 1; received.set(operation.operationId, ack(operation)); }
    if (first) { first = false; throw new Error('Response disappeared after commit'); }
    return { receipts: [received.get(operation.operationId)] };
  });
  const failed = await runSync(journal, client, { maxAttempts: 1 });
  assert.equal(failed.received, 1, 'the original intake receipt survives a later lost application response');
  assert.equal(failed.pending, 0);
  const reopened = f.reopen();
  assert.equal((await runSync(reopened, client)).applied, 1);
  assert.equal(effects, 1);
  assert.equal((await reopened.read()).entries[0].attempts, 3);
});

test('recovers a lost receipt from the server without resending an already applied operation', async (t) => {
  const f = fixture(t), journal = f.journal();
  const [entry] = await journal.capture([draft('receipt-recovery')]);
  const summary = await runSync(journal, { receipts: async () => ({ operations: [ack(entry.operation)] }), send: async () => { throw new Error('Must not resend'); } });
  assert.equal(summary.applied, 1);
  assert.equal((await journal.read()).entries[0].attempts, 0);
});

test('continues independent items after network, validation and dependency failures', async (t) => {
  const f = fixture(t), journal = f.journal();
  await journal.capture([draft('network'), draft('invalid'), draft('dependent'), draft('valid')]);
  const calls = [];
  const result = await runSync(journal, applyClient(async ([operation]) => {
    calls.push(operation.entityId);
    if (operation.entityId === 'network') throw new Error('Connection lost');
    if (operation.entityId === 'invalid') return { receipts: [ack(operation, { state: 'NEEDS_REVIEW', appliedAt: undefined, error: { code: 'VALIDATION_FAILED', message: 'Needs review' } })] };
    if (operation.entityId === 'dependent') return { receipts: [ack(operation, { state: 'WAITING_DEPENDENCY', appliedAt: undefined, retryable: true })] };
    return { receipts: [ack(operation)] };
  }), { maxAttempts: 1 });
  assert.deepEqual(calls, ['network', 'invalid', 'dependent', 'valid']);
  assert.equal(result.applied, 1); assert.equal(result.review, 1); assert.equal(result.pending, 0); assert.equal(result.received, 3);
  assert.equal((await f.reopen().read()).entries.length, 4);
});

test('preserves a new edit made while an earlier revision is being uploaded', async (t) => {
  const f = fixture(t), journal = f.journal();
  const [before] = await journal.capture([draft('concurrent-edit', { probability: 2 })]);
  let release, started;
  const hold = new Promise((resolve) => { release = resolve; });
  const invoked = new Promise((resolve) => { started = resolve; });
  const running = runSync(journal, applyClient(async ([operation]) => { started(); await hold; return { receipts: [ack(operation)] }; }));
  await invoked;
  const [after] = await journal.capture([draft('concurrent-edit', { probability: 4 })]);
  assert.notEqual(after.operation.operationId, before.operation.operationId);
  release(); await running;
  const entries = (await f.reopen().read()).entries;
  assert.equal(entries[0].receipt.state, 'APPLIED');
  assert.equal(entries[0].operation.payload.probability, 2);
  assert.equal(entries[1].receipt.state, 'PENDING');
  assert.equal(entries[1].operation.payload.probability, 4);
  assert.equal((await f.journal().summary()).pending, 1);
});

test('coalesces simultaneous synchronize taps and preserves per-item progress', async (t) => {
  const f = fixture(t), journal = f.journal();
  await journal.capture([draft('one'), draft('two')]);
  const calls = [], progress = [];
  const client = applyClient(async ([operation]) => { calls.push(operation.operationId); await new Promise((resolve) => setTimeout(resolve, 5)); return { receipts: [ack(operation)] }; });
  const [a, b] = await Promise.all([runSync(journal, client, { onProgress: (summary) => progress.push(summary.applied) }), runSync(f.journal(), client)]);
  assert.equal(calls.length, 2); assert.equal(new Set(calls).size, 2);
  assert.equal(a.applied, 2); assert.equal(b.applied, 2); assert.deepEqual(progress, [0, 1, 2]);
});

test('does not retry authentication errors in a storm or discard the pending visit', async (t) => {
  const f = fixture(t), journal = f.journal();
  await journal.capture([draft('expired-auth'), draft('independent')]);
  let calls = 0;
  const result = await runSync(journal, { send: async () => { calls++; throw Object.assign(new Error('Sign in required'), { status: 401 }); } });
  assert.ok(calls <= 3, 'one bounded intake and one application attempt per item, without refresh loops'); assert.equal(result.pending, 2);
  assert.equal((await f.reopen().read()).entries.length, 2);
});

test('continues text/risk uploads when a photo is missing and retries media with its stable identifier', async (t) => {
  const f = fixture(t), journal = f.journal();
  const [photo] = await journal.capture([draft('photo-stable', { uri: 'file:///synthetic/visit.jpg' }, { kind: 'PHOTO' })]);
  await journal.capture([draft('risk-after-photo')]);
  const uploaded = [];
  const first = await runSync(journal, { upload: async (operation) => { uploaded.push(operation.operationId); throw Object.assign(new Error('File temporarily unavailable'), { status: 404 }); }, send: async ([operation]) => ({ receipts: [ack(operation)] }) });
  assert.equal(first.applied, 1); assert.equal(first.mediaPending, 1);
  await runSync(f.reopen(), { upload: async (operation) => { uploaded.push(operation.operationId); return ack(operation); }, send: async () => { throw new Error('Applied risk must not resend'); } });
  assert.deepEqual(uploaded, [photo.operation.operationId, photo.operation.operationId]);
  assert.equal((await f.journal().summary()).mediaPending, 0);
});

test('ignores absent, foreign and malformed acknowledgements instead of marking data applied', async (t) => {
  const f = fixture(t), journal = f.journal();
  await journal.capture([draft('wrong-ack'), draft('no-ack')]);
  await runSync(journal, { send: async ([operation]) => ({ receipts: operation.entityId === 'wrong-ack' ? [ack(operation, { entityId: 'different-entity' })] : [] }) }, { maxAttempts: 1 });
  const saved = await journal.read();
  assert.ok(saved.entries.every((entry) => entry.receipt.state === 'RETRY'));
  assert.ok(saved.entries.every((entry) => !entry.receipt.receivedAt));
});

test('an applied receipt cannot be downgraded by an older failure or response', async (t) => {
  const f = fixture(t), journal = f.journal();
  const [entry] = await journal.capture([draft('monotonic-ack')]);
  await journal.updateReceipt(ack(entry.operation));
  await journal.updateReceipt(ack(entry.operation, { state: 'RETRY', appliedAt: undefined }));
  await journal.fail(entry.operation.operationId, new Error('Late timeout'));
  assert.equal((await f.reopen().read()).entries[0].receipt.state, 'APPLIED');
});

test('cancel stops future requests while retaining every unsent item and original payload', async (t) => {
  const f = fixture(t), journal = f.journal();
  await journal.capture([draft('sent'), draft('after-cancel')]);
  let cancelled = false, calls = 0;
  await runSync(journal, applyClient(async ([operation]) => { calls++; cancelled = true; return { receipts: [ack(operation)] }; }), { shouldCancel: () => cancelled });
  assert.equal(calls, 1); assert.equal((await f.reopen().read()).entries[1].receipt.state, 'RECEIVED');
});

test('keeps a corrupt diary unchanged and exports complete original operations without auth tokens', async (t) => {
  const f = fixture(t), journal = f.journal();
  await journal.capture([draft('export', { nested: { measurement: 85, epi: false } })]);
  const exported = JSON.parse(await journal.export());
  assert.equal(exported.entries[0].operation.payload.nested.measurement, 85);
  assert.equal(exported.entries[0].operation.payload.nested.epi, false);
  assert.equal('token' in exported, false);
  await f.storage().setItem(journal.key, '{broken-json');
  await assert.rejects(journal.capture([draft('new')]), /JSON|Unexpected|property/i);
  assert.equal(await f.storage().getItem(journal.key), '{broken-json');
});

test('backs up every JSON chunk before the first potentially slow domain application', async (t) => {
  const f = fixture(t), journal = f.journal();
  await journal.capture(Array.from({ length: 61 }, (_, index) => draft(`visit-item-${index}`, { probability: index % 5 })));
  const saved = new Set(), events = [];
  const result = await runSync(journal, { send: async (operations, _, options) => {
    if (options?.deferApplication) {
      assert.ok(operations.length <= 25);
      events.push(`intake:${operations.length}`);
      operations.forEach((operation) => saved.add(operation.operationId));
      return { receipts: operations.map((operation) => ack(operation, { state: 'RECEIVED', appliedAt: undefined, result: undefined, retryable: true })) };
    }
    events.push('apply');
    assert.equal(saved.size, 61, 'a slow history projection must not strand later collected JSON on the device');
    return { receipts: operations.map((operation) => ack(operation)) };
  } });
  assert.deepEqual(events.slice(0, 3), ['intake:25', 'intake:25', 'intake:11']);
  assert.equal(result.applied, 61);
});

test('isolates an oversized/bad intake item and still backs up every other item of the visit', async (t) => {
  const f = fixture(t), journal = f.journal();
  await journal.capture([draft('bad-binary-metadata'), ...Array.from({ length: 27 }, (_, index) => draft(`valid-${index}`))]);
  const saved = new Set();
  const result = await runSync(journal, { send: async (operations, _, options) => {
    if (operations.some((operation) => operation.entityId === 'bad-binary-metadata')) throw Object.assign(new Error('Payload too large'), { status: 413 });
    operations.forEach((operation) => saved.add(operation.operationId));
    return { receipts: operations.map((operation) => options?.deferApplication
      ? ack(operation, { state: 'RECEIVED', appliedAt: undefined, result: undefined, retryable: true }) : ack(operation)) };
  } }, { maxAttempts: 1 });
  assert.equal(saved.size, 27); assert.equal(result.applied, 27); assert.equal(result.pending, 1);
  assert.equal((await f.reopen().read()).entries.length, 28);
});

test('rescues JSON and photo/audio bytes before applying history, then links durable media without re-upload', async (t) => {
  const f = fixture(t), journal = f.journal();
  const [parent] = await journal.capture([{ kind: 'CHARACTERIZATION', entityId: 'visit-parent', payload: { name: 'Visita' } }]);
  await journal.capture([
    draft('child-risk', { probability: 3 }, { dependsOn: [parent.operation.operationId] }),
    draft('photo', { characterizationId: 'visit-parent', uri: 'file:///synthetic/photo.jpg' }, { kind: 'PHOTO' }),
    draft('audio', { characterizationId: 'visit-parent', uri: 'file:///synthetic/audio.m4a' }, { kind: 'AUDIO' }),
  ]);
  const jsonReceived = new Set(), binaryReceived = new Set(), applied = new Set(), events = [];
  let uploadedBytes = 0;
  const result = await runSync(journal, {
    send: async (operations, _, options) => {
      if (options?.deferApplication) {
        events.push('intake'); operations.forEach((operation) => jsonReceived.add(operation.entityId));
        return { receipts: operations.map((operation) => ack(operation, { state: 'RECEIVED', appliedAt: undefined, result: undefined, retryable: true })) };
      }
      assert.equal(jsonReceived.size, 2); assert.equal(binaryReceived.size, 2, 'a slow first history mutation must not keep original binaries trapped on the device');
      operations.forEach((operation) => { events.push(`apply:${operation.entityId}`); applied.add(operation.entityId); });
      return { receipts: operations.map((operation) => ack(operation)) };
    },
    upload: async (operation) => {
      if (!binaryReceived.has(operation.entityId)) {
        uploadedBytes++; binaryReceived.add(operation.entityId); events.push(`binary:${operation.entityId}`);
      } else events.push(`link:${operation.entityId}`);
      return ack(operation, { state: applied.has('visit-parent') ? 'APPLIED' : 'WAITING_DEPENDENCY',
        durable: true, uploadedAt: clock(), appliedAt: applied.has('visit-parent') ? clock() : undefined,
        result: applied.has('visit-parent') ? { id: operation.entityId } : undefined, retryable: !applied.has('visit-parent') });
    },
  });
  assert.equal(result.applied, 4); assert.equal(result.mediaPending, 0); assert.equal(uploadedBytes, 2);
  assert.ok(events.indexOf('binary:photo') < events.indexOf('apply:visit-parent'));
  assert.ok(events.indexOf('binary:audio') < events.indexOf('apply:visit-parent'));
  assert.ok(events.indexOf('link:photo') > events.indexOf('apply:visit-parent'));
  assert.ok(events.indexOf('link:audio') > events.indexOf('apply:visit-parent'));
});
