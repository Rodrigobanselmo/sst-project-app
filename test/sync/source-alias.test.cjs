require('../register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { openDatabase } = require('./watermelon-fixture.cjs');

test('two accepted condition splits advance the API alias while preserving local identity, controls and a clean pull without duplicates', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'simplesst-source-alias-')), opened = await openDatabase(join(directory, 'visit.db'));
  require('./database-binding.cjs').bindDatabase(opened.db);
  t.after(() => { opened.close(); rmSync(directory, { recursive: true, force: true }); });
  const { SyncJournal } = require('../../src/libs/sync/journal.ts');
  const { CharacterizationRepository } = require('../../src/repositories/characterizationRepository.ts');
  const { CompanyRepository } = require('../../src/repositories/companyRepository.ts');
  const { RiskDataRepository } = require('../../src/repositories/riskDataRepository.ts');
  const { captureVisit, riskSnapshot, characterizationSnapshot } = require('../../src/libs/sync/planner.ts');
  const { acknowledgeSourceIds } = require('../../src/libs/sync/acknowledgeSources.ts');
  const { pullCharacterizations } = require('../../src/libs/sync/pull.ts');
  const { setPullResponse } = require('./pull-http-boundary.cjs');
  const companyId = randomUUID(), workspaceId = randomUUID(), parentId = randomUUID(), originalId = randomUUID(), firstSuccessor = randomUUID(), secondSuccessor = randomUUID();
  const db = opened.db, context = { userId: 11, companyId, workspaceId, deviceId: randomUUID() };
  await db.localStorage.set('mobile-sync-device-v1', context.deviceId);
  const journal = new SyncJournal(opened.storage, context, { id: randomUUID, now: () => new Date().toISOString() });
  await db.write(async () => {
    await db.get('Company').create((row) => { row._raw.id = companyId; row.apiId = companyId; row.name = 'Empresa'; row.cnpj = '11222333000181'; row.fantasy = 'Teste'; row.logoUrl = ''; row.userId = '11'; row.created_at = new Date(); row.updated_at = new Date(); });
    await db.get('Workspace').create((row) => { row._raw.id = workspaceId; row.apiId = workspaceId; row.name = 'Unidade'; row.companyId = companyId; row.userId = '11'; row.created_at = new Date(); row.updated_at = new Date(); });
  });
  const parents = new CharacterizationRepository(), risks = new RiskDataRepository(), companies = new CompanyRepository();
  await parents.create({ id: parentId, name: 'Condição coletada', type: 'GENERAL', workspaceId, userId: 11 });
  await risks.createRiskDataWithRecMedGs([{ id: originalId, riskId: 'noise-source', probability: 2, exposure: 'CP', episToRiskData: [{ id: '3', name: 'Protetor', description: '999999', efficientlyCheck: false }] }], parentId, 11);
  const initial = (await companies.getAll(workspaceId, 11)).characterizations[0], parentSnapshot = characterizationSnapshot(initial.characterization, []);
  await journal.setBase('CHARACTERIZATION', parentId, { baseSnapshotHash: 'a'.repeat(64), snapshot: parentSnapshot, localSnapshot: parentSnapshot });
  const initialRisk = riskSnapshot(initial.riskData[0]);
  await journal.setBase('RISK_DATA', originalId, { baseSnapshotHash: 'a'.repeat(64), snapshot: initialRisk, localSnapshot: initialRisk });
  const remote = (target, snapshot, probability, hash) => ({ fullSnapshot: true, latestVersion: Date.now(), characterizations: [{ ...parentSnapshot, companyId, workspaceId, created_at: new Date(), updated_at: new Date(),
    homogeneousGroup: { hierarchyOnHomogeneous: [], riskFactorData: [{ id: target, riskId: 'noise-source', homogeneousGroupId: parentId, probability, probabilityAfter: null, exposure: 'CP', activities: null,
      adms: [], recs: [], generateSources: [], engsToRiskFactorData: [], updatedAt: new Date(), epiToRiskFactorData: [{ epiId: 3, efficientlyCheck: false, epi: { equipment: 'Protetor', ca: '999999' } }],
      mobileSync: { baseSnapshotHash: hash, snapshot } }] }, mobileSync: { baseSnapshotHash: 'a'.repeat(64), snapshot: parentSnapshot } }] });
  let canonicalSnapshot;
  for (const [index, target] of [firstSuccessor, secondSuccessor].entries()) {
    await risks.update(originalId, { riskId: 'noise-source', probability: 3 + index });
    await captureVisit(journal);
    const operation = (await journal.read()).entries.filter((entry) => entry.operation.kind === 'RISK_DATA').at(-1).operation;
    assert.equal(operation.entityId, originalId); assert.equal(operation.baseSnapshotHash, (index ? 'b' : 'a').repeat(64));
    const current = (await companies.getAll(workspaceId, 11)).characterizations[0].riskData[0];
    canonicalSnapshot = { ...riskSnapshot(current), id: target, startDate: index ? '2026-04-01' : '2026-03-01' };
    if (index === 0) {
      const cursorKey = `mobile-sync-pull-v1:11:${companyId}:${workspaceId}`, oldCursor = '2026-02-01T00:00:00.000Z';
      await db.localStorage.set(cursorKey, oldCursor);
      setPullResponse(async () => remote(target, canonicalSnapshot, 3, 'b'.repeat(64)));
      await pullCharacterizations({ userId: 11, companyId, workspaceId });
      const unresolved = (await companies.getAll(workspaceId, 11)).characterizations[0].riskData;
      assert.equal(unresolved.length, 1); assert.equal(unresolved[0].id, originalId);
      assert.equal((await journal.read()).entries.filter((entry) => entry.operation.kind === 'RISK_DATA').length, 1);
      assert.equal((await journal.read()).entries.find((entry) => entry.operation.operationId === operation.operationId).receipt.state, 'PENDING');
      assert.equal(await db.localStorage.get(cursorKey), oldCursor, 'a lost POST acknowledgement must defer the pull cursor until the API alias can be resolved');
    }
    await journal.updateReceipt({ operationId: operation.operationId, kind: operation.kind, entityId: operation.entityId, state: 'APPLIED', durable: true, receivedAt: new Date().toISOString(), appliedAt: new Date().toISOString(), result: { id: target }, baseSnapshotHash: (index ? 'c' : 'b').repeat(64), snapshot: canonicalSnapshot });
    await acknowledgeSourceIds(journal);
    const saved = await db.get('RiskData').find(originalId);
    assert.equal(saved.apiId, target); assert.equal(saved.id, originalId);
  }
  setPullResponse(async () => remote(secondSuccessor, canonicalSnapshot, 4, 'c'.repeat(64)));
  await pullCharacterizations({ userId: 11, companyId, workspaceId });
  const visible = (await companies.getAll(workspaceId, 11)).characterizations[0].riskData;
  assert.equal(visible.length, 1); assert.equal(visible[0].id, originalId); assert.equal(visible[0].apiId, secondSuccessor);
  assert.equal(visible[0].episToRiskData.length, 1); assert.equal(visible[0].episToRiskData[0].efficientlyCheck, false);
  const entries = (await journal.read()).entries.filter((entry) => entry.operation.kind === 'RISK_DATA');
  assert.equal(entries.length, 2, JSON.stringify(entries.map((entry) => ({ operation: entry.operation, state: entry.receipt.state })))); assert.ok(entries.every((entry) => entry.receipt.state === 'APPLIED'));
});
