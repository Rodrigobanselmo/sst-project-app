require('../register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { openDatabase } = require('./watermelon-fixture.cjs');
const { SyncJournal, canonical } = require('../../src/libs/sync/journal.ts');
const { saveVisitDefaults, saveVisitChoice, loadVisitDefaults, loadVisitChoices, applyReviewDecisions, resumeVisitDecisionPlan, refreshVisitDecisionReview, getReviewContext } = require('../../src/libs/sync/visitDecisions.ts');
const now = () => '2026-10-24T12:00:00.000Z';
const context = () => ({ userId: 11, companyId: randomUUID(), workspaceId: randomUUID(), deviceId: randomUUID() });
const preference = { intent: 'NEW_CONDITION', effectiveFrom: '2026-10-24', reason: 'Condições observadas nesta visita' };
async function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'simplesst-visit-defaults-')), filename = join(directory, 'visit.db'), ctx = context();
  let opened = await openDatabase(filename);
  const journal = () => new SyncJournal(opened.storage, ctx, { id: randomUUID, now });
  t.after(() => { opened.close(); rmSync(directory, { recursive: true, force: true }); });
  return { ctx, filename, journal, opened: () => opened, reopen: async () => { opened.close(); opened = await openDatabase(filename); return journal(); } };
}
async function pending(journal, count, { dependencies = false } = {}) {
  const entries = [];
  for (let index = 0; index < count; index++) {
    const [entry] = await journal.capture([{ kind: 'RISK_DATA', entityId: `risk-${index}`, payload: { probability: 4, unknownEvidence: { preserved: index } }, baseSnapshotHash: 'b'.repeat(64),
      ...(dependencies && index && { dependsOn: [entries[index - 1].operation.operationId] }) }]);
    await journal.setBase('RISK_DATA', entry.operation.entityId, { baseSnapshotHash: 'b'.repeat(64), snapshot: { startDate: index % 2 ? '2025-03-01T12:00:00.000Z' : '2025-01-01T12:00:00.000Z' } });
    await journal.updateReceipt({ operationId: entry.operation.operationId, kind: entry.operation.kind, entityId: entry.operation.entityId, state: 'NEEDS_REVIEW', receivedAt: now(), durable: true,
      error: { code: 'SST_DECISION_REQUIRED', message: 'Confirme a alteração', expectedHead: 'a'.repeat(64), reviewContextHash: 'd'.repeat(64) } });
    entries.push((await journal.read()).entries.find((item) => item.operation.operationId === entry.operation.operationId));
  }
  return entries;
}
function sealed(request) { return { planId: request.planId, head: 'a'.repeat(64), operations: request.operations.map((operation) => ({ ...operation, decisionPlanId: request.planId, decision: { ...operation.decision, expectedHead: 'a'.repeat(64) } })) }; }
function reviewResponse(entries) { return { contractVersion: 1, reviewHead: 'f'.repeat(64), reviewContextHash: 'e'.repeat(64), context: { contextChanged: true, protectedDeclarations: 1 },
  items: entries.map((entry) => ({ operationId: entry.operation.operationId, kind: entry.operation.kind, entityId: entry.operation.entityId,
    collectedPayload: entry.operation.payload, currentSnapshot: { probability: 2 }, currentBaseSnapshotHash: 'b'.repeat(64), baseMatches: true, effectiveFrom: '2025-01-01', changedFields: [{ field: 'probability', currentValue: 2, collectedValue: 4 }] })) }; }

test('visit defaults survive a real SQLite restart and remain isolated from another visit context', async (t) => {
  const f = await fixture(t), journal = f.journal();
  await saveVisitDefaults(journal, preference);
  const restored = await f.reopen();
  assert.deepEqual(await loadVisitDefaults(restored), preference);
  const elsewhere = new SyncJournal(f.opened().storage, { ...f.ctx, workspaceId: randomUUID() }, { id: randomUUID, now });
  assert.equal(await loadVisitDefaults(elsewhere), undefined);
  await assert.rejects(saveVisitDefaults(restored, { ...preference, effectiveFrom: '2026-02-30' }), /data válida/);
  assert.deepEqual(await loadVisitDefaults(restored), preference);
  await saveVisitDefaults(restored, { intent: 'CORRECTION', effectiveFrom: '2026-10-24', reason: 'Corrigir cada período existente' });
  assert.deepEqual(await loadVisitDefaults(restored), { intent: 'CORRECTION', reason: 'Corrigir cada período existente' });
  await saveVisitDefaults(restored, undefined);
  assert.equal(await loadVisitDefaults(await f.reopen()), undefined);
});

