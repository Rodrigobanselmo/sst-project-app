require('../register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, statSync, openSync, readSync, writeSync, closeSync, unlinkSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { openDatabase } = require('./watermelon-fixture.cjs');
const { createWatermelonRecoveryStore } = require('../../src/libs/sync/recoveryStorage.ts');
const { recoverVisit } = require('../../src/libs/sync/recovery.ts');
const { sha256 } = require('@noble/hashes/sha256');
const ctx = () => ({ userId: 11, companyId: randomUUID(), workspaceId: randomUUID(), deviceId: randomUUID() });
const options = { reasonCode: 'SYNC_FAILURE', details: 'Falha durante aplicação da visita' };
const clone = (value) => JSON.parse(JSON.stringify(value));
async function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'simplesst-recovery-core-')), context = ctx();
  let opened = await openDatabase(join(directory, 'recovery.db')), prepared = 0, maximumRead = 0, uploaded = 0, inFlight = 0, maxInFlight = 0;
  const file = (name, bytes) => { const path = join(directory, name); writeFileSync(path, bytes); return 'file://' + path; };
  const raw = file('coleta.json', Buffer.from(JSON.stringify({ format: 'simplesst.visit.raw', version: 1, unknownFuture: { preserve: [0, false, null, 'ç'] } })));
  const photo = file('photo.jpg', Buffer.from(Array.from({ length: 256 }, (_, i) => i))), audio = file('audio.m4a', Buffer.from('original-audio-bytes'));
  const media = [{ uri: photo, name: 'Foto', kind: 'PHOTO', mimeType: 'image/jpeg' }, { uri: audio, name: 'Áudio', kind: 'AUDIO', mimeType: 'audio/mp4' }];
  const requests = [], transfers = new Map(), verified = new Set(), failUris = new Set();
  const faults = { create: false, confirm: false, complete: false, uploadAfterCommit: false };
  let server, completed = false, createTransform;
  const path = (uri) => uri.slice(7);
  const contextKey = `mobile-sync-v1:${context.userId}:${context.companyId}:${context.workspaceId}`;
  const activeStore = () => createWatermelonRecoveryStore(opened.db, contextKey, randomUUID);
  const store = { get: () => activeStore().get(), set: (state) => activeStore().set(state) };
  const remote = () => ({ recoveryId: server.recoveryId, state: completed ? 'COMPLETE' : 'RECEIVED', manifest: clone(server.manifest), completedAt: completed ? '2026-10-24T12:00:00.000Z' : undefined,
    assets: server.manifest.assets.map((asset) => ({ assetId: asset.assetId, state: verified.has(asset.assetId) ? 'VERIFIED' : 'PENDING', size: asset.size, sha256: asset.sha256 })) });
  const io = {
    prepare: async () => { prepared++; return { rawUri: raw, media, diagnostics: { authorization: 'Bearer SYNTHETIC_PRIVATE_TOKEN', password: 'SYNTHETIC_PRIVATE_TOKEN' } }; },
    inspect: async (uri) => {
      if (!existsSync(path(uri))) return { exists: false, size: 0, sha256: '' };
      const fd = openSync(path(uri), 'r'), hash = createHash('sha256'); let bytes;
      try { do { const buffer = Buffer.alloc(64 * 1024); bytes = readSync(fd, buffer, 0, buffer.length, null); maximumRead = Math.max(maximumRead, buffer.length); if (bytes) hash.update(buffer.subarray(0, bytes)); } while (bytes); }
      finally { closeSync(fd); }
      return { exists: true, size: statSync(path(uri)).size, sha256: hash.digest('hex') };
    },
    upload: async (url, uri, headers, onProgress) => {
      assert.equal(url.includes('SYNTHETIC_SIGNED_TOKEN'), true); uploaded++; inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
      try {
        await new Promise((resolve) => setTimeout(resolve, 1));
        if (failUris.has(uri)) throw new Error('Network failed https://object.invalid/private?token=SYNTHETIC_SIGNED_TOKEN');
        const assetId = new URL(url).pathname.slice(1), bytes = readFileSync(path(uri));
        transfers.set(assetId, { sha256: createHash('sha256').update(bytes).digest('hex'), size: bytes.length });
        onProgress(bytes.length);
        if (faults.uploadAfterCommit) { faults.uploadAfterCommit = false; throw new Error('The PUT committed but its acknowledgement disappeared'); }
      } finally { inFlight--; }
    },
  };
  const client = {
    create: async (request) => {
      requests.push(clone(request)); if (server) assert.deepEqual(request, server, 'a retry keeps the immutable package request'); else server = clone(request);
      if (faults.create) { faults.create = false; throw new Error('Create committed, response lost'); }
      const value = remote(); return createTransform ? createTransform(value) : value;
    },
    get: async () => remote(),
    sign: async (recoveryId, assetId) => verified.has(assetId) ? { assetId, state: 'VERIFIED' } : { assetId, method: 'PUT', url: `https://object.invalid/${assetId}?secret=SYNTHETIC_SIGNED_TOKEN`, headers: { 'content-type': 'application/octet-stream' } },
    confirm: async (recoveryId, assetId) => {
      const item = server.manifest.assets.find((a) => a.assetId === assetId), stored = transfers.get(assetId);
      if (!stored || stored.sha256 !== item.sha256 || stored.size !== item.size) throw Object.assign(new Error('Missing or incomplete file'), { status: 409 });
      verified.add(assetId);
      if (faults.confirm) { faults.confirm = false; throw new Error('Verify committed, response lost'); }
      return { assetId, state: 'VERIFIED' };
    },
    complete: async () => {
      assert.equal(verified.size, server.manifest.assets.length); completed = true;
      if (faults.complete) { faults.complete = false; throw new Error('Complete committed, response lost'); }
      return remote();
    },
  };
  const deps = { store, io, client, id: randomUUID, now: () => '2026-10-24T12:00:00.000Z' };
  t.after(() => { opened.close(); rmSync(directory, { recursive: true, force: true }); });
  return { directory, context, contextKey, opened: () => opened, deps, raw, photo, audio, media, file, faults, failUris, requests, transfers, verified,
    transform: (fn) => { createTransform = fn; }, resetServer: () => { server = undefined; completed = false; verified.clear(); transfers.clear(); },
    reopen: async () => { opened.close(); opened = await openDatabase(join(directory, 'recovery.db')); },
    metrics: () => ({ prepared, maximumRead, uploaded, maxInFlight }) };
}

