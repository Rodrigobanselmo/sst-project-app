require('../register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { unzipSync, strFromU8 } = require('fflate');
const { writeVisitBackup } = require('../../src/libs/sync/backup.ts');

test('exports audio/video serialized in a deleted characterization raw snapshot', async () => {
  const operationId = randomUUID();
  const photo = 'file:///synthetic/deleted-parent-photo.jpg';
  const audio = 'file:///synthetic/deleted-parent-audio.m4a';
  const video = 'file:///synthetic/deleted-parent-video.mp4';
  const arbitraryText = JSON.stringify([{ uri: 'file:///synthetic/not-a-media-field.mp4' }]);
  const document = { version: 1,
    context: { userId: 11, companyId: randomUUID(), workspaceId: randomUUID(), deviceId: randomUUID() }, bases: {},
    entries: [{ operation: { operationId, kind: 'CHARACTERIZATION_DELETE', entityId: 'deleted-parent',
      payload: { id: 'deleted-parent', sourceSnapshot: { id: 'deleted-parent',
        audios: JSON.stringify([{ id: 'audio', uri: audio }]),
        videos: JSON.stringify([{ id: 'video', uri: video }]),
        photos: [{ photoUrl: photo }], description: arbitraryText } } },
      fingerprint: 'synthetic', sequence: 1, attempts: 0, capturedAt: new Date().toISOString(),
      receipt: { operationId, kind: 'CHARACTERIZATION_DELETE', entityId: 'deleted-parent', state: 'PENDING' } }] };
  const chunks = [], inspected = [];
  const result = await writeVisitBackup(document, {
    stat: async (uri) => { inspected.push(uri); return { exists: true, size: 1 }; },
    openInput: () => ({ read: () => Uint8Array.of(42), close() {} }),
    createOutput: () => ({ uri: 'memory', write: (bytes) => chunks.push(bytes), close() {}, discard() {} }),
  });
  assert.equal(result.archivedMedia, 3);
  assert.equal(result.missingMedia, 0);
  assert.deepEqual(inspected.sort(), [photo, audio, video].sort());
  const zip = unzipSync(Buffer.concat(chunks));
  const metadata = JSON.parse(strFromU8(zip['coleta.json']));
  assert.deepEqual(metadata.journal, document, 'original raw strings remain unchanged');
  assert.equal(metadata.files.length, 3);
  for (const file of metadata.files) assert.deepEqual(Buffer.from(zip[file.archivePath]), Buffer.from([42]));
});