test('one consent covers 100 collected changes with explicit exceptions and rewires every selected dependency', async (t) => {
  const f = await fixture(t), journal = f.journal(), entries = await pending(journal, 100, { dependencies: true });
  const originals = canonical((await journal.read()).entries);
  await saveVisitDefaults(journal, preference);
  const selections = entries.map((entry, index) => ({ operationId: entry.operation.operationId, ...preference,
    ...(index === 3 ? { effectiveFrom: '2026-09-01', reason: 'Exceção observada antes da visita' } : {}),
    ...(index === 9 ? { intent: 'CORRECTION', effectiveFrom: undefined, reason: 'Valor digitado incorretamente neste período' } : {}) }));
  let request;
  const result = await applyReviewDecisions(journal, selections, { createPlan: async (value) => { request = value; return sealed(value); } });
  assert.equal(result.captured, 100); assert.deepEqual(result.errors, []);
  const restored = await f.reopen(), doc = await restored.read();
  assert.equal(doc.entries.length, 200); assert.equal(canonical(doc.entries.slice(0, 100)), originals, 'accepted review creates revisions; it never rewrites the collected originals');
  assert.equal(new Set(request.operations.map((o) => o.operationId)).size, 100);
  assert.equal(request.operations[3].decision.effectiveFrom, '2026-09-01');
  assert.equal(request.operations[9].decision.intent, 'CORRECTION');
  assert.equal(request.operations[9].decision.effectiveFrom, '2025-03-01');
  for (let index = 1; index < 100; index++) assert.deepEqual(request.operations[index].dependsOn, [request.operations[index - 1].operationId]);
  assert.equal(Object.keys(await loadVisitChoices(restored)).length, 100);
  assert.equal(doc.entries.slice(100).every((entry) => entry.receipt.state === 'PENDING'), true, 'saving decisions does not pretend they have been applied');
});

test('lost plan responses resume after restart with the exact same plan and command UUIDs', async (t) => {
  const f = await fixture(t), journal = f.journal(), entries = await pending(journal, 3);
  const choices = entries.map((entry) => ({ operationId: entry.operation.operationId, ...preference }));
  let original;
  const failed = await applyReviewDecisions(journal, choices, { createPlan: async (request) => { original = JSON.parse(JSON.stringify(request)); throw new Error('Connection disappeared after server commit'); } });
  assert.equal(failed.captured, 0); assert.equal(failed.errors.length, 3);
  const restored = await f.reopen();
  assert.equal(Object.keys(await loadVisitChoices(restored)).length, 3);
  const result = await resumeVisitDecisionPlan(restored, { createPlan: async (request) => { assert.deepEqual(request, original); return sealed(request); } });
  assert.equal(result.captured, 3); assert.equal((await restored.read()).entries.length, 6);
  assert.deepEqual((await restored.read()).entries.slice(3).map((entry) => entry.operation.operationId), original.operations.map((operation) => operation.operationId));
  assert.equal((await resumeVisitDecisionPlan(restored, { createPlan: async () => assert.fail('the confirmed plan must not be sent again') })).captured, 0);
});

test('concurrent visit-default and per-item exception saves retain every independent choice', async (t) => {
  const f = await fixture(t), journal = f.journal();
  await Promise.all([saveVisitDefaults(journal, preference), ...Array.from({ length: 30 }, (_, index) => saveVisitChoice(journal, `item-${index}`, { ...preference, reason: `Exceção ${index}` }))]);
  const restored = await f.reopen();
  assert.deepEqual(await loadVisitDefaults(restored), preference);
  assert.equal(Object.keys(await loadVisitChoices(restored)).length, 30);
  assert.equal((await loadVisitChoices(restored))['item-17'].reason, 'Exceção 17');
});

