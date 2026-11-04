require('../register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { synchronize } = require('@nozbe/watermelondb/sync');
const { getLastPulledAt } = require('@nozbe/watermelondb/sync/impl');
const { openDatabase } = require('./watermelon-fixture.cjs');
const { catalogChangesForUpsert } = require('../../src/libs/sync/catalogChanges.ts');
const { VisitRefreshGate } = require('../../src/libs/sync/visitFreshness.ts');

const group = (created = [], updated = [], deleted = []) => ({ created, updated, deleted });
const company = (id = randomUUID(), extra = {}) => ({ id, apiId: id, name: 'Empresa recebida', user_id: '11',
  cnpj: '11222333000181', fantasy: 'Fantasia recebida', logoUrl: '', isClinic: false, isConsulting: false,
  status: 'ACTIVE', created_at: 1, updated_at: 2, ...extra });
const source = (id = randomUUID(), extra = {}) => ({ id, apiId: id, name: 'Fonte recebida', user_id: '11',
  riskId: randomUUID(), status: 'ACTIVE', created_at: 1, updated_at: 2, ...extra });
async function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'simplesst-catalog-upsert-'));
  const opened = await openDatabase(join(directory, 'visit.db'));
  t.after(() => { opened.close(); rmSync(directory, { recursive: true, force: true }); });
  const errors = [], originalError = console.error;
  t.mock.method(console, 'error', (...args) => { errors.push(args.map(String).join(' ')); originalError(...args); });
  let timestamp = 1000;
  return { ...opened, errors, async sync(changes, actor = 11) {
    const input = structuredClone(changes);
    await synchronize({ database: opened.db, sendCreatedAsUpdated: true,
      pullChanges: async () => ({ changes: catalogChangesForUpsert(input, actor), timestamp: ++timestamp }) });
    assert.deepEqual(input, changes, 'the adapter must not mutate the server response');
  } };
}

test('full catalog refresh upserts login records and unseen rows repeatedly without recoverable protocol errors', async (t) => {
  const f = await fixture(t), row = company();
  // Login already saved the company before the first catalog synchronization.
  await f.db.write(() => f.db.get('Company').create((r) => {
    r._raw.id = row.id; r.apiId = row.id; r.name = row.name; r.userId = row.user_id;
    r.cnpj = row.cnpj; r.fantasy = row.fantasy; r.created_at = new Date(1); r.updated_at = new Date(2);
  }));
  const next = company(), receivedSource = source();
  const changes = { Company: group([row, next]), GenerateSource: group([receivedSource]) };
  for (let index = 0; index < 3; index++) await f.sync(changes);
  assert.equal(await f.db.get('Company').query().fetchCount(), 2);
  assert.equal((await f.db.get('GenerateSource').find(receivedSource.id)).name, receivedSource.name);
  assert.deepEqual(f.errors, [], 'upsert is a supported protocol, not a suppressed duplicate-create error');
});

test('catalog replay retains offline changed columns and unrelated local creations', async (t) => {
  const f = await fixture(t), row = company();
  await f.sync({ Company: group([row]) });
  const local = await f.db.get('Company').find(row.id);
  let localOnly;
  await f.db.write(async () => {
    await local.update((r) => { r.name = 'Nome editado no aparelho'; });
    localOnly = await f.db.get('GenerateSource').create((r) => {
      r.name = 'Fonte offline ainda sem envio'; r.userId = '11'; r.riskId = 'synthetic-risk';
      r.created_at = new Date(1); r.updated_at = new Date(2);
    });
  });
  await f.sync({ Company: group([{ ...row, name: 'Outro nome no servidor', fantasy: 'Fantasia nova no servidor' }]) });
  assert.equal(local.name, 'Nome editado no aparelho');
  assert.equal(local.fantasy, 'Fantasia nova no servidor');
  assert.equal(local._raw._status, 'updated'); assert(local._raw._changed.split(',').includes('name'));
  assert.equal((await f.db.get('GenerateSource').find(localOnly.id)).name, 'Fonte offline ainda sem envio');
  assert.equal(localOnly._raw._status, 'created');
  assert.deepEqual(f.errors, []);
});

test('a full replay never resurrects local tombstones and explicit remote deletes still apply', async (t) => {
  const f = await fixture(t), removedLocally = source(), removedRemotely = source();
  await f.sync({ GenerateSource: group([removedLocally, removedRemotely]) });
  const local = await f.db.get('GenerateSource').find(removedLocally.id);
  await f.db.write(() => local.markAsDeleted());
  await f.sync({ GenerateSource: group([removedLocally, removedRemotely]) });
  assert.deepEqual(await f.db.adapter.getDeletedRecords('GenerateSource'), [removedLocally.id]);
  assert.equal(local._raw._status, 'deleted');
  assert.equal(await f.db.get('GenerateSource').query().fetchCount(), 1, 'the local tombstone must stay hidden from UI queries');
  await f.sync({ GenerateSource: group([], [], [removedLocally.id, removedRemotely.id]) });
  assert.deepEqual(await f.db.adapter.getDeletedRecords('GenerateSource'), []);
  assert.equal(await f.db.get('GenerateSource').query().fetchCount(), 0);
  assert.deepEqual(f.errors, []);
});