test('preserves opaque data, 8-bit file checksums and immutable recovery IDs across a lost create response and SQLite restart', async (t) => {
  const f = await fixture(t); f.faults.create = true;
  await assert.rejects(recoverVisit(f.context, f.deps, options), /response lost/);
  const before = await f.deps.store.get(); assert.ok(before.request.recoveryId); assert.equal(before.complete, false);
  await f.reopen();
  const recovered = await recoverVisit(f.context, f.deps, options);
  assert.equal(recovered.complete, true); assert.equal(recovered.recoveryId, before.request.recoveryId);
  assert.deepEqual(f.requests[0], f.requests[1]); assert.equal(f.metrics().prepared, 1);
  const state = await f.deps.store.get();
  assert.equal(JSON.stringify(state).includes('SYNTHETIC_PRIVATE_TOKEN'), false);
  assert.equal(JSON.stringify(state).includes('SYNTHETIC_SIGNED_TOKEN'), false);
  assert.equal(JSON.parse(readFileSync(f.raw.slice(7))).unknownFuture.preserve[1], false);
  assert.equal(f.metrics().maxInFlight <= 2, true);
});

test('rescues independent files after a failed transfer and resumes only pending files after restart', async (t) => {
  const f = await fixture(t); f.failUris.add(f.photo);
  const first = await recoverVisit(f.context, f.deps, options);
  assert.equal(first.complete, false); assert.equal(first.failedFiles, 1); assert.equal(f.verified.size, 2);
  const prior = await f.deps.store.get();
  assert.equal(JSON.stringify(prior.failures).includes('SYNTHETIC_SIGNED_TOKEN'), false);
  await f.reopen(); f.failUris.clear();
  const result = await recoverVisit(f.context, f.deps, options);
  assert.equal(result.complete, true); assert.equal(result.recoveryId, prior.request.recoveryId);
  assert.equal(f.metrics().uploaded, 4, 'three first attempts and one retry; verified raw/audio never re-upload');
  for (const uri of [f.raw, f.photo, f.audio]) assert.equal(existsSync(uri.slice(7)), true);
});