test('a mixed review context cannot silently combine choices observed before and after an external change', async (t) => {
  const f = await fixture(t), journal = f.journal(), entries = await pending(journal, 2);
  await journal.updateReceipt({ ...entries[1].receipt, error: { ...entries[1].receipt.error, reviewContextHash: 'e'.repeat(64) } });
  const result = await applyReviewDecisions(journal, entries.map((entry) => ({ operationId: entry.operation.operationId, ...preference })), { createPlan: async () => assert.fail('mixed contexts cannot be auto-refreshed or sent') });
  assert.equal(result.captured, 0); assert.equal(result.errors.length, 1);
  assert.equal((await journal.read()).entries.length, 2);
});

test('an explicitly reopened review keeps collected values and original bases while exposing current context and conflicts', async (t) => {
  const f = await fixture(t), journal = f.journal(), entries = await pending(journal, 2), before = await journal.read();
  const response = reviewResponse(entries); response.items[1].baseMatches = false; response.items[1].currentBaseSnapshotHash = 'c'.repeat(64);
  await refreshVisitDecisionReview(journal, { createPlan: async () => assert.fail('reopening is read-only'), review: async () => response });
  const after = await journal.read();
  assert.deepEqual(after.bases, before.bases); assert.deepEqual(after.entries.map((entry) => entry.operation), before.entries.map((entry) => entry.operation));
  assert.equal(after.entries[0].receipt.error.expectedHead, response.reviewHead);
  assert.equal(after.entries[0].receipt.error.details.changedFields[0].currentValue, 2);
  assert.equal(after.entries[1].receipt.error.code, 'MOBILE_BASE_CONFLICT');
  assert.equal(getReviewContext(after.entries[1], after).eligible, false, 'a refresh must not silently rebase a stale offline patch');
});

test('a duplicated or mismatched review response preserves every prior receipt and source base', async (t) => {
  const f = await fixture(t), journal = f.journal(), entries = await pending(journal, 2), before = canonical(await journal.read());
  const duplicate = reviewResponse(entries); duplicate.items[1] = duplicate.items[0];
  await assert.rejects(refreshVisitDecisionReview(journal, { createPlan: async () => assert.fail(), review: async () => duplicate }), /incompleta/);
  assert.equal(canonical(await journal.read()), before);
  const changed = reviewResponse(entries); changed.items[1].collectedPayload = { probability: 99 };
  await assert.rejects(refreshVisitDecisionReview(journal, { createPlan: async () => assert.fail(), review: async () => changed }), /não corresponde/);
  assert.equal(canonical(await journal.read()), before);
});

test('a real SQLite error updating the second review receipt cannot advance only the first review head', async (t) => {
  const f = await fixture(t), journal = f.journal(), entries = await pending(journal, 2), before = canonical(await journal.read());
  const sql = new DatabaseSync(f.filename);
  sql.exec(`CREATE TRIGGER review_receipts_fail BEFORE UPDATE ON SyncOperation WHEN NEW.entity_key='${entries[1].operation.operationId}' AND json_extract(NEW.data,'$.receipt.error.expectedHead')='${'f'.repeat(64)}' BEGIN SELECT RAISE(ABORT,'SYNTHETIC_REVIEW_RECEIPT_FAILURE'); END`);
  try {
    await assert.rejects(refreshVisitDecisionReview(journal, { createPlan: async () => assert.fail(), review: async () => reviewResponse(entries) }), /SYNTHETIC_REVIEW_RECEIPT_FAILURE/);
  } finally { sql.exec('DROP TRIGGER review_receipts_fail'); sql.close(); }
  const restored = await f.reopen();
  assert.equal(canonical(await restored.read()), before);
  await refreshVisitDecisionReview(restored, { createPlan: async () => assert.fail(), review: async () => reviewResponse(entries) });
  assert.ok((await restored.read()).entries.every((entry) => entry.receipt.error.expectedHead === 'f'.repeat(64)));
});

