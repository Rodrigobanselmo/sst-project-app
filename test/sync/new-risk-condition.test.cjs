require('../register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { openDatabase } = require('./watermelon-fixture.cjs');
const { bindDatabase } = require('./database-binding.cjs');
const { SyncJournal } = require('../../src/libs/sync/journal.ts');
let captureVisit, characterizationSnapshot, acknowledgeSourceIds, CharacterizationRepository, RiskDataRepository, CompanyRepository;
const { saveVisitDefaults, applyReviewDecisions, resumeVisitDecisionPlan, getReviewContext } = require('../../src/libs/sync/visitDecisions.ts');
const { runSync } = require('../../src/libs/sync/engine.ts');

const now = () => '2026-10-24T12:00:00.000Z';
const head = 'a'.repeat(64), reviewContextHash = 'b'.repeat(64);
const choice = { intent: 'NEW_CONDITION', effectiveFrom: '2026-04-01', reason: 'Nova exposição observada na revisita' };
const sealed = (request) => ({ planId: request.planId, head,
  operations: request.operations.map((operation) => ({ ...operation, decisionPlanId: request.planId,
    decision: { ...operation.decision, expectedHead: head } })) });

async function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'simplesst-new-risk-condition-')), filename = join(directory, 'visit.db');
  let opened = await openDatabase(filename);
  bindDatabase(opened.db);
  ({ captureVisit, characterizationSnapshot } = require('../../src/libs/sync/planner.ts'));
  ({ acknowledgeSourceIds } = require('../../src/libs/sync/acknowledgeSources.ts'));
  ({ CharacterizationRepository } = require('../../src/repositories/characterizationRepository.ts'));
  ({ RiskDataRepository } = require('../../src/repositories/riskDataRepository.ts'));
  ({ CompanyRepository } = require('../../src/repositories/companyRepository.ts'));
  const ctx = { userId: 11, companyId: randomUUID(), workspaceId: randomUUID(), deviceId: randomUUID() };
  await opened.db.localStorage.set('mobile-sync-device-v1', ctx.deviceId);
  const journal = () => new SyncJournal(opened.storage, ctx, { id: randomUUID, now });
  t.after(() => { opened.close(); rmSync(directory, { recursive: true, force: true }); });
  await opened.db.write(async () => {
    await opened.db.get('Company').create((row) => { row._raw.id = ctx.companyId; row.apiId = row.id; row.name = 'Empresa sintética'; row.cnpj = '11222333000181'; row.fantasy = 'Teste'; row.logoUrl = ''; row.userId = '11'; row.created_at = new Date(); row.updated_at = new Date(); });
    await opened.db.get('Workspace').create((row) => { row._raw.id = ctx.workspaceId; row.apiId = row.id; row.name = 'Unidade sintética'; row.companyId = ctx.companyId; row.userId = '11'; row.created_at = new Date(); row.updated_at = new Date(); });
  });
  const parent = await new CharacterizationRepository().create({ id: randomUUID(), apiId: randomUUID(), name: 'Ambiente já sincronizado', type: 'GENERAL', workspaceId: ctx.workspaceId, userId: ctx.userId });
  const snapshot = characterizationSnapshot(parent, []);
  await journal().setBase('CHARACTERIZATION', parent.id, { baseSnapshotHash: 'c'.repeat(64), snapshot, localSnapshot: snapshot });
  const risks = new RiskDataRepository();
  const add = async (kind = 'physical') => {
    const id = randomUUID();
    await risks.createRiskDataWithRecMedGs([{ id, riskId: `${kind}-synthetic`, probability: 3, exposure: 'CP',
      generateSourcesToRiskData: [{ name: `Fonte ${kind} coletada` }],
      episToRiskData: [{ id: '3', name: 'Protetor sintético', description: '999999', efficientlyCheck: false }] }], parent.id, ctx.userId);
    return id;
  };
  return { ctx, parent, snapshot, risks, add, journal, opened: () => opened,
    reopen: async () => { opened.close(); opened = await openDatabase(filename); bindDatabase(opened.db); return journal(); } };
}

