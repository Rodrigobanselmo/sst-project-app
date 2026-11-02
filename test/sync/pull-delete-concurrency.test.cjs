require('../register.cjs');
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { openDatabase } = require('./watermelon-fixture.cjs');
const { bindDatabase } = require('./database-binding.cjs');

describe('Remote parent deletion preserves locally collected descendants', { concurrency: false }, () => {
  let opened, directory, companyId, workspaceId, characterizations, risks, companies, journal;
  let characterizationSnapshot, riskSnapshot, pullCharacterizations, setPullResponse;
  before(async () => {
    directory = mkdtempSync(join(tmpdir(), 'simplesst-pull-delete-'));
    opened = await openDatabase(join(directory, 'visit.db'));
    bindDatabase(opened.db);
    const { CharacterizationRepository } = require('../../src/repositories/characterizationRepository.ts');
    const { RiskDataRepository } = require('../../src/repositories/riskDataRepository.ts');
    const { CompanyRepository } = require('../../src/repositories/companyRepository.ts');
    const { createSyncJournal } = require('../../src/libs/sync/storage.ts');
    ({ characterizationSnapshot, riskSnapshot } = require('../../src/libs/sync/planner.ts'));
    ({ pullCharacterizations } = require('../../src/libs/sync/pull.ts'));
    ({ setPullResponse } = require('./pull-http-boundary.cjs'));
    characterizations = new CharacterizationRepository(); risks = new RiskDataRepository(); companies = new CompanyRepository();
    companyId = randomUUID(); workspaceId = randomUUID();
    await opened.db.write(async () => {
      await opened.db.get('Company').create((row) => { row._raw.id = companyId; row.apiId = companyId; row.name = 'Empresa sintética'; row.cnpj = '11222333000181'; row.fantasy = 'Teste'; row.logoUrl = ''; row.userId = '11'; row.created_at = new Date(); row.updated_at = new Date(); });
      await opened.db.get('Workspace').create((row) => { row._raw.id = workspaceId; row.apiId = workspaceId; row.name = 'Unidade sintética'; row.companyId = companyId; row.userId = '11'; row.created_at = new Date(); row.updated_at = new Date(); });
    });
    journal = await createSyncJournal({ userId: 11, companyId, workspaceId });
  });
  after(() => { opened?.close(); if (directory) rmSync(directory, { recursive: true, force: true }); });

  async function cleanParent() {
    const parent = await characterizations.create({ id: randomUUID(), name: 'Pai sintético limpo', type: 'GENERAL', workspaceId, userId: 11 });
    const row = (await companies.getAll(workspaceId, 11)).characterizations.find((entry) => entry.characterization.id === parent.id);
    const snapshot = characterizationSnapshot(row.characterization, []);
    await journal.setBase('CHARACTERIZATION', parent.id, { baseSnapshotHash: 'a'.repeat(64), snapshot, localSnapshot: snapshot });
    return parent;
  }
  async function addRisk(parent) {
    const id = randomUUID();
    await risks.createRiskDataWithRecMedGs([{ id, riskId: 'noise-risk', probability: 3, exposure: 'CP', activities: [{ id: 'act', name: 'Atividade coletada' }] }], parent.id, 11);
    return id;
  }
  async function remoteDelete(parent, duringRequest = async () => {}) {
    setPullResponse(async () => {
      await duringRequest();
      return { latestVersion: Date.now(), characterizations: [{ id: parent.id, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }] };
    });
    await pullCharacterizations({ userId: 11, companyId, workspaceId });
  }
  async function assertPreserved(parent, riskId) {
    const saved = await characterizations.findOne(parent.id);
    assert.notEqual(saved.characterization.status, 'INACTIVE');
    assert.ok((await characterizations.findList({ workspaceId })).characterizations.some((row) => row.id === parent.id));
    const captured = (await journal.read()).entries.filter((entry) => entry.operation.kind === 'RISK_DATA' && entry.operation.entityId === riskId).at(-1);
    assert.ok(captured, 'the original collection must remain available to synchronization and ZIP export');
    return captured;
  }

  it('captures a new risk created while the parent deletion is in flight', async () => {
    const parent = await cleanParent(); let riskId;
    await remoteDelete(parent, async () => { riskId = await addRisk(parent); });
    const captured = await assertPreserved(parent, riskId);
    assert.equal(captured.operation.payload.probability, 3);
  });

  it('captures an existing clean risk edited while the parent deletion is in flight', async () => {
    const parent = await cleanParent(), riskId = await addRisk(parent);
    const row = (await companies.getAll(workspaceId, 11)).characterizations.find((entry) => entry.characterization.id === parent.id);
    const snapshot = riskSnapshot(row.riskData.find((risk) => risk.id === riskId));
    await journal.setBase('RISK_DATA', riskId, { baseSnapshotHash: 'b'.repeat(64), snapshot, localSnapshot: snapshot });
    await remoteDelete(parent, () => risks.update(riskId, { riskId: 'noise-risk', probability: 4 }));
    const captured = await assertPreserved(parent, riskId);
    assert.equal(captured.operation.payload.probability, 4);
  });

  it('keeps a parent with a risk already pending before the request', async () => {
    const parent = await cleanParent(), riskId = await addRisk(parent);
    await remoteDelete(parent);
    await assertPreserved(parent, riskId);
  });

  it('still hides a clean unchanged parent when the server removes it', async () => {
    const parent = await cleanParent();
    await remoteDelete(parent);
    assert.equal((await characterizations.findOne(parent.id)).characterization.status, 'INACTIVE');
    assert.equal((await characterizations.findList({ workspaceId })).characterizations.some((row) => row.id === parent.id), false);
  });
});