test('an invalid exception prevents partial consent while preserving the other explicit choices offline', async (t) => {
  const f = await fixture(t), journal = f.journal(), entries = await pending(journal, 3);
  let calls = 0;
  const choices = entries.map((entry, index) => ({ operationId: entry.operation.operationId, ...preference, ...(index === 1 && { effectiveFrom: '2026-02-30' }) }));
  const result = await applyReviewDecisions(journal, choices, { createPlan: async () => { calls++; assert.fail('invalid consent cannot go to the API'); } });
  assert.equal(result.captured, 0); assert.equal(result.errors.length, 1); assert.equal(calls, 0);
  assert.equal((await (await f.reopen()).read()).entries.length, 3);
  assert.equal(Object.keys(await loadVisitChoices(f.journal())).length, 2);
});

test('a correction keeps each existing period start and never substitutes the visit default date', async (t) => {
  const f = await fixture(t), journal = f.journal(), entries = await pending(journal, 2);
  await saveVisitDefaults(journal, { intent: 'CORRECTION', reason: 'Corrigir dados' });
  const pref = await loadVisitDefaults(journal); let request;
  const result = await applyReviewDecisions(journal, entries.map((entry) => ({ operationId: entry.operation.operationId, ...pref })), { createPlan: async (value) => { request = value; return sealed(value); } });
  assert.equal(result.captured, 2);
  assert.deepEqual(request.operations.map((o) => o.decision.effectiveFrom), ['2025-01-01', '2025-03-01']);
  assert.equal(getReviewContext(entries[0], await journal.read()).type, 'HISTORY');
});

test('applied, obsolete, conflicting and media operations cannot be silently included in a visit consent', async (t) => {
  const f = await fixture(t), journal = f.journal(), entries = await pending(journal, 3);
  await journal.updateReceipt({ ...entries[0].receipt, state: 'APPLIED', appliedAt: now() });
  await journal.capture([{ kind: 'RISK_DATA', entityId: entries[1].operation.entityId, payload: { probability: 5 } }]);
  await journal.updateReceipt({ ...entries[2].receipt, error: { code: 'MOBILE_BASE_CONFLICT', currentSnapshotHash: 'c'.repeat(64), expectedHead: 'a'.repeat(64) } });
  const [media] = await journal.capture([{ kind: 'PHOTO', entityId: randomUUID(), payload: { uri: 'file:///original.jpg' } }]);
  const result = await applyReviewDecisions(journal, [...entries, media].map((entry) => ({ operationId: entry.operation.operationId, ...preference })), { createPlan: async () => assert.fail('ineligible choices must not reach the server') });
  assert.equal(result.captured, 0); assert.equal(result.errors.length, 4);
  const doc = await journal.read();
  assert.equal(doc.entries[0].receipt.state, 'APPLIED'); assert.equal(doc.entries.length, 5);
});

test('an incomplete or tampered plan acknowledgement cannot import partial or duplicated operations', async (t) => {
  const f = await fixture(t), journal = f.journal(), entries = await pending(journal, 2);
  const choices = entries.map((entry) => ({ operationId: entry.operation.operationId, ...preference }));
  const result = await applyReviewDecisions(journal, choices, { createPlan: async (request) => { const value = sealed(request); value.operations = [value.operations[0], value.operations[0]]; return value; } });
  assert.equal(result.captured, 0, 'two copies of one acknowledgement cannot hide the missing second command');
  assert.equal(result.errors.length, 2); assert.equal((await journal.read()).entries.length, 2);
});