test('recovers PUT, confirm and COMPLETE acknowledgements lost after their durable effects', async (t) => {
  const f = await fixture(t); f.faults.uploadAfterCommit = true; f.faults.confirm = true; f.faults.complete = true;
  const first = await recoverVisit(f.context, f.deps, options);
  assert.equal(first.complete, false);
  await f.reopen();
  await assert.rejects(recoverVisit(f.context, f.deps, options), /Complete committed/);
  const uploads = f.metrics().uploaded;
  await f.reopen();
  const result = await recoverVisit(f.context, f.deps, options);
  assert.equal(result.complete, true); assert.equal(f.metrics().uploaded, uploads);
});

test('a missing source file is explicit and cannot become a complete recovery even after every available file uploads', async (t) => {
  const f = await fixture(t); unlinkSync(f.photo.slice(7));
  const result = await recoverVisit(f.context, f.deps, options);
  assert.equal(result.complete, false); assert.deepEqual(result.missingFiles, [f.photo]);
  const saved = await f.deps.store.get();
  assert.equal(saved.verified.length, 2); assert.equal(saved.request.manifest.assets.length, 2);
  await f.reopen(); assert.equal((await recoverVisit(f.context, f.deps, options)).complete, false);
});

test('a changed local file cannot overwrite the immutable manifest; only explicit new-package preparation includes it', async (t) => {
  const f = await fixture(t); f.failUris.add(f.photo);
  await recoverVisit(f.context, f.deps, options);
  const before = await f.deps.store.get(); writeFileSync(f.photo.slice(7), Buffer.from('new collected bytes'));
  f.failUris.clear(); await f.reopen();
  const blocked = await recoverVisit(f.context, f.deps, options);
  assert.equal(blocked.complete, false); assert.equal(blocked.recoveryId, before.request.recoveryId);
  assert.deepEqual((await f.deps.store.get()).request, before.request);
  f.resetServer();
  const fresh = await recoverVisit(f.context, f.deps, { ...options, newPackage: true });
  assert.equal(fresh.complete, true); assert.notEqual(fresh.recoveryId, before.request.recoveryId); assert.equal(f.metrics().prepared, 2);
  const retained = (await f.opened().db.get('SyncOperation').query().fetch()).filter((row) => row.recordType === 'RECOVERY');
  assert.equal(retained.length, 2, 'preparing a new package preserves the previous immutable request and diagnostic evidence');
});

test('duplicate or altered remote asset acknowledgements never confirm a different or partial package', async (t) => {
  const f = await fixture(t); f.transform((remote) => ({ ...remote, assets: [remote.assets[0], remote.assets[0], remote.assets[2]] }));
  await assert.rejects(recoverVisit(f.context, f.deps, options), /não corresponde/);
  assert.equal((await f.deps.store.get()).complete, false); assert.equal(f.metrics().uploaded, 0);
  f.transform((remote) => ({ ...remote, manifest: { ...remote.manifest, assets: remote.manifest.assets.map((a, index) => index ? a : { ...a, sha256: 'f'.repeat(64) }) } }));
  await assert.rejects(recoverVisit(f.context, f.deps, options), /não corresponde/);
  assert.equal(f.metrics().uploaded, 0);
});

