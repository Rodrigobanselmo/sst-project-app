require('../register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, statSync, openSync, readSync, writeSync, closeSync, unlinkSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { unzipSync, strFromU8 } = require('fflate');
const { writeVisitBackup } = require('../../src/libs/sync/backup.ts');
function fixture(t, options = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'simplesst-visit-backup-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const output = join(directory, 'backup.zip');
  let written = 0, closedInputs = 0, maxRead = 0, discarded = false;
  const path = (uri) => uri.replace(/^file:\/\//, '');
  const io = {
    stat: async (uri) => ({ exists: existsSync(path(uri)), size: existsSync(path(uri)) ? statSync(path(uri)).size : 0 }),
    openInput: (uri) => {
      const fd = openSync(path(uri), 'r');
      return { read(length) { maxRead = Math.max(maxRead, length); const bytes = Buffer.alloc(length); const actual = readSync(fd, bytes, 0, length, null); return bytes.subarray(0, actual); }, close() { closedInputs++; closeSync(fd); } };
    },
    createOutput: () => {
      const fd = openSync(output, 'w'); let closed = false;
      return { uri: 'file://' + output, write(bytes) { written += bytes.length; if (options.failAfter && written > options.failAfter) throw new Error('SYNTHETIC_BACKUP_DISK_FULL'); writeSync(fd, bytes); }, close() { if (!closed) { closeSync(fd); closed = true; } }, discard() { discarded = true; if (existsSync(output)) unlinkSync(output); } };
    }, ...options.io,
  };
  const source = (name, bytes) => { const filename = join(directory, name); writeFileSync(filename, bytes); return 'file://' + filename; };
  return { directory, output, io, source, metrics: () => ({ written, closedInputs, maxRead, discarded }) };
}
function document(payload) {
  const operationId = randomUUID();
  return { version: 1, context: { userId: 11, companyId: randomUUID(), workspaceId: randomUUID(), deviceId: randomUUID() }, bases: {},
    entries: [{ operation: { operationId, kind: 'PHOTO', entityId: 'offline-photo', payload }, fingerprint: 'synthetic', capturedAt: new Date().toISOString(), sequence: 1, attempts: 0,
      receipt: { operationId, kind: 'PHOTO', entityId: 'offline-photo', state: 'PENDING' } }] };
}

test('exports original collection JSON and exact photo/audio/video bytes into a readable ZIP', async (t) => {
  const f = fixture(t), photo = Buffer.from('synthetic-photo'), audio = Buffer.from('synthetic-audio'), video = Buffer.from('synthetic-video');
  const uris = [f.source('photo.jpg', photo), f.source('audio.m4a', audio), f.source('video.mp4', video)];
  const original = document({ uri: uris[0], photos: [{ photoUrl: uris[0] }], audios: [{ uri: uris[1] }], videos: [{ uri: uris[2] }], probability: 0, trainingCheck: false });
  const result = await writeVisitBackup(original, f.io);
  assert.equal(result.archivedMedia, 3); assert.equal(result.missingMedia, 0);
  const zip = unzipSync(readFileSync(f.output)), metadata = JSON.parse(strFromU8(zip['coleta.json']));
  assert.deepEqual(metadata.journal, original);
  assert.equal(metadata.files.length, 3, 'the same file referenced twice must be archived once');
  assert.deepEqual(Buffer.from(zip[metadata.files[0].archivePath]), photo);
  assert.deepEqual(Buffer.from(zip[metadata.files[1].archivePath]), audio);
  assert.deepEqual(Buffer.from(zip[metadata.files[2].archivePath]), video);
  for (const uri of uris) assert.equal(existsSync(uri.slice(7)), true, 'a backup never deletes source media');
});

test('records missing or inaccessible media explicitly while exporting all other data', async (t) => {
  const f = fixture(t), present = f.source('photo.jpg', Buffer.from('present'));
  const missing = 'file://' + join(f.directory, 'absent.mp4');
  const result = await writeVisitBackup(document({ uri: missing, photos: [{ photoUrl: present }] }), f.io);
  assert.equal(result.archivedMedia, 1); assert.equal(result.missingMedia, 1);
  const zip = unzipSync(readFileSync(f.output)), metadata = JSON.parse(strFromU8(zip['coleta.json']));
  assert.equal(metadata.backup.missingMedia, 1);
  assert.equal(metadata.files.find((file) => file.uri === missing).exists, false);
  assert.equal(metadata.journal.entries[0].operation.payload.uri, missing);
});

test('disk exhaustion removes only the incomplete backup and preserves every source file', async (t) => {
  const f = fixture(t, { failAfter: 3000 }), source = f.source('video.mp4', Buffer.alloc(128 * 1024, 7));
  await assert.rejects(writeVisitBackup(document({ uri: source }), f.io), /SYNTHETIC_BACKUP_DISK_FULL/);
  assert.equal(existsSync(f.output), false); assert.equal(f.metrics().discarded, true);
  assert.equal(statSync(source.slice(7)).size, 128 * 1024); assert.equal(f.metrics().closedInputs, 1);
});

test('an interrupted file read cannot produce a successful or partially usable backup acknowledgement', async (t) => {
  let closed = false;
  const f = fixture(t, { io: { stat: async () => ({ exists: true, size: 50 }), openInput: () => ({ read: () => new Uint8Array(0), close: () => { closed = true; } }) } });
  await assert.rejects(writeVisitBackup(document({ uri: 'file:///synthetic/truncated.mp4' }), f.io), /interrompida/);
  assert.equal(closed, true); assert.equal(existsSync(f.output), false);
});

test('streams a video above the API upload limit with bounded chunks and a usable output file', async (t) => {
  const size = 101 * 1024 * 1024;
  let read = 0, maxChunk = 0, closed = false, yields = 0;
  const f = fixture(t, { io: {
    stat: async () => ({ exists: true, size }),
    openInput: () => ({ read(length) { maxChunk = Math.max(maxChunk, length); read += length; return new Uint8Array(length); }, close() { closed = true; } }),
    yield: async () => { yields++; },
  } });
  const result = await writeVisitBackup(document({ uri: 'file:///synthetic/large-video.mp4' }), f.io);
  assert.equal(result.archivedMedia, 1); assert.equal(read, size); assert.equal(closed, true);
  assert.ok(maxChunk <= 64 * 1024); assert.ok(yields >= 40);
  assert.ok(statSync(f.output).size > size);
});