test('a real SQLite failure while importing decisions rolls back all 100 and keeps their sealed retry identifiers', async (t) => {
  const f = await fixture(t), journal = f.journal(), entries = await pending(journal, 100);
  const sql = new DatabaseSync(f.filename); let original;
  sql.exec("CREATE TRIGGER visit_plan_fail BEFORE INSERT ON SyncOperation WHEN NEW.record_type='OPERATION' AND json_extract(NEW.data,'$.operation.decisionPlanId') IS NOT NULL BEGIN SELECT RAISE(ABORT,'SYNTHETIC_PLAN_IMPORT_FAILURE'); END");
  try {
    const result = await applyReviewDecisions(journal, entries.map((entry) => ({ operationId: entry.operation.operationId, ...preference })), { createPlan: async (request) => { original = request; return sealed(request); } });
    assert.equal(result.captured, 0); assert.equal((await journal.read()).entries.length, 100);
  } finally { sql.exec('DROP TRIGGER visit_plan_fail'); sql.close(); }
  const restored = await f.reopen();
  const result = await resumeVisitDecisionPlan(restored, { createPlan: async (request) => { assert.deepEqual(request, original); return sealed(request); } });
  assert.equal(result.captured, 100); assert.equal((await restored.read()).entries.length, 200);
});

test('the actual visit planner keeps sealed decisions and rewritten parent dependencies on its next scan', async (t) => {
  const f = await fixture(t); require('./database-binding.cjs').bindDatabase(f.opened().db);
  const { CharacterizationRepository } = require('../../src/repositories/characterizationRepository.ts');
  const { RiskDataRepository } = require('../../src/repositories/riskDataRepository.ts');
  const { captureVisit, characterizationSnapshot, riskSnapshot } = require('../../src/libs/sync/planner.ts');
  const { CompanyRepository } = require('../../src/repositories/companyRepository.ts');
  const db = f.opened().db, journal = f.journal();
  await db.write(async () => {
    await db.get('Company').create((row) => { row._raw.id = f.ctx.companyId; row.apiId = row.id; row.name = 'Empresa de teste'; row.cnpj = '11222333000181'; row.fantasy = 'Teste'; row.logoUrl = ''; row.userId = String(f.ctx.userId); row.created_at = new Date(); row.updated_at = new Date(); });
    await db.get('Workspace').create((row) => { row._raw.id = f.ctx.workspaceId; row.apiId = row.id; row.name = 'Unidade de teste'; row.companyId = f.ctx.companyId; row.userId = String(f.ctx.userId); row.created_at = new Date(); row.updated_at = new Date(); });
  });
  const parent = await new CharacterizationRepository().create({ id: randomUUID(), name: 'Nome corrigido na visita', type: 'GENERAL', workspaceId: f.ctx.workspaceId, userId: f.ctx.userId });
  await new RiskDataRepository().createRiskDataWithRecMedGs([{ id: randomUUID(), riskId: 'noise-synthetic', probability: 4, exposure: 'CP' }], parent.id, f.ctx.userId);
  const row = (await new CompanyRepository().getAll(f.ctx.workspaceId, f.ctx.userId)).characterizations[0];
  const parentSnapshot = characterizationSnapshot(row.characterization, []);
  await journal.setBase('CHARACTERIZATION', parent.id, { baseSnapshotHash: 'b'.repeat(64), snapshot: { ...parentSnapshot, name: 'Nome anterior' } });
  for (const risk of row.riskData) await journal.setBase('RISK_DATA', risk.id, { baseSnapshotHash: 'b'.repeat(64), snapshot: { ...riskSnapshot(risk), probability: 2, startDate: '2025-01-01' } });
  await captureVisit(journal);
  const collected = (await journal.read()).entries;
  assert.equal(collected.length, 2);
  for (const entry of collected) await journal.updateReceipt({ operationId: entry.operation.operationId, kind: entry.operation.kind, entityId: entry.operation.entityId, state: 'NEEDS_REVIEW', receivedAt: now(), durable: true,
    error: { code: 'SST_DECISION_REQUIRED', expectedHead: 'a'.repeat(64), reviewContextHash: 'd'.repeat(64) } });
  const result = await applyReviewDecisions(journal, collected.map((entry) => ({ operationId: entry.operation.operationId, ...preference })), { createPlan: async (request) => sealed(request) });
  assert.equal(result.captured, 2);
  const approved = (await journal.read()).entries.slice(2).map((entry) => entry.operation);
  const approvedParent = approved.find((op) => op.kind === 'CHARACTERIZATION');
  assert.deepEqual(approved.find((op) => op.kind === 'RISK_DATA').dependsOn, [approvedParent.operationId]);
  await captureVisit(journal);
  assert.equal((await journal.read()).entries.length, 4, 'rescanning unchanged sources must not append undecided replacements');
  assert.deepEqual((await journal.read()).entries.slice(2).map((entry) => entry.operation), approved);
  await journal.updateReceipt({ operationId: approvedParent.operationId, kind: approvedParent.kind, entityId: approvedParent.entityId,
    state: 'APPLIED', receivedAt: now(), appliedAt: now(), durable: true, baseSnapshotHash: 'c'.repeat(64), snapshot: parentSnapshot });
  await captureVisit(journal);
  const resumed = await journal.read();
  assert.equal(resumed.entries.length, 4, 'an applied parent disappearing from new drafts must not erase the child consent');
  const child = resumed.entries.find((entry) => entry.operation.operationId === approved.find((operation) => operation.kind === 'RISK_DATA').operationId);
  assert.deepEqual(child.operation, approved.find((operation) => operation.kind === 'RISK_DATA'));
  assert.equal(child.operation.decisionPlanId, approvedParent.decisionPlanId);
  assert.deepEqual(child.operation.dependsOn, [approvedParent.operationId], 'the originally sealed dependency remains immutable');
});