test('conflicting IDs, malformed raw records and a different actor are rejected before any SQLite mutation', async (t) => {
  const f = await fixture(t), row = company();
  await f.sync({ Company: group([row]) });
  const cursor = await getLastPulledAt(f.db);
  const invalid = [
    { Company: group([row], [{ ...row, name: 'Conflito' }]) },
    { Company: group([row], [], [row.id]) },
    { Company: group([{ ...row, _status: 'synced' }]) },
    { Company: group([{ ...row, _changed: '' }]) },
    { Company: group([{ ...row, id: '' }]) },
    { Company: { created: [row], updated: null, deleted: [] } },
    { SyncOperation: group([{ id: 'journal-is-not-catalog' }]) },
    { Company: group([{ ...row, name: 'Não pode aplicar parcialmente' }]), GenerateSource: group([source(undefined, { user_id: '22' })]) },
  ];
  for (const changes of invalid) {
    await assert.rejects(f.sync(changes), (error) => error.code?.startsWith('MOBILE_CATALOG_'));
    assert.equal((await f.db.get('Company').find(row.id)).name, row.name);
    assert.equal(await getLastPulledAt(f.db), cursor, 'a rejected response must not advance the pull cursor');
  }
  assert.deepEqual(f.errors, []);
});

test('workspace/hierarchy relationship rows may omit user_id but invalid payload actor IDs cannot be adopted', () => {
  const relationship = { id: 'workspace-hierarchy', workspaceId: 'workspace', hierarchyId: 'hierarchy' };
  assert.deepEqual(catalogChangesForUpsert({ MMWorkspaceHierarchy: group([relationship]) }, 11), {
    MMWorkspaceHierarchy: group([], [relationship]),
  });
  for (const actor of [undefined, null, 0, -1, NaN, '11']) assert.throws(() => catalogChangesForUpsert({}, actor), /catálogo recebido é inválido/);
  assert.throws(() => catalogChangesForUpsert({ Company: group([{ ...company(), user_id: '22' }]) }, 11),
    (error) => error.code === 'MOBILE_CATALOG_ACTOR_MISMATCH');
});

test('cancelling a catalog refresh before its late response cannot apply an upsert or advance its cursor', async (t) => {
  const f = await fixture(t), row = company();
  await f.sync({ Company: group([row]) });
  const cursor = await getLastPulledAt(f.db), gate = new VisitRefreshGate();
  let release, started;
  const received = new Promise((resolve) => { release = resolve; });
  const awaiting = new Promise((resolve) => { started = resolve; });
  let endApplying;
  const sync = synchronize({ database: f.db, sendCreatedAsUpdated: true, pullChanges: async () => {
    started(); await received; gate.assertActive();
    const changes = catalogChangesForUpsert({ Company: group([{ ...row, name: 'Resposta atrasada' }]) }, 11);
    endApplying = gate.begin(); return { changes, timestamp: cursor + 1 };
  } });
  const rejected = assert.rejects(sync, (error) => error.code === 'VISIT_REFRESH_CANCELLED');
  await awaiting; await gate.stop(); release(); await rejected; endApplying?.();
  assert.equal((await f.db.get('Company').find(row.id)).name, row.name);
  assert.equal(await getLastPulledAt(f.db), cursor); assert.deepEqual(f.errors, []);
});

test('integer API employees keep stable string SQLite identity, numeric apiId and local edits across refresh and deletion', async (t) => {
  const f = await fixture(t), row = { id: 42, apiId: 42, name: 'Empregado sintético', cpf: '00000000000',
    companyId: randomUUID(), hierarchyId: randomUUID(), user_id: '11', created_at: 1, updated_at: 2 };
  await f.sync({ Employee: group([row]) });
  const employee = await f.db.get('Employee').find('42');
  assert.equal(employee.id, '42'); assert.equal(employee.apiId, 42);
  await f.db.write(() => employee.update((r) => { r.name = 'Nome coletado offline'; }));
  await f.sync({ Employee: group([row]) });
  await f.sync({ Employee: group([], [{ ...row, apiId: undefined, socialName: 'Recebido depois' }]) });
  assert.equal(await f.db.get('Employee').query().fetchCount(), 1);
  assert.equal(employee.name, 'Nome coletado offline'); assert.equal(employee.socialName, 'Recebido depois');
  assert.equal(employee.apiId, 42);
  require('./database-binding.cjs').bindDatabase(f.db);
  const { EmployeeRepository } = require('../../src/repositories/employeeRepository.ts');
  assert.equal((await new EmployeeRepository().findByIds({ ids: ['42'] })).employees[0].id, '42');
  await f.sync({ Employee: group([], [], [42]) });
  assert.equal(await f.db.get('Employee').query().fetchCount(), 0);
  assert.deepEqual(f.errors, []);
});

test('employee ID adaptation rejects invalid numbers, inconsistent apiId and normalized collisions without weakening other tables or actors', async (t) => {
  const f = await fixture(t), employee = { id: 42, apiId: 42, user_id: '11', name: 'Empregado sintético' };
  const invalid = [
    ...[0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1].map((id) => ({ Employee: group([{ ...employee, id, apiId: id }]) })),
    { Employee: group([{ ...employee, apiId: 43 }]) },
    { Employee: group([employee], [{ ...employee, id: '42' }]) },
    { Employee: group([employee], [], ['42']) },
    { Employee: group([{ ...employee, user_id: '22' }]) },
    { Company: group([company(undefined, { id: 42 })]) },
  ];
  for (const changes of invalid) {
    await assert.rejects(f.sync(changes), (error) => error.code?.startsWith('MOBILE_CATALOG_'));
    assert.equal(await f.db.get('Employee').query().fetchCount(), 0);
    assert.equal(await getLastPulledAt(f.db), null);
  }
  assert.deepEqual(f.errors, []);
});