test('an expired session stops transfer, preserves state, and another actor cannot adopt the package', async (t) => {
  const f = await fixture(t), original = f.deps.client.confirm;
  f.deps.client.confirm = async () => { throw Object.assign(new Error('Expired authentication'), { status: 401 }); };
  await assert.rejects(recoverVisit(f.context, f.deps, options), /Expired authentication/);
  assert.equal(f.metrics().uploaded, 0); assert.equal((await f.deps.store.get()).complete, false);
  await assert.rejects(recoverVisit({ ...f.context, userId: 12 }, f.deps, options), /outra visita/);
  f.deps.client.confirm = original; await f.reopen(); assert.equal((await recoverVisit(f.context, f.deps, options)).complete, true);
});

test('a UI progress callback failure cannot prevent the visit from leaving the phone', async (t) => {
  const f = await fixture(t);
  const result = await recoverVisit(f.context, f.deps, { ...options, onProgress: () => { throw new Error('Synthetic rendering failure'); } });
  assert.equal(result.complete, true);
});

test('a broken sync journal does not prevent the independent recovery store from preserving a new package', async (t) => {
  const f = await fixture(t);
  await f.opened().db.write(() => f.opened().db.get('SyncOperation').create((row) => { row._raw.id = randomUUID(); row.contextKey = f.contextKey; row.recordType = 'META'; row.entityKey = 'context'; row.data = '{invalid-json-from-an-old-sync'; }));
  assert.equal((await recoverVisit(f.context, f.deps, options)).complete, true);
  await f.reopen(); assert.equal((await f.deps.store.get()).complete, true);
  assert.ok((await f.opened().db.get('SyncOperation').query().fetch()).some((row) => row.recordType === 'META' && row.data === '{invalid-json-from-an-old-sync'));
});

test('unreadable raw tables leave all readable files recoverable without a false COMPLETE acknowledgement', async (t) => {
  const f = await fixture(t), original = f.deps.io.prepare;
  f.deps.io.prepare = async (id) => ({ ...await original(id), missingData: ['MMEpisToRiskData'] });
  const result = await recoverVisit(f.context, f.deps, options);
  assert.equal(result.complete, false); assert.deepEqual(result.missingFiles, ['dados:MMEpisToRiskData']);
  assert.equal((await f.deps.store.get()).verified.length, 3);
});

test('recovering before the first normal sync does not prevent subsequently creating the operational journal', async (t) => {
  const f = await fixture(t);
  assert.equal((await recoverVisit(f.context, f.deps, options)).complete, true);
  await f.reopen();
  const { SyncJournal } = require('../../src/libs/sync/journal.ts');
  const journal = new SyncJournal(f.opened().storage, f.context, { id: randomUUID, now: () => '2026-10-24T12:00:00.000Z' });
  assert.deepEqual((await journal.read()).entries, []);
  await journal.capture([{ kind: 'RISK_DATA', entityId: 'first-normal-collection', payload: { probability: 0 } }]);
  assert.equal((await journal.read()).entries.length, 1);
  assert.equal((await f.deps.store.get()).complete, true);
});

test('incremental SHA-256 matches Node crypto for 101 MiB using chunks bounded at 64 KiB', () => {
  const size = 101 * 1024 * 1024, chunk = Uint8Array.from({ length: 64 * 1024 }, (_, index) => index % 256);
  const noble = sha256.create(), node = createHash('sha256'); let read = 0;
  while (read < size) { const bytes = chunk.subarray(0, Math.min(chunk.length, size - read)); noble.update(bytes); node.update(bytes); read += bytes.length; }
  assert.equal(Buffer.from(noble.digest()).toString('hex'), node.digest('hex')); assert.equal(read, size);
});
