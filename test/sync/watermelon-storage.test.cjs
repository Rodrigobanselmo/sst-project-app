require('../register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { spawn } = require('node:child_process');
const { openDatabase } = require('./watermelon-fixture.cjs');
const { SyncJournal } = require('../../src/libs/sync/journal.ts');
const context = () => ({ userId: 11, companyId: randomUUID(), workspaceId: randomUUID(), deviceId: randomUUID() });
const options = { id: randomUUID, now: () => new Date().toISOString() };
function file(t) { const dir = mkdtempSync(join(tmpdir(), 'simplesst-watermelon-sync-')); t.after(() => rmSync(dir, { recursive: true, force: true })); return join(dir, 'visit.db'); }

test('migrates a real version-44 visit to version 45 without resetting photos, risks, controls or pending changes', async (t) => {
  const filename = file(t), old = await openDatabase(filename, true);
  const character = await old.db.write(() => old.db.get('CompanyCharacterization').create((row) => {
    row._raw.id = 'existing-visit'; row.name = 'Visita sem rede antes do upgrade'; row.type = 'GENERAL';
    row.apiId = ''; row.userId = '11'; row.workspaceId = 'workspace-visit'; row.description = 'Não perder';
    row.created_at = new Date('2026-01-01'); row.updated_at = new Date('2026-10-23');
  }));
  await old.db.write(async () => {
    await old.db.get('CompanyCharacterizationPhoto').create((row) => { row._raw.id = 'existing-photo'; row.companyCharacterizationId = character.id; row.name = 'Foto offline'; row.photoUrl = 'file:///synthetic/document/visit.jpg'; row.created_at = new Date(); row.updated_at = new Date(); });
    await old.db.get('RiskData').create((row) => { row._raw.id = 'existing-risk'; row.riskId = 'noise'; row.characterizationId = character.id; row.userId = '11'; row.probability = 3; row.exposure = 'CP'; row.created_at = new Date(); row.updated_at = new Date(); });
    await old.db.get('MMEpisToRiskData').create((row) => { row._raw.id = 'existing-epi'; row.riskDataId = 'existing-risk'; row.epiId = 3; row.ca = '999999'; row.description = 'Controle original'; row.userId = '11'; row.efficientlyCheck = true; row.trainingCheck = false; row.sanitationCheck = true; row.created_at = new Date(); row.updated_at = new Date(); });
  });
  old.close();
  const before = new DatabaseSync(filename, { readOnly: true });
  const snapshot = Object.fromEntries(['CompanyCharacterization', 'CompanyCharacterizationPhoto', 'RiskData', 'MMEpisToRiskData'].map((table) => [table, before.prepare(`SELECT * FROM "${table}" ORDER BY id`).all()]));
  assert.equal(before.prepare('PRAGMA user_version').get().user_version, 44); before.close();
  const upgraded = await openDatabase(filename);
  try {
    const sql = new DatabaseSync(filename, { readOnly: true });
    try {
      assert.equal(sql.prepare('PRAGMA user_version').get().user_version, 45);
      for (const [table, original] of Object.entries(snapshot)) assert.deepEqual(sql.prepare(`SELECT * FROM "${table}" ORDER BY id`).all(), original, `${table}: every original field and dirty flag must survive`);
      assert.ok(sql.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='SyncOperation'").get());
    } finally { sql.close(); }
    const journal = new SyncJournal(upgraded.storage, context(), options);
    await journal.capture([{ kind: 'CHARACTERIZATION', entityId: character.id, payload: { description: 'Coleta do aparelho' } }]);
    assert.equal((await journal.read()).entries.length, 1);
    assert.equal((await upgraded.db.get('CompanyCharacterization').find(character.id)).description, 'Não perder');
  } finally { upgraded.close(); }
});

test('persists the production journal in independent Watermelon rows and reopens the same SQLite file', async (t) => {
  const filename = file(t), first = await openDatabase(filename), ctx = context();
  const journal = new SyncJournal(first.storage, ctx, options);
  const drafts = Array.from({ length: 40 }, (_, index) => ({ kind: 'RISK_DATA', entityId: `risk-${index}`, payload: { description: `Medição ${index} ` + 'x'.repeat(1000), probability: index % 5 } }));
  const captured = await journal.capture(drafts);
  await journal.setBase('RISK_DATA', 'risk-base', { baseSnapshotHash: 'a'.repeat(64), snapshot: { epi: false }, localSnapshot: { probability: 3 } });
  await journal.updateReceipt({ operationId: captured[0].operation.operationId, kind: 'RISK_DATA', entityId: 'risk-0', state: 'APPLIED', receivedAt: options.now(), appliedAt: options.now(), result: { id: 'risk-0' } });
  first.close();
  const reopened = await openDatabase(filename);
  try {
    const restored = await new SyncJournal(reopened.storage, ctx, options).read();
    assert.equal(restored.entries.length, 40);
    assert.equal(restored.entries.find((entry) => entry.operation.entityId === 'risk-0').receipt.state, 'APPLIED');
    assert.deepEqual(restored.bases['RISK_DATA:risk-base'].snapshot, { epi: false });
    const rows = await reopened.db.get('SyncOperation').query().fetch();
    assert.equal(rows.filter((row) => row.recordType === 'OPERATION').length, 40);
    assert.equal(rows.filter((row) => row.recordType === 'BASE').length, 1);
    assert.ok(Math.max(...rows.map((row) => row.data.length)) < 4000, 'the production storage must not put an entire visit into one SQLite value');
  } finally { reopened.close(); }
});

test('preserves capture/dependency order when multiple operations share the same millisecond', async (t) => {
  const filename = file(t), opened = await openDatabase(filename), ctx = context();
  const ids = ['ffffffff-ffff-4fff-8fff-ffffffffffff', '00000000-0000-4000-8000-000000000000'];
  const journal = new SyncJournal(opened.storage, ctx, { id: () => ids.shift(), now: () => '2026-10-23T12:00:00.000Z' });
  const [parent] = await journal.capture([{ kind: 'CHARACTERIZATION', entityId: 'parent', payload: { name: 'Pai' } }]);
  await journal.capture([{ kind: 'RISK_DATA', entityId: 'child', payload: { probability: 3 }, dependsOn: [parent.operation.operationId] }]);
  opened.close();
  const reopened = await openDatabase(filename);
  try { assert.deepEqual((await new SyncJournal(reopened.storage, ctx, options).read()).entries.map((entry) => entry.operation.entityId), ['parent', 'child']); }
  finally { reopened.close(); }
});

test('an SQLite batch failure cannot leave a receipt without its immutable operation', async (t) => {
  const filename = file(t), opened = await openDatabase(filename), ctx = context();
  const sql = new DatabaseSync(filename);
  sql.exec("CREATE TRIGGER sync_test_reject BEFORE INSERT ON SyncOperation WHEN NEW.record_type = 'OPERATION' BEGIN SELECT RAISE(ABORT, 'SYNTHETIC_SYNC_WRITE_FAILURE'); END");
  const journal = new SyncJournal(opened.storage, ctx, options);
  try {
    await assert.rejects(journal.capture([{ kind: 'RISK_DATA', entityId: 'cannot-commit', payload: { probability: 3 } }]), /SYNTHETIC_SYNC_WRITE_FAILURE/);
    assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM SyncOperation').get().n, 0, 'META and OPERATION must roll back together');
  } finally { sql.exec('DROP TRIGGER sync_test_reject'); sql.close(); opened.close(); }
});

test('reopens production Watermelon rows after killing the saving process without cleanup', async (t) => {
  const filename = file(t), ctx = context();
  const child = spawn(process.execPath, [join(__dirname, 'watermelon-process.cjs'), filename, JSON.stringify(ctx)], { stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '', errors = '';
  child.stderr.on('data', (data) => { errors += data; });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('No durable Watermelon checkpoint: ' + errors)); }, 10000);
    child.stdout.on('data', (data) => { output += data; if (output.includes('DURABLE')) { clearTimeout(timeout); resolve(); } });
    child.once('exit', (code) => { clearTimeout(timeout); if (!output.includes('DURABLE')) reject(new Error(`child exited ${code}: ${errors}`)); });
  });
  child.kill('SIGKILL'); await new Promise((resolve) => child.once('exit', resolve));
  const reopened = await openDatabase(filename);
  try {
    const doc = await new SyncJournal(reopened.storage, ctx, options).read();
    assert.equal(doc.entries.length, 1); assert.equal(doc.entries[0].receipt.state, 'PENDING');
    assert.equal(doc.entries[0].operation.payload.description, 'Coleta persistida antes de SIGKILL');
  } finally { reopened.close(); }
});

