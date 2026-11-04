require('../register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { openDatabase } = require('./watermelon-fixture.cjs');

function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

async function databaseFile(t) {
  const directory = mkdtempSync(join(tmpdir(), 'simplesst-visit-refresh-'));
  let opened = await openDatabase(join(directory, 'visit.db'));
  t.after(() => { opened.close(); rmSync(directory, { recursive: true, force: true }); });
  return {
    get db() { return opened.db; },
    get storage() { return opened.storage; },
    async reopen() { opened.close(); opened = await openDatabase(join(directory, 'visit.db')); return opened.db; },
  };
}

const context = () => ({ userId: 11, companyId: randomUUID(), workspaceId: randomUUID() });

async function seedLocalVisit(file, ctx) {
  const id = randomUUID();
  await file.db.write(async () => {
    await file.db.get('Workspace').create((row) => {
      row._raw.id = ctx.workspaceId; row.apiId = ctx.workspaceId; row.companyId = ctx.companyId;
      row.userId = String(ctx.userId); row.name = 'Unidade já coletada'; row.created_at = new Date(); row.updated_at = new Date();
    });
    await file.db.get('CompanyCharacterization').create((row) => {
      row._raw.id = id; row.name = 'Coleta local que precisa continuar disponível'; row.type = 'GENERAL';
      row.apiId = ''; row.userId = String(ctx.userId); row.workspaceId = ctx.workspaceId;
      row.description = 'Dados existentes antes da tentativa de atualização'; row.created_at = new Date(); row.updated_at = new Date();
    });
  });
  return id;
}

function controller(file, ctx, overrides = {}) {
  const { VisitFreshnessController } = require('../../src/libs/sync/visitFreshness.ts');
  const { Q } = require('@nozbe/watermelondb');
  return new VisitFreshnessController(ctx, {
    storage: { get: (key) => file.db.localStorage.get(key), set: (key, value) => file.db.localStorage.set(key, value) },
    connected: async () => true,
    hasLocalSnapshot: async () => {
      const workspaces = await file.db.get('Workspace').query(Q.where('id', ctx.workspaceId), Q.where('companyId', ctx.companyId), Q.where('user_id', String(ctx.userId))).fetch();
      if (!workspaces.length) return false;
      return (await file.db.get('CompanyCharacterization').query(Q.where('workspaceId', ctx.workspaceId), Q.where('user_id', String(ctx.userId))).fetchCount()) > 0;
    },
    refreshCatalogs: async () => {},
    refreshVisit: async () => ({ complete: true }),
    now: () => '2026-10-24T15:00:00.000Z',
    id: randomUUID,
    ...overrides,
  });
}

test('records full refresh success only after both stages finish and restores it from the same Watermelon SQLite file', async (t) => {
  const { visitFreshnessKey } = require('../../src/libs/sync/visitFreshness.ts');
  const file = await databaseFile(t), ctx = context(), localId = await seedLocalVisit(file, ctx);
  const localBefore = { ...(await file.db.get('CompanyCharacterization').find(localId))._raw };
  const cursorKey = `mobile-sync-pull-v1:${ctx.userId}:${ctx.companyId}:${ctx.workspaceId}`;
  await file.db.localStorage.set(cursorKey, '2026-10-01T00:00:00.000Z');
  const catalogsStarted = deferred(), catalogs = deferred(), visitStarted = deferred(), visit = deferred();
  let now = '2026-10-24T15:00:00.000Z';
  const refreshing = controller(file, ctx, {
    refreshCatalogs: async () => { catalogsStarted.resolve(); await catalogs.promise; },
    refreshVisit: async () => { visitStarted.resolve(); return visit.promise; },
    now: () => now,
  });
  const run = refreshing.start();
  await catalogsStarted.promise;
  assert.equal(refreshing.current.phase, 'refreshing');
  assert.equal(refreshing.current.lastSuccessfulAt, undefined);
  assert.equal((await file.db.localStorage.get(visitFreshnessKey(ctx)))?.lastSuccessfulAt, undefined);
  catalogs.resolve();
  await visitStarted.promise;
  assert.equal(refreshing.current.lastSuccessfulAt, undefined, 'catalog success alone is not a full visit refresh');
  assert.equal((await file.db.localStorage.get(visitFreshnessKey(ctx)))?.lastSuccessfulAt, undefined);
  now = '2026-10-24T15:02:00.000Z';
  visit.resolve({ complete: true });
  await run;
  assert.equal(refreshing.current.phase, 'fresh');
  assert.equal(refreshing.current.lastSuccessfulAt, now);
  assert.equal(refreshing.current.hasLocalSnapshot, true);
  await refreshing.dispose();
  await file.reopen();
  let requests = 0;
  const restored = controller(file, ctx, { connected: async () => false, refreshCatalogs: async () => { requests++; } });
  await restored.start();
  assert.equal(restored.current.phase, 'offline');
  assert.equal(restored.current.lastSuccessfulAt, now);
  assert.equal(restored.current.hasLocalSnapshot, true);
  assert.equal(requests, 0);
  assert.deepEqual({ ...(await file.db.get('CompanyCharacterization').find(localId))._raw }, localBefore, 'metadata must not reset or rewrite existing visits or dirty flags');
  assert.equal(await file.db.localStorage.get(cursorKey), '2026-10-01T00:00:00.000Z', 'freshness metadata is separate from the server pull cursor');
});

test('offline, failed, partial and explicitly skipped refreshes preserve the previous full success and local collection', async (t) => {
  const file = await databaseFile(t), ctx = context(), localId = await seedLocalVisit(file, ctx);
  let mode = 'success', now = '2026-10-01T12:00:00.000Z', catalogCalls = 0, visitCalls = 0;
  const refreshing = controller(file, ctx, {
    connected: async () => mode !== 'offline',
    refreshCatalogs: async () => { catalogCalls++; if (mode === 'catalogFailure') throw new Error('SYNTHETIC_CATALOG_FAILURE'); },
    refreshVisit: async () => {
      visitCalls++;
      if (mode === 'visitFailure') throw new Error('SYNTHETIC_VISIT_FAILURE');
      return { complete: mode !== 'partial', pendingLocalChanges: mode === 'pending' };
    },
    now: () => now,
  });
  await refreshing.start();
  const successful = refreshing.current.lastSuccessfulAt;
  const localBefore = { ...(await file.db.get('CompanyCharacterization').find(localId))._raw };
  assert.equal(successful, now);
  now = '2026-10-24T15:00:00.000Z';
  for (const [nextMode, phase] of [['offline', 'offline'], ['catalogFailure', 'failed'], ['visitFailure', 'failed'], ['partial', 'partial'], ['pending', 'partial']]) {
    mode = nextMode;
    await refreshing.retry();
    assert.equal(refreshing.current.phase, phase, nextMode);
    assert.equal(refreshing.current.lastSuccessfulAt, successful, nextMode + ' must not claim newer successful data');
    assert.equal(refreshing.current.hasLocalSnapshot, true);
    assert.deepEqual({ ...(await file.db.get('CompanyCharacterization').find(localId))._raw }, localBefore);
  }
  assert.equal(catalogCalls, 5, 'offline retry must not attempt a catalog request');
  assert.equal(visitCalls, 4, 'failed catalogs must stop the full refresh before requesting characterizations');
  await refreshing.continueWithoutRefresh();
  assert.equal(refreshing.current.phase, 'skipped');
  assert.equal(refreshing.current.lastSuccessfulAt, successful);
  await refreshing.dispose();
  await file.reopen();
  const restored = controller(file, ctx, { connected: async () => false });
  await restored.start();
  assert.equal(restored.current.lastSuccessfulAt, successful);
  assert.equal(restored.current.phase, 'offline');
});

test('a first visit without any local snapshot can continue offline without inventing freshness', async (t) => {
  const file = await databaseFile(t), ctx = context();
  let requests = 0;
  const refreshing = controller(file, ctx, {
    connected: async () => false,
    refreshCatalogs: async () => { requests++; },
    refreshVisit: async () => { requests++; return { complete: true }; },
  });
  await refreshing.start();
  assert.equal(refreshing.current.phase, 'offline');
  assert.equal(refreshing.current.hasLocalSnapshot, false);
  assert.equal(refreshing.current.lastSuccessfulAt, undefined);
  await refreshing.continueWithoutRefresh();
  assert.equal(refreshing.current.phase, 'skipped');
  assert.equal(refreshing.current.hasLocalSnapshot, false);
  assert.equal(refreshing.current.lastSuccessfulAt, undefined);
  assert.equal(requests, 0);
});

test('continue returns while the network is pending and blocks its late writes and false freshness', async (t) => {
  const file = await databaseFile(t), ctx = context(), localId = await seedLocalVisit(file, ctx);
  const started = deferred(), remote = deferred();
  let gate, lateWrites = 0;
  const refreshing = controller(file, ctx, {
    refreshVisit: async (activeGate) => {
      gate = activeGate; started.resolve(); await remote.promise;
      await activeGate.run(async () => {
        lateWrites++;
        await file.db.write(async () => {
          const row = await file.db.get('CompanyCharacterization').find(localId);
          await row.update(() => { row.name = 'Resposta antiga que não pode ser aplicada'; });
        });
      });
      return { complete: true };
    },
  });
  const run = refreshing.start();
  await started.promise;
  await refreshing.continueWithoutRefresh();
  assert.equal(refreshing.current.phase, 'skipped');
  assert.equal(gate.active, false);
  assert.equal(gate.signal.aborted, true);
  await file.db.write(async () => {
    const row = await file.db.get('CompanyCharacterization').find(localId);
    await row.update(() => { row.name = 'Coleta iniciada depois de continuar'; });
  });
  remote.resolve();
  await run;
  assert.equal(lateWrites, 0);
  assert.equal(refreshing.current.phase, 'skipped');
  assert.equal(refreshing.current.lastSuccessfulAt, undefined);
  assert.equal((await file.db.get('CompanyCharacterization').find(localId)).name, 'Coleta iniciada depois de continuar');
  await refreshing.dispose();
  await file.reopen();
  const restored = controller(file, ctx, { connected: async () => false });
  await restored.start();
  assert.equal(restored.current.lastSuccessfulAt, undefined);
  assert.equal((await file.db.get('CompanyCharacterization').find(localId)).name, 'Coleta iniciada depois de continuar');
});

test('continuing during the catalog request prevents the downstream characterization refresh', async (t) => {
  const file = await databaseFile(t), ctx = context();
  await seedLocalVisit(file, ctx);
  const started = deferred(), catalogResponse = deferred();
  let visitRequests = 0;
  const refreshing = controller(file, ctx, {
    refreshCatalogs: async () => { started.resolve(); await catalogResponse.promise; },
    refreshVisit: async () => { visitRequests++; return { complete: true }; },
  });
  const run = refreshing.start();
  await started.promise;
  await refreshing.continueWithoutRefresh();
  assert.equal(refreshing.current.phase, 'skipped');
  catalogResponse.resolve();
  await run;
  assert.equal(visitRequests, 0);
  assert.equal(refreshing.current.phase, 'skipped');
  assert.equal(refreshing.current.lastSuccessfulAt, undefined);
});

test('failure saving the completion status cannot claim freshness or prevent continuing with the local visit', async (t) => {
  const file = await databaseFile(t), ctx = context(), localId = await seedLocalVisit(file, ctx);
  const initial = controller(file, ctx, { now: () => '2026-10-01T12:00:00.000Z' });
  await initial.start();
  const successful = initial.current.lastSuccessfulAt;
  await initial.dispose();
  let failEveryWrite = false, requests = 0;
  const refreshing = controller(file, ctx, {
    storage: {
      get: (key) => file.db.localStorage.get(key),
      set: async (key, value) => {
        if (failEveryWrite || value.lastSuccessfulAt !== successful) throw new Error('SYNTHETIC_LOCAL_STATUS_WRITE_FAILURE');
        await file.db.localStorage.set(key, value);
      },
    },
    refreshVisit: async () => { requests++; return { complete: true }; },
  });
  await refreshing.start();
  assert.equal(requests, 1, 'the simulated failure happens while saving the successful completion');
  assert.equal(refreshing.current.phase, 'failed');
  assert.equal(refreshing.current.lastSuccessfulAt, successful);
  failEveryWrite = true;
  await refreshing.continueWithoutRefresh();
  assert.equal(refreshing.current.phase, 'skipped');
  assert.equal(refreshing.current.lastSuccessfulAt, successful);
  assert.equal((await file.db.get('CompanyCharacterization').find(localId)).description, 'Dados existentes antes da tentativa de atualização');
  await refreshing.dispose();
  await file.reopen();
  const restored = controller(file, ctx, { connected: async () => false });
  await restored.start();
  assert.equal(restored.current.lastSuccessfulAt, successful);
});

test('an earlier request resolving after retry cannot overwrite the new visit or its success timestamp', async (t) => {
  const file = await databaseFile(t), ctx = context(), localId = await seedLocalVisit(file, ctx);
  const firstStarted = deferred(), firstRemote = deferred();
  let visits = 0, now = '2026-10-24T15:00:00.000Z', earlierGate;
  const refreshing = controller(file, ctx, {
    now: () => now,
    refreshVisit: async (gate) => {
      const attempt = ++visits;
      if (attempt === 1) { earlierGate = gate; firstStarted.resolve(); await firstRemote.promise; }
      await gate.run(() => file.db.write(async () => {
        const row = await file.db.get('CompanyCharacterization').find(localId);
        await row.update(() => { row.name = attempt === 1 ? 'Resposta antiga' : 'Resposta mais recente'; });
      }));
      return { complete: true };
    },
  });
  const first = refreshing.start();
  await firstStarted.promise;
  await refreshing.continueWithoutRefresh();
  now = '2026-10-24T15:05:00.000Z';
  await refreshing.retry();
  assert.equal(visits, 2);
  assert.equal(earlierGate.active, false);
  assert.equal(refreshing.current.phase, 'fresh');
  assert.equal(refreshing.current.lastSuccessfulAt, now);
  const success = refreshing.current.lastSuccessfulAt;
  now = '2026-10-24T15:10:00.000Z';
  firstRemote.resolve();
  await first;
  assert.equal(refreshing.current.phase, 'fresh');
  assert.equal(refreshing.current.lastSuccessfulAt, success);
  assert.equal((await file.db.get('CompanyCharacterization').find(localId)).name, 'Resposta mais recente');
  await refreshing.dispose();
  await file.reopen();
  const restored = controller(file, ctx, { connected: async () => false });
  await restored.start();
  assert.equal(restored.current.lastSuccessfulAt, success);
});

test('freshness is isolated by user, company and workspace in persisted storage', async (t) => {
  const { visitFreshnessKey } = require('../../src/libs/sync/visitFreshness.ts');
  const file = await databaseFile(t), ctx = context();
  await seedLocalVisit(file, ctx);
  const original = controller(file, ctx);
  await original.start();
  const successful = original.current.lastSuccessfulAt;
  await original.dispose();
  const others = [{ ...ctx, userId: 12 }, { ...ctx, companyId: randomUUID() }, { ...ctx, workspaceId: randomUUID() }];
  assert.equal(new Set([ctx, ...others].map(visitFreshnessKey)).size, 4);
  for (const other of others) {
    const isolated = controller(file, other, { connected: async () => false });
    await isolated.start();
    assert.equal(isolated.current.phase, 'offline');
    assert.equal(isolated.current.lastSuccessfulAt, undefined);
    assert.equal(isolated.current.hasLocalSnapshot, false);
    await isolated.dispose();
  }
  await file.reopen();
  const sameVisit = controller(file, { ...ctx }, { connected: async () => false });
  await sameVisit.start();
  assert.equal(sameVisit.current.lastSuccessfulAt, successful);
  assert.equal(sameVisit.current.hasLocalSnapshot, true);
});

test('stopping the visit gate aborts pending network but waits for an already admitted local write', async () => {
  const { VisitRefreshGate } = require('../../src/libs/sync/visitFreshness.ts');
  const gate = new VisitRefreshGate(), entered = deferred(), release = deferred();
  let committed = false, stopped = false, invalidWrite = false;
  const writer = gate.run(async () => { entered.resolve(); await release.promise; committed = true; });
  await entered.promise;
  const stopping = gate.stop().then(() => { stopped = true; });
  assert.equal(gate.active, false);
  assert.equal(gate.signal.aborted, true);
  assert.throws(() => gate.assertActive());
  await assert.rejects(gate.run(async () => { invalidWrite = true; }));
  await Promise.resolve();
  assert.equal(stopped, false, 'allowing local collection must wait for the active database writer');
  assert.equal(committed, false);
  assert.equal(invalidWrite, false);
  release.resolve();
  await writer;
  await stopping;
  assert.equal(stopped, true);
  assert.equal(committed, true);
});

test('a late remote visit refresh preserves edits made after continuing with local data', async (t) => {
  const file = await databaseFile(t), db = file.db;
  require('./database-binding.cjs').bindDatabase(db);
  const { CharacterizationRepository } = require('../../src/repositories/characterizationRepository.ts');
  const { RiskDataRepository } = require('../../src/repositories/riskDataRepository.ts');
  const { CompanyRepository } = require('../../src/repositories/companyRepository.ts');
  const { createSyncJournal } = require('../../src/libs/sync/storage.ts');
  const { characterizationSnapshot, riskSnapshot } = require('../../src/libs/sync/planner.ts');
  const { pullCharacterizations, onGenerateSyncCharacterizatinKey } = require('../../src/libs/sync/pull.ts');
  const { setPullResponse } = require('./pull-http-boundary.cjs');
  const context = { userId: 11, companyId: randomUUID(), workspaceId: randomUUID() };
  const parents = new CharacterizationRepository(), risks = new RiskDataRepository(), companies = new CompanyRepository();
  await db.write(async () => {
    await db.get('Company').create((row) => {
      row._raw.id = context.companyId; row.apiId = context.companyId; row.name = 'Empresa sintética';
      row.cnpj = '11222333000181'; row.fantasy = 'Teste'; row.logoUrl = ''; row.userId = '11';
      row.created_at = new Date(); row.updated_at = new Date();
    });
    await db.get('Workspace').create((row) => {
      row._raw.id = context.workspaceId; row.apiId = context.workspaceId; row.name = 'Unidade sintética';
      row.companyId = context.companyId; row.userId = '11'; row.created_at = new Date(); row.updated_at = new Date();
    });
  });
  const parent = await parents.create({ id: randomUUID(), name: 'Base recebida antes da visita', type: 'GENERAL', workspaceId: context.workspaceId, userId: 11 });
  const riskId = randomUUID();
  await risks.createRiskDataWithRecMedGs([{ id: riskId, riskId: 'noise-risk', probability: 2, exposure: 'CP' }], parent.id, 11);
  const initial = (await companies.getAll(context.workspaceId, 11)).characterizations[0];
  const parentBase = characterizationSnapshot(initial.characterization, []), riskBase = riskSnapshot(initial.riskData[0]);
  const journal = await createSyncJournal(context);
  await journal.setBase('CHARACTERIZATION', parent.id, { baseSnapshotHash: 'a'.repeat(64), snapshot: parentBase, localSnapshot: parentBase });
  await journal.setBase('RISK_DATA', riskId, { baseSnapshotHash: 'b'.repeat(64), snapshot: riskBase, localSnapshot: riskBase });
  const cursorKey = onGenerateSyncCharacterizatinKey(context), cursor = '2026-10-01T00:00:00.000Z';
  await db.localStorage.set(cursorKey, cursor);
  const started = deferred(), remote = deferred();
  setPullResponse(async () => { started.resolve(); return remote.promise; });
  const pulling = pullCharacterizations(context);
  await started.promise;
  await parents.update(parent.id, { name: 'Nome editado enquanto atualizava', description: 'Coleta local depois de continuar' });
  await risks.update(riskId, { riskId: 'noise-risk', probability: 4 });
  remote.resolve({ fullSnapshot: true, latestVersion: '2026-10-24T15:00:00.000Z', characterizations: [{
    ...parentBase, name: 'Resposta tardia da API', description: 'Não substituir a coleta', created_at: new Date(), updated_at: new Date(),
    homogeneousGroup: { hierarchyOnHomogeneous: [], riskFactorData: [{
      ...riskBase, probability: 1, updatedAt: new Date(), activities: null,
      adms: [], recs: [], generateSources: [], engsToRiskFactorData: [], epiToRiskFactorData: [],
      mobileSync: { baseSnapshotHash: 'c'.repeat(64), snapshot: { ...riskBase, probability: 1 } },
    }] }, mobileSync: { baseSnapshotHash: 'd'.repeat(64), snapshot: { ...parentBase, name: 'Resposta tardia da API' } },
  }] });
  const result = await pulling;
  assert.equal(result.complete, false, 'preserving in-flight local changes must not report a complete refresh');
  assert.equal(result.pendingLocalChanges, true);
  const saved = await parents.findOne(parent.id);
  assert.equal(saved.characterization.id, parent.id);
  assert.equal(saved.characterization.name, 'Nome editado enquanto atualizava');
  assert.equal(saved.characterization.description, 'Coleta local depois de continuar');
  assert.equal(saved.riskData.length, 1);
  assert.equal(saved.riskData[0].id, riskId);
  assert.equal(saved.riskData[0].probability, 4);
  const document = await journal.read();
  assert.equal(document.bases[`CHARACTERIZATION:${parent.id}`].baseSnapshotHash, 'a'.repeat(64));
  assert.equal(document.bases[`RISK_DATA:${riskId}`].baseSnapshotHash, 'b'.repeat(64));
  assert.ok(document.entries.some((entry) => entry.operation.entityId === parent.id && entry.operation.payload.name === 'Nome editado enquanto atualizava' && entry.receipt.state === 'PENDING'));
  assert.ok(document.entries.some((entry) => entry.operation.entityId === riskId && entry.operation.payload.probability === 4 && entry.receipt.state === 'PENDING'));

  const beforeFailure = JSON.stringify(saved.characterization._raw), beforeCursor = await db.localStorage.get(cursorKey);
  setPullResponse(async () => { throw new Error('SYNTHETIC_NETWORK_FAILURE'); });
  await assert.rejects(pullCharacterizations(context), /SYNTHETIC_NETWORK_FAILURE/);
  assert.equal(JSON.stringify((await parents.findOne(parent.id)).characterization._raw), beforeFailure);
  assert.equal(await db.localStorage.get(cursorKey), beforeCursor);

  const cancelledStarted = deferred(), cancelledRemote = deferred(), lateRemoteId = randomUUID();
  setPullResponse(async () => { cancelledStarted.resolve(); return cancelledRemote.promise; });
  const gated = controller(file, context, { refreshVisit: (refreshGate) => pullCharacterizations({ ...context, refreshGate }) });
  const cancelledRun = gated.start();
  await cancelledStarted.promise;
  await gated.continueWithoutRefresh();
  assert.equal(gated.current.phase, 'skipped');
  await parents.update(parent.id, { description: 'Coleta feita após continuar explicitamente' });
  cancelledRemote.resolve({ latestVersion: '2026-10-24T18:00:00.000Z', characterizations: [{
    id: lateRemoteId, name: 'Novo cadastro de uma resposta cancelada', type: 'GENERAL', created_at: new Date(), updated_at: new Date(),
    homogeneousGroup: { hierarchyOnHomogeneous: [], riskFactorData: [] },
  }] });
  await cancelledRun;
  assert.equal(gated.current.phase, 'skipped');
  assert.equal(gated.current.lastSuccessfulAt, undefined);
  assert.equal((await parents.findOne(parent.id)).characterization.description, 'Coleta feita após continuar explicitamente');
  assert.equal((await parents.findAllByWorkspace(context)).characterizations.some((row) => row.id === lateRemoteId), false, 'the real pull must not apply even clean new records from the cancelled response');
  assert.equal(await db.localStorage.get(cursorKey), beforeCursor);
  await gated.dispose();

  await t.test('a full snapshot omitting a locally edited risk remains partial before the request and during its response', async () => {
    for (const editWhen of ['beforeRequest', 'duringRequest']) {
      const missingContext = { ...context, workspaceId: randomUUID() };
      const missingParentId = await seedLocalVisit(file, missingContext);
      const missingParent = (await parents.findOne(missingParentId)).characterization;
      const missingJournal = await createSyncJournal(missingContext), missingCursorKey = onGenerateSyncCharacterizatinKey(missingContext);
      const missingRiskId = randomUUID();
      await risks.createRiskDataWithRecMedGs([{ id: missingRiskId, riskId: 'missing-risk', probability: 2, exposure: 'CP' }], missingParent.id, 11);
      const original = (await companies.getAll(missingContext.workspaceId, 11)).characterizations.find((row) => row.characterization.id === missingParent.id);
      const originalParent = characterizationSnapshot(original.characterization, []), originalRisk = riskSnapshot(original.riskData[0]);
      await missingJournal.setBase('CHARACTERIZATION', missingParent.id, { baseSnapshotHash: 'e'.repeat(64), snapshot: originalParent, localSnapshot: originalParent });
      await missingJournal.setBase('RISK_DATA', missingRiskId, { baseSnapshotHash: 'f'.repeat(64), snapshot: originalRisk, localSnapshot: originalRisk });
      const oldStamp = '2026-10-01T12:00:00.000Z', oldCursor = '2026-10-01T11:59:00.000Z';
      const response = (withRisk, version) => ({ fullSnapshot: true, latestVersion: version, characterizations: [{
        ...originalParent, created_at: new Date(), updated_at: new Date(),
        homogeneousGroup: { hierarchyOnHomogeneous: [], riskFactorData: withRisk ? [{
          ...originalRisk, updatedAt: new Date(), activities: null, adms: [], recs: [], generateSources: [], engsToRiskFactorData: [], epiToRiskFactorData: [],
          mobileSync: { baseSnapshotHash: 'f'.repeat(64), snapshot: originalRisk },
        }] : [] }, mobileSync: { baseSnapshotHash: 'e'.repeat(64), snapshot: originalParent },
      }] });
      let timestamp = oldStamp, pullResult;
      const refreshing = controller(file, missingContext, {
        now: () => timestamp,
        refreshVisit: async (refreshGate) => { pullResult = await pullCharacterizations({ ...missingContext, refreshGate }); return pullResult; },
      });
      setPullResponse(async () => response(true, oldCursor));
      await refreshing.start();
      assert.equal(refreshing.current.phase, 'fresh', editWhen + ': establish a known complete baseline');
      assert.equal(refreshing.current.lastSuccessfulAt, oldStamp);
      assert.equal(await db.localStorage.get(missingCursorKey), oldCursor);
      if (editWhen === 'beforeRequest') await risks.update(missingRiskId, { riskId: 'missing-risk', probability: 4 });
      setPullResponse(async () => {
        if (editWhen === 'duringRequest') await risks.update(missingRiskId, { riskId: 'missing-risk', probability: 4 });
        return response(false, '2026-10-24T18:30:00.000Z');
      });
      timestamp = '2026-10-24T18:31:00.000Z';
      await refreshing.retry();
      assert.equal(pullResult.complete, false, editWhen);
      assert.equal(pullResult.pendingLocalChanges, true, editWhen);
      assert.equal(refreshing.current.phase, 'partial', editWhen);
      assert.equal(refreshing.current.lastSuccessfulAt, oldStamp, editWhen);
      assert.equal(await db.localStorage.get(missingCursorKey), oldCursor, editWhen);
      const retained = (await parents.findOne(missingParent.id)).riskData;
      assert.equal(retained.length, 1, editWhen + ': the collected risk remains visible');
      assert.equal(retained[0].id, missingRiskId);
      assert.equal(retained[0].probability, 4);
      assert.ok((await missingJournal.read()).entries.some((entry) => entry.operation.entityId === missingRiskId && entry.operation.payload.probability === 4 && entry.receipt.state === 'PENDING'));
      await refreshing.dispose();
    }
  });

  const reopened = await file.reopen();
  assert.equal((await reopened.get('CompanyCharacterization').find(parent.id)).name, 'Nome editado enquanto atualizava');
  assert.equal((await reopened.get('CompanyCharacterization').find(parent.id)).description, 'Coleta feita após continuar explicitamente');
  assert.equal((await reopened.get('RiskData').find(riskId)).probability, 4);
  assert.equal(await reopened.localStorage.get(cursorKey), beforeCursor);
  const { SyncJournal } = require('../../src/libs/sync/journal.ts');
  const restored = await new SyncJournal(file.storage, journal.context, { id: randomUUID, now: () => new Date().toISOString() }).read();
  assert.ok(restored.entries.some((entry) => entry.operation.entityId === parent.id && entry.receipt.state === 'PENDING'));
  assert.ok(restored.entries.some((entry) => entry.operation.entityId === riskId && entry.receipt.state === 'PENDING'));
});
