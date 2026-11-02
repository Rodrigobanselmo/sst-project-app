require('../register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync, statSync, copyFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { createVisitMediaPersistence } = require('../../src/utils/helpers/durableMedia.core.ts');
function fixture(t, options = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'simplesst-visit-media-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const target = join(directory, 'documents', 'visits');
  const persist = createVisitMediaPersistence({
    directory: target, uuid: randomUUID, resolve: async (uri) => uri,
    prepare: () => mkdirSync(target, { recursive: true }),
    stat: (uri) => ({ exists: existsSync(uri), size: existsSync(uri) ? statSync(uri).size : undefined }),
    copy: (from, to) => copyFileSync(from, to), ...options,
  });
  const source = (name = 'visit.jpg', bytes = Buffer.from('synthetic-visit-bytes')) => { const filename = join(directory, name); writeFileSync(filename, bytes); return filename; };
  return { directory, target, persist, source };
}

test('copies media from transient storage to persistent documents and keeps the original recoverable', async (t) => {
  const f = fixture(t), source = f.source();
  const first = await f.persist(source, 'photo'), second = await f.persist(source, 'photo');
  assert.notEqual(first, second); assert.ok(first.startsWith(f.target + '/photo-'));
  assert.deepEqual(readFileSync(first), readFileSync(source)); assert.deepEqual(readFileSync(second), readFileSync(source));
  assert.equal(existsSync(source), true);
});

test('a failed copy leaves the source intact and does not return a false saved-file result', async (t) => {
  const f = fixture(t, { copy: () => { throw new Error('SYNTHETIC_DISK_FULL'); } }), source = f.source();
  await assert.rejects(f.persist(source, 'photo'), /SYNTHETIC_DISK_FULL/);
  assert.equal(existsSync(source), true); assert.equal(readFileSync(source).toString(), 'synthetic-visit-bytes');
});

test('rejects empty/missing sources and truncated destination copies', async (t) => {
  const f = fixture(t), empty = f.source('empty.jpg', Buffer.alloc(0));
  await assert.rejects(f.persist(empty, 'photo'), /vazio|encontrado/);
  await assert.rejects(f.persist(join(f.directory, 'missing.jpg'), 'photo'), /vazio|encontrado/);
  const partial = fixture(t, { copy: (_, destination) => writeFileSync(destination, 'x') });
  const source = partial.source('video.mp4', Buffer.from('many-more-bytes'));
  await assert.rejects(partial.persist(source, 'video'), /completo/);
  assert.equal(readFileSync(source).toString(), 'many-more-bytes');
});

test('reuses an existing durable file and copies edited media to a different immutable path when requested', async (t) => {
  const f = fixture(t), source = f.source();
  const durable = await f.persist(source, 'photo');
  assert.equal(await f.persist(durable, 'photo'), durable);
  const revision = await f.persist(durable, 'photo', { forceCopy: true });
  assert.notEqual(revision, durable); assert.deepEqual(readFileSync(revision), readFileSync(durable));
});

test('resolves gallery/content URIs and selects supported extensions for photo, audio and video', async (t) => {
  const resolved = new Map(), f = fixture(t, { resolve: async (uri) => resolved.get(uri) || uri });
  const audio = f.source('recording.M4A'), video = f.source('recording.MP4'), photo = f.source('gallery.PNG');
  resolved.set('content://synthetic/audio', audio); resolved.set('ph://synthetic/photo', photo);
  assert.match(await f.persist('content://synthetic/audio', 'audio'), /\.m4a$/);
  assert.match(await f.persist('ph://synthetic/photo', 'photo'), /\.png$/);
  assert.match(await f.persist(video, 'video'), /\.mp4$/);
});