function boundary({ allowDecisions = false } = {}) {
  // Only the network boundary is synthetic. Repositories, planner, receipt
  // engine, journal, restarts and ID acknowledgement use the actual app/SQLite.
  const applied = [];
  return { applied, client: { send: async (operations, context, options) => ({ receipts: operations.map((operation) => {
    const common = { operationId: operation.operationId, kind: operation.kind, entityId: operation.entityId,
      receivedAt: now(), durable: true };
    if (options?.deferApplication) return { ...common, state: 'RECEIVED' };
    if (operation.kind === 'RISK_DATA' && (!allowDecisions || !operation.decision)) return { ...common,
      state: 'NEEDS_REVIEW', error: { code: 'SST_DECISION_REQUIRED', expectedHead: head, reviewContextHash } };
    if (operation.kind !== 'RISK_DATA') return { ...common, state: 'APPLIED', appliedAt: now(), result: { id: operation.entityId } };
    const id = randomUUID(), snapshot = { ...operation.payload, id, startDate: operation.decision.effectiveFrom, endDate: null };
    applied.push({ operation, snapshot });
    return { ...common, state: 'APPLIED', appliedAt: now(), result: { id }, baseSnapshotHash: 'd'.repeat(64), snapshot };
  }) }) } };
}

test('a new offline risk is collected without inventing a period from the visit default or device clock', async (t) => {
  const f = await fixture(t), id = await f.add(), journal = f.journal();
  await saveVisitDefaults(journal, choice);
  await captureVisit(journal);
  const before = await journal.read(), original = before.entries.find((entry) => entry.operation.entityId === id);
  assert.equal(original.operation.kind, 'RISK_DATA');
  assert.equal(original.operation.baseSnapshotHash, undefined, 'this is a new risk, not an update with a pre-existing source base');
  assert.equal(original.operation.decision, undefined, 'saving a visit default is not consent to apply every collected item');
  assert.equal('startDate' in original.operation.payload, false);
  assert.equal('endDate' in original.operation.payload, false);
  assert.equal(before.bases[`RISK_DATA:${id}`], undefined);
  assert.equal(original.operation.payload.epis[0].efficientlyCheck, false);
  assert.equal(original.operation.dependsOn.length, 1, 'the new source must be applied before its assessment');
  const b = boundary();
  await runSync(journal, b.client);
  const doc = await (await f.reopen()).read(), pending = doc.entries.find((entry) => entry.operation.entityId === id);
  assert.equal(pending.receipt.state, 'NEEDS_REVIEW');
  assert.equal(getReviewContext(pending, doc).eligible, true);
  assert.equal(getReviewContext(pending, doc).periodStart, undefined, 'a new risk must not borrow an existing risk period');
  assert.deepEqual(pending.operation, original.operation, 'the original offline evidence stays immutable');
  assert.equal(b.applied.length, 0);
});