test('ending a declared environment requires an explicit new-condition date and preserves mixed visit choices', async (t) => {
  const f = await fixture(t), journal = f.journal(), [risk] = await pending(journal, 1);
  const [deletion] = await journal.capture([{ kind: 'CHARACTERIZATION_DELETE', entityId: randomUUID(), payload: { name: 'Ambiente encerrado na revisita' }, baseSnapshotHash: 'b'.repeat(64) }]);
  await journal.updateReceipt({ ...deletion.receipt, state: 'NEEDS_REVIEW', receivedAt: now(), durable: true,
    error: { code: 'SST_STRUCTURE_ARCHIVE_REQUIRES_NEW_CONDITION', expectedHead: 'a'.repeat(64), reviewContextHash: 'd'.repeat(64), effectiveFrom: '2025-01-01' } });
  assert.equal(getReviewContext((await journal.read()).entries.find((entry) => entry.operation.operationId === deletion.operation.operationId), await journal.read()).eligible, true, 'an older correction attempt remains reviewable after upgrade');
  const before = canonical((await journal.read()).entries);
  const wrong = await applyReviewDecisions(journal, [
    { operationId: risk.operation.operationId, intent: 'CORRECTION', reason: 'Corrigir a medição' },
    { operationId: deletion.operation.operationId, intent: 'CORRECTION', reason: 'Padrão de correção aplicado à visita' },
  ], { createPlan: async () => assert.fail('invalid mixed consent must not reach the API') });
  assert.equal(wrong.captured, 0);
  assert.equal(wrong.errors.length, 1);
  assert.equal(wrong.errors[0].operationId, deletion.operation.operationId);
  assert.match(wrong.errors[0].message, /nova condição/);
  const restored = await f.reopen();
  assert.equal(canonical((await restored.read()).entries), before);
  assert.equal((await loadVisitChoices(restored))[risk.operation.operationId].intent, 'CORRECTION');
  let sent;
  const correct = await applyReviewDecisions(restored, [
    { operationId: risk.operation.operationId, intent: 'CORRECTION', reason: 'Corrigir a medição' },
    { operationId: deletion.operation.operationId, intent: 'NEW_CONDITION', effectiveFrom: '2026-04-01', reason: 'Ambiente deixou de operar nessa data' },
  ], { createPlan: async (request) => { sent = request; return sealed(request); } });
  assert.equal(correct.captured, 2);
  assert.equal(sent.operations[0].decision.intent, 'CORRECTION');
  assert.equal(sent.operations[1].decision.intent, 'NEW_CONDITION');
  assert.equal(sent.operations[1].decision.effectiveFrom, '2026-04-01');
  assert.equal(canonical((await restored.read()).entries.slice(0, 2)), before);
});