test('refuses an unsupported older schema without resetting the original visit database', async (t) => {
  const filename = file(t), old = await openDatabase(filename, true);
  await old.db.write(() => old.db.get('CompanyCharacterization').create((row) => { row._raw.id = 'older-unsent-visit'; row.name = 'Coleta ainda não sincronizada'; row.type = 'GENERAL'; row.apiId = ''; row.userId = '11'; row.workspaceId = 'workspace'; row.description = 'Preservar em qualquer erro de upgrade'; row.created_at = new Date(); row.updated_at = new Date(); }));
  old.close();
  const sql = new DatabaseSync(filename);
  sql.exec('PRAGMA user_version=43');
  const before = sql.prepare('SELECT * FROM CompanyCharacterization').all(); sql.close();
  await assert.rejects(openDatabase(filename), /versão 43|atualização segura|dados foram mantidos/i);
  const unchanged = new DatabaseSync(filename, { readOnly: true });
  try {
    assert.equal(unchanged.prepare('PRAGMA user_version').get().user_version, 43);
    assert.deepEqual(unchanged.prepare('SELECT * FROM CompanyCharacterization').all(), before);
    assert.equal(unchanged.prepare("SELECT name FROM sqlite_master WHERE name='SyncOperation'").get(), undefined);
  } finally { unchanged.close(); }
});