test('new risks without prior bases keep batch dates and exceptions through a lost plan response, SQLite restart and acknowledgement', async (t) => {
  const f = await fixture(t), physicalId = await f.add('physical'), chemicalId = await f.add('chemical');
  let journal = f.journal();
  await captureVisit(journal);
  await runSync(journal, boundary().client);
  const originals = (await journal.read()).entries.filter((entry) => entry.operation.kind === 'RISK_DATA');
  let request;
  const result = await applyReviewDecisions(journal, originals.map((entry) => ({ operationId: entry.operation.operationId, ...choice,
    ...(entry.operation.entityId === chemicalId ? { effectiveFrom: '2026-05-01', reason: 'Exposição química começou depois' } : {}) })), {
    createPlan: async (value) => { request = JSON.parse(JSON.stringify(value)); throw new Error('Resposta perdida após confirmação do plano'); },
  });
  assert.equal(result.captured, 0);
  assert.equal(result.errors.length, 2);
  journal = await f.reopen();
  const resumed = await resumeVisitDecisionPlan(journal, { createPlan: async (value) => { assert.deepEqual(value, request); return sealed(value); } });
  assert.equal(resumed.captured, 2);
  const confirmed = (await journal.read()).entries.filter((entry) => entry.operation.decisionPlanId).map((entry) => entry.operation);
  assert.equal(confirmed.find((op) => op.entityId === physicalId).decision.effectiveFrom, '2026-04-01');
  assert.equal(confirmed.find((op) => op.entityId === chemicalId).decision.effectiveFrom, '2026-05-01');
  for (const operation of confirmed) {
    assert.equal(operation.baseSnapshotHash, undefined);
    assert.equal('startDate' in operation.payload, false, 'the API owns period creation from the sealed decision');
    assert.deepEqual(operation.payload, originals.find((entry) => entry.operation.entityId === operation.entityId).operation.payload);
  }
  await captureVisit(journal);
  assert.deepEqual((await journal.read()).entries.filter((entry) => entry.operation.decisionPlanId).map((entry) => entry.operation), confirmed,
    'rescanning must preserve both confirmed dates and operation IDs even after the source dependency is applied');
  const b = boundary({ allowDecisions: true });
  const summary = await runSync(journal, b.client);
  assert.equal(summary.review, 0);
  assert.equal(summary.pending, 0);
  assert.equal(b.applied.length, 2);
  await acknowledgeSourceIds(journal);
  for (const { operation, snapshot } of b.applied) {
    const row = await f.opened().db.get('RiskData').find(operation.entityId);
    assert.equal(row.apiId, snapshot.id);
    assert.equal(row.id, operation.entityId, 'local identity remains stable for controls and subsequent edits');
    const saved = (await journal.read()).bases[`RISK_DATA:${operation.entityId}`];
    assert.equal(saved.snapshot.startDate, operation.decision.effectiveFrom);
    assert.deepEqual(saved.snapshot.generateSources, operation.payload.generateSources);
    assert.deepEqual(saved.snapshot.epis, operation.payload.epis);
  }
  const count = (await journal.read()).entries.length;
  await captureVisit(journal);
  assert.equal((await journal.read()).entries.length, count, 'accepted newly-created risks must not be resubmitted on every scan');
  const visible = (await new CompanyRepository().getAll(f.ctx.workspaceId, f.ctx.userId)).characterizations[0].riskData;
  assert.equal(visible.length, 2);
});

test('editing a new risk again after confirming its date creates a new undecided patch and preserves the original consent', async (t) => {
  const f = await fixture(t), id = await f.add(), journal = f.journal();
  await captureVisit(journal);
  await runSync(journal, boundary().client);
  const original = (await journal.read()).entries.find((entry) => entry.operation.entityId === id);
  const result = await applyReviewDecisions(journal, [{ operationId: original.operation.operationId, ...choice }], { createPlan: async (request) => sealed(request) });
  assert.equal(result.captured, 1);
  const sealedOperation = (await journal.read()).entries.filter((entry) => entry.operation.entityId === id).at(-1).operation;
  await f.risks.update(id, { riskId: 'physical-synthetic', probability: 4 });
  await captureVisit(journal);
  const history = (await journal.read()).entries.filter((entry) => entry.operation.entityId === id);
  assert.equal(history.length, 3);
  assert.deepEqual(history[1].operation, sealedOperation);
  assert.equal(history[2].operation.decision, undefined, 'a prior date is not consent to apply newer values');
  assert.equal(history[2].operation.supersedesOperationId, sealedOperation.operationId);
  assert.equal(history[2].operation.payload.probability, 4);
  assert.equal(history[2].receipt.state, 'PENDING');
});
