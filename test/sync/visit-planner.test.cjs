require('../register.cjs');
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { openDatabase } = require('./watermelon-fixture.cjs');
const { bindDatabase } = require('./database-binding.cjs');

describe('Actual visit repositories and planner with Watermelon SQLite', { concurrency: false }, () => {
  let opened, directory, companyId, workspaceId, characterizations, risks, companies, journal;
  let captureVisit, characterizationSnapshot, riskSnapshot, createSyncJournal;
  const nextCharacter = async (extra = {}) => characterizations.create({ id: randomUUID(), name: 'Visita sintética', type: 'GENERAL', workspaceId, userId: 11, ...extra });
  before(async () => {
    directory = mkdtempSync(join(tmpdir(), 'simplesst-visit-planner-'));
    opened = await openDatabase(join(directory, 'visit.db'));
    bindDatabase(opened.db);
    ({ captureVisit, characterizationSnapshot, riskSnapshot } = require('../../src/libs/sync/planner.ts'));
    ({ createSyncJournal } = require('../../src/libs/sync/storage.ts'));
    const { CharacterizationRepository } = require('../../src/repositories/characterizationRepository.ts');
    const { RiskDataRepository } = require('../../src/repositories/riskDataRepository.ts');
    const { CompanyRepository } = require('../../src/repositories/companyRepository.ts');
    characterizations = new CharacterizationRepository(); risks = new RiskDataRepository(); companies = new CompanyRepository();
    companyId = randomUUID(); workspaceId = randomUUID();
    await opened.db.write(async () => {
      await opened.db.get('Company').create((row) => { row._raw.id = companyId; row.apiId = companyId; row.name = 'Empresa sintética'; row.cnpj = '11222333000181'; row.fantasy = 'Teste'; row.logoUrl = ''; row.userId = '11'; row.created_at = new Date(); row.updated_at = new Date(); });
      await opened.db.get('Workspace').create((row) => { row._raw.id = workspaceId; row.apiId = workspaceId; row.name = 'Unidade sintética'; row.companyId = companyId; row.userId = '11'; row.created_at = new Date(); row.updated_at = new Date(); });
    });
    journal = await createSyncJournal({ userId: 11, companyId, workspaceId });
  });
  after(() => { opened?.close(); if (directory) rmSync(directory, { recursive: true, force: true }); });

  it('captures every local risk/control/photo/audio independently, without trusting last-send timestamps', async () => {
    const parent = await nextCharacter({ createdAt: new Date('2020-01-01'), updatedAt: new Date('2020-01-01'), photos: [{ photoUrl: 'file:///synthetic/photos/visit.jpg', name: 'Foto persistida' }], audios: [{ uri: 'file:///synthetic/audio/visit.m4a' }], videos: [{ uri: 'file:///synthetic/videos/visit.mp4' }] });
    const riskId = randomUUID();
    await risks.createRiskDataWithRecMedGs([{ id: riskId, riskId: 'noise-risk', probability: 3, exposure: 'CP', activities: [{ id: 'act', name: 'Atividade observada', description: 'Na visita' }], generateSourcesToRiskData: [{ name: 'Fonte coletada', id: undefined }], episToRiskData: [{ id: '3', name: 'Protetor', description: '999999', efficientlyCheck: false }] }], parent.id, 11);
    await captureVisit(journal);
    const entries = (await journal.read()).entries;
    const risk = entries.find((entry) => entry.operation.entityId === riskId && entry.operation.kind === 'RISK_DATA');
    assert.ok(risk);
    assert.ok(entries.find((entry) => entry.operation.kind === 'GENERATE_SOURCE'));
    assert.ok(entries.find((entry) => entry.operation.entityId === parent.id && entry.operation.kind === 'CHARACTERIZATION'));
    assert.ok(entries.find((entry) => entry.operation.kind === 'PHOTO' && entry.operation.payload.characterizationId === parent.id));
    assert.ok(entries.find((entry) => entry.operation.kind === 'AUDIO' && entry.operation.payload.characterizationId === parent.id));
    assert.ok(entries.find((entry) => entry.operation.kind === 'VIDEO' && entry.operation.payload.characterizationId === parent.id));
    assert.equal(risk.operation.payload.epis[0].efficientlyCheck, false);
    assert.equal('trainingCheck' in risk.operation.payload.epis[0], false, 'the planner must never invent nine EPI answers from one efficacy checkbox');
    assert.ok(risk.operation.dependsOn.length >= 2, 'new assessment waits for its new parent and source');
  });

  it('a repeated scan preserves stable operation and media identifiers rather than generating duplicates', async () => {
    const before = await journal.read();
    await captureVisit(journal);
    const after = await journal.read();
    assert.equal(after.entries.length, before.entries.length);
    assert.deepEqual(after.entries.map((entry) => entry.operation.operationId), before.entries.map((entry) => entry.operation.operationId));
  });

  it('filters local data by user even when two users have visits in the same workspace', async () => {
    const foreign = await nextCharacter({ userId: 22, name: 'Visita de outra sessão' });
    await captureVisit(journal);
    assert.equal((await journal.read()).entries.some((entry) => entry.operation.entityId === foreign.id), false);
    assert.equal((await companies.getAll(workspaceId, 11)).characterizations.some((entry) => entry.characterization.id === foreign.id), false);
  });

  it('persists zero/empty edits while preserving activities and sends only the changed risk fields', async () => {
    const parent = await nextCharacter();
    const riskId = randomUUID();
    await risks.createRiskDataWithRecMedGs([{ id: riskId, riskId: 'noise-risk', probability: 3, exposure: 'CP', realActivity: 'Atividade real original', activities: [{ id: 'known', name: 'Operação', description: 'Descrição mantida' }], episToRiskData: [{ id: '3', name: 'EPI', description: '999999', efficientlyCheck: false }] }], parent.id, 11);
    const data = (await companies.getAll(workspaceId, 11)).characterizations.find((entry) => entry.characterization.id === parent.id);
    const initial = data.riskData.find((entry) => entry.id === riskId);
    const originalActivities = initial.activities;
    const parentBase = characterizationSnapshot(data.characterization, []), base = riskSnapshot(initial);
    await journal.setBase('CHARACTERIZATION', parent.id, { baseSnapshotHash: 'a'.repeat(64), snapshot: parentBase, localSnapshot: parentBase });
    await journal.setBase('RISK_DATA', riskId, { baseSnapshotHash: 'b'.repeat(64), snapshot: base, localSnapshot: base });
    await risks.update(riskId, { riskId: 'noise-risk', probability: 0, exposure: '' });
    await characterizations.update(parent.id, { description: '' });
    const local = (await risks.findOne(riskId)).riskData;
    assert.deepEqual(JSON.parse(local.activities), originalActivities);
    assert.equal(local.probability, 0); assert.equal(local.exposure, '');
    await captureVisit(journal);
    const entry = (await journal.read()).entries.filter((item) => item.operation.entityId === riskId).at(-1);
    assert.equal(entry.operation.payload.probability, 0);
    assert.equal(entry.operation.payload.exposure, null, 'cleared optional exposure is transmitted as absence; the raw empty input remains recoverable');
    assert.equal((await journal.read()).entries.some((item) => item.operation.entityId === parent.id), false,
      'an absent description rendered as empty by the form must not fabricate a parent change');
    assert.equal('activities' in entry.operation.payload, false);
    assert.equal('epis' in entry.operation.payload, false);
    assert.equal('json' in entry.operation.payload, false);
    assert.equal(entry.operation.baseSnapshotHash, 'b'.repeat(64));
  });

  it('a delete atomically preserves a tombstone and the hidden local source, including media references', async () => {
    const parent = await nextCharacter({ photos: [{ photoUrl: 'file:///synthetic/document/deleted-visit.jpg' }] });
    await characterizations.delete(parent.id);
    const saved = await opened.db.get('CompanyCharacterization').find(parent.id);
    assert.equal(saved.status, 'INACTIVE');
    const entry = (await journal.read()).entries.find((item) => item.operation.entityId === parent.id && item.operation.kind === 'CHARACTERIZATION_DELETE');
    assert.ok(entry);
    assert.equal(entry.receipt.state, 'PENDING');
    assert.equal(entry.operation.payload.sourceSnapshot.photos[0].photoUrl, 'file:///synthetic/document/deleted-visit.jpg');
    assert.equal((await saved.photos.fetch()).length, 1, 'unacknowledged media must not be permanently removed');
  });

  it('an acknowledged source stays clean on the next scan even when the server normalizes its snapshot', async () => {
    const parent = await nextCharacter({ name: 'nome coletado' });
    await captureVisit(journal);
    const captured = (await journal.read()).entries.filter((entry) => entry.operation.kind === 'CHARACTERIZATION' && entry.operation.entityId === parent.id).at(-1);
    const snapshot = { ...captured.operation.payload, name: 'Nome coletado' };
    await journal.updateReceipt({ operationId: captured.operation.operationId, kind: 'CHARACTERIZATION', entityId: parent.id, state: 'APPLIED', receivedAt: new Date().toISOString(), appliedAt: new Date().toISOString(), baseSnapshotHash: 'c'.repeat(64), snapshot, result: { id: parent.id } });
    await captureVisit(journal);
    const same = (await journal.read()).entries.filter((entry) => entry.operation.kind === 'CHARACTERIZATION' && entry.operation.entityId === parent.id);
    assert.equal(same.length, 1);
    assert.equal(same[0].receipt.state, 'APPLIED');
  });

  it('a pull cannot overwrite an edit made while its HTTP request is in flight', async () => {
    const { setPullResponse } = require('./pull-http-boundary.cjs');
    const { pullCharacterizations } = require('../../src/libs/sync/pull.ts');
    const parent = await nextCharacter({ name: 'Base do pull', description: 'Antes' });
    const data = (await companies.getAll(workspaceId, 11)).characterizations.find((entry) => entry.characterization.id === parent.id);
    const original = characterizationSnapshot(data.characterization, []);
    await journal.setBase('CHARACTERIZATION', parent.id, { baseSnapshotHash: 'd'.repeat(64), snapshot: original, localSnapshot: original });
    setPullResponse(async () => {
      await characterizations.update(parent.id, { description: 'Editado durante a conexão' });
      const server = { ...original, id: parent.id, description: 'Resposta web anterior', workspaceId, companyId, created_at: new Date('2026-01-01'), updated_at: new Date('2026-10-23'), homogeneousGroup: { hierarchyOnHomogeneous: [], riskFactorData: [] } };
      return { latestVersion: new Date('2026-10-23').getTime(), characterizations: [{ ...server, mobileSync: { baseSnapshotHash: 'e'.repeat(64), snapshot: characterizationSnapshot(server, []) } }] };
    });
    await pullCharacterizations({ userId: 11, companyId, workspaceId });
    assert.equal((await characterizations.findOne(parent.id)).characterization.description, 'Editado durante a conexão');
    const latest = (await journal.read()).entries.filter((entry) => entry.operation.kind === 'CHARACTERIZATION' && entry.operation.entityId === parent.id).at(-1);
    assert.equal(latest.operation.payload.description, 'Editado durante a conexão');
    assert.equal(latest.receipt.state, 'PENDING');
    assert.equal((await journal.read()).bases[`CHARACTERIZATION:${parent.id}`].baseSnapshotHash, 'd'.repeat(64));
  });

  it('applies a clean remote source and advances its base only after the local transaction succeeds', async () => {
    const { setPullResponse } = require('./pull-http-boundary.cjs');
    const { pullCharacterizations } = require('../../src/libs/sync/pull.ts');
    const parent = await nextCharacter({ description: 'Condição anterior limpa' });
    const data = (await companies.getAll(workspaceId, 11)).characterizations.find((entry) => entry.characterization.id === parent.id);
    const original = characterizationSnapshot(data.characterization, []);
    await journal.setBase('CHARACTERIZATION', parent.id, { baseSnapshotHash: 'f'.repeat(64), snapshot: original, localSnapshot: original });
    const server = { ...original, description: 'Condição web recebida', workspaceId, companyId, created_at: new Date('2026-01-01'), updated_at: new Date('2026-10-23'), homogeneousGroup: { hierarchyOnHomogeneous: [], riskFactorData: [] } };
    setPullResponse(async () => ({ latestVersion: new Date('2026-10-23').getTime(), characterizations: [{ ...server, mobileSync: { baseSnapshotHash: 'a'.repeat(64), snapshot: characterizationSnapshot(server, []) } }] }));
    await pullCharacterizations({ userId: 11, companyId, workspaceId });
    assert.equal((await characterizations.findOne(parent.id)).characterization.description, 'Condição web recebida');
    assert.equal((await journal.read()).bases[`CHARACTERIZATION:${parent.id}`].baseSnapshotHash, 'a'.repeat(64));
    assert.equal((await journal.read()).entries.some((entry) => entry.operation.kind === 'CHARACTERIZATION' && entry.operation.entityId === parent.id), false);
  });

  it('downloading an EPI with unanswered efficacy does not invent a false answer or an offline edit', async () => {
    const { setPullResponse } = require('./pull-http-boundary.cjs');
    const { pullCharacterizations } = require('../../src/libs/sync/pull.ts');
    const id = randomUUID(), riskId = randomUUID();
    const parent = { id, name: 'Condição com resposta não informada', description: null, type: 'GENERAL', workspaceId, companyId,
      created_at: new Date('2026-01-01'), updated_at: new Date('2026-10-23') };
    const snapshot = { id: riskId, riskId: 'noise-risk', homogeneousGroupId: id, hierarchyId: null,
      probability: 3, probabilityAfter: null, exposure: 'CP', activities: null,
      adms: [], recs: [], generateSources: [], engs: [], epis: [{ epiId: 3, efficientlyCheck: null }] };
    const remoteRisk = { id: riskId, riskId: 'noise-risk', homogeneousGroupId: id, probability: 3, probabilityAfter: null,
      exposure: 'CP', activities: null, updatedAt: new Date('2026-10-23'), adms: [], recs: [], generateSources: [], engsToRiskFactorData: [],
      epiToRiskFactorData: [{ epiId: 3, efficientlyCheck: null, epi: { equipment: 'Protetor com resposta pendente', ca: '999999' } }],
      mobileSync: { baseSnapshotHash: '9'.repeat(64), snapshot } };
    setPullResponse(async () => ({ latestVersion: Date.now(), characterizations: [{ ...parent,
      homogeneousGroup: { hierarchyOnHomogeneous: [], riskFactorData: [remoteRisk] },
      mobileSync: { baseSnapshotHash: '8'.repeat(64), snapshot: characterizationSnapshot(parent, []) } }] }));
    await pullCharacterizations({ userId: 11, companyId, workspaceId });
    const pending = (await journal.read()).entries.filter((entry) => entry.operation.entityId === riskId && entry.operation.kind === 'RISK_DATA');
    assert.equal(pending.length, 0, 'a server download must not become an unrequested EPI correction');
  });

  it('keeps web-only technical content opaque across pull, an offline edit and its acknowledgement', async () => {
    const { setPullResponse } = require('./pull-http-boundary.cjs');
    const { pullCharacterizations } = require('../../src/libs/sync/pull.ts');
    const parent = await nextCharacter({ name: 'Visita com conteúdo técnico web', description: 'Descrição original' });
    const local = (await companies.getAll(workspaceId, 11)).characterizations.find((row) => row.characterization.id === parent.id);
    const ownSnapshot = characterizationSnapshot(local.characterization, []);
    const technicalDetails = { version: 1, activities: ['Operar máquina', 'Inspecionar peça'],
      paragraphs: ['Parágrafo escrito pela equipe web'], considerations: ['Conclusão técnica'], riskInventorySummary: 'Resumo técnico preservado' };
    const remoteSnapshot = { ...ownSnapshot, companyId, workspaceId, technicalDetails };
    await journal.setBase('CHARACTERIZATION', parent.id, { baseSnapshotHash: '2'.repeat(64), snapshot: ownSnapshot, localSnapshot: ownSnapshot });
    const server = { ...remoteSnapshot, created_at: new Date('2026-01-01'), updated_at: new Date('2026-10-25'),
      homogeneousGroup: { hierarchyOnHomogeneous: [], riskFactorData: [] },
      mobileSync: { baseSnapshotHash: '3'.repeat(64), snapshot: remoteSnapshot } };
    setPullResponse(async () => ({ latestVersion: Date.now(), characterizations: [server] }));
    await pullCharacterizations({ userId: 11, companyId, workspaceId });
    await captureVisit(journal);
    let document = await journal.read();
    assert.deepEqual(document.bases[`CHARACTERIZATION:${parent.id}`].snapshot.technicalDetails, technicalDetails);
    assert.equal(document.entries.some((entry) => entry.operation.kind === 'CHARACTERIZATION' && entry.operation.entityId === parent.id), false,
      'opaque server fields must not fabricate a write when the offline form has no matching fields');

    await characterizations.update(parent.id, { description: 'Descrição coletada offline' });
    await captureVisit(journal);
    document = await journal.read();
    const operation = document.entries.filter((entry) => entry.operation.kind === 'CHARACTERIZATION' && entry.operation.entityId === parent.id).at(-1).operation;
    assert.deepEqual(operation.payload, { description: 'Descrição coletada offline' });
    assert.equal(operation.baseSnapshotHash, '3'.repeat(64));
    for (const key of ['activities', 'paragraphs', 'considerations', 'riskInventorySummary', 'technicalDetails', 'companyId', 'workspaceId'])
      assert.equal(key in operation.payload, false, `the mobile patch must not own ${key}`);

    const snapshot = { ...remoteSnapshot, description: 'Descrição coletada offline' };
    await journal.updateReceipt({ operationId: operation.operationId, kind: operation.kind, entityId: parent.id,
      state: 'APPLIED', receivedAt: new Date().toISOString(), appliedAt: new Date().toISOString(),
      baseSnapshotHash: '4'.repeat(64), snapshot, result: { id: parent.id } });
    await captureVisit(journal);
    document = await journal.read();
    assert.deepEqual(document.bases[`CHARACTERIZATION:${parent.id}`].snapshot.technicalDetails, technicalDetails);
    assert.equal(document.bases[`CHARACTERIZATION:${parent.id}`].baseSnapshotHash, '4'.repeat(64));
    assert.equal(document.entries.filter((entry) => entry.operation.kind === 'CHARACTERIZATION' && entry.operation.entityId === parent.id).length, 1,
      'acknowledging a technical snapshot must not create another version or re-send opaque data');
  });

  it('downloads only current cargo links and preserves every historical link date in the opaque base and ACK', async () => {
    const { setPullResponse } = require('./pull-http-boundary.cjs');
    const { pullCharacterizations } = require('../../src/libs/sync/pull.ts');
    const parent = await nextCharacter({ name: 'Visita com períodos de cargo', description: 'Base sem edição' });
    const hierarchyIds = { current: randomUUID(), closed: randomUUID(), removed: randomUUID() };
    await opened.db.write(async () => {
      for (const [name, id] of Object.entries(hierarchyIds)) await opened.db.get('Hierarchy').create((row) => {
        row._raw.id = id; row.apiId = id; row.name = name; row.type = 'OFFICE'; row.companyId = companyId;
        row.status = 'ACTIVE'; row.userId = '11'; row.created_at = new Date(); row.updated_at = new Date();
      });
    });
    const local = (await companies.getAll(workspaceId, 11)).characterizations.find((row) => row.characterization.id === parent.id);
    const original = characterizationSnapshot(local.characterization, []);
    await journal.setBase('CHARACTERIZATION', parent.id, { baseSnapshotHash: '5'.repeat(64), snapshot: original, localSnapshot: original });
    const hierarchyDetails = [
      { id: 1, hierarchyId: hierarchyIds.closed, homogeneousGroupId: parent.id, startDate: '2026-01-01T00:00:00.000Z', endDate: '2026-04-01T00:00:00.000Z', deletedAt: null },
      { id: 2, hierarchyId: hierarchyIds.current, homogeneousGroupId: parent.id, startDate: '2026-04-01T00:00:00.000Z', endDate: null, deletedAt: null },
      { id: 3, hierarchyId: hierarchyIds.removed, homogeneousGroupId: parent.id, startDate: null, endDate: null, deletedAt: '2026-03-01T00:00:00.000Z' },
    ];
    const snapshot = { ...original, companyId, workspaceId, hierarchyIds: [hierarchyIds.current], hierarchyDetails };
    const server = { ...snapshot, created_at: new Date('2026-01-01'), updated_at: new Date('2026-10-25'),
      homogeneousGroup: { hierarchyOnHomogeneous: hierarchyDetails, riskFactorData: [] },
      mobileSync: { baseSnapshotHash: '6'.repeat(64), snapshot } };
    setPullResponse(async () => ({ latestVersion: Date.now(), characterizations: [server] }));
    await pullCharacterizations({ userId: 11, companyId, workspaceId });
    const relations = await opened.db.get('MMCharacterizationHierarchy').query().fetch();
    assert.deepEqual(relations.filter((row) => row.characterizationId === parent.id).map((row) => row.hierarchyId), [hierarchyIds.current],
      'closed/deleted cargo links must not reappear as current links on the appliance');
    await captureVisit(journal);
    let document = await journal.read();
    assert.deepEqual(document.bases[`CHARACTERIZATION:${parent.id}`].snapshot.hierarchyDetails, hierarchyDetails);
    assert.equal(document.entries.some((entry) => entry.operation.kind === 'CHARACTERIZATION' && entry.operation.entityId === parent.id), false,
      'the filtered pull must not manufacture a cargo-link edit');

    await characterizations.update(parent.id, { description: 'Nova descrição offline' });
    await captureVisit(journal);
    const entry = (await journal.read()).entries.filter((row) => row.operation.kind === 'CHARACTERIZATION' && row.operation.entityId === parent.id).at(-1);
    assert.deepEqual(entry.operation.payload, { description: 'Nova descrição offline' });
    assert.equal(entry.operation.baseSnapshotHash, '6'.repeat(64));
    const finalSnapshot = { ...snapshot, description: 'Nova descrição offline', hierarchyDetails: hierarchyDetails.map((link) =>
      link.id === 2 ? { ...link, startDate: '2026-04-02T00:00:00.000Z' } : link) };
    await journal.updateReceipt({ operationId: entry.operation.operationId, kind: 'CHARACTERIZATION', entityId: parent.id,
      state: 'APPLIED', receivedAt: new Date().toISOString(), appliedAt: new Date().toISOString(),
      baseSnapshotHash: '7'.repeat(64), snapshot: finalSnapshot, result: { id: parent.id } });
    await captureVisit(journal);
    document = await journal.read();
    assert.deepEqual(document.bases[`CHARACTERIZATION:${parent.id}`].snapshot.hierarchyDetails, finalSnapshot.hierarchyDetails);
    assert.equal(document.bases[`CHARACTERIZATION:${parent.id}`].baseSnapshotHash, '7'.repeat(64));
    assert.equal(document.entries.filter((row) => row.operation.kind === 'CHARACTERIZATION' && row.operation.entityId === parent.id).length, 1,
      'a final server date in the ACK must stay opaque rather than be echoed back as a new edit');
  });

  it('editing a photo creates a new identity, preserves original evidence and hides the soft-deleted old version', async () => {
    const parent = await nextCharacter({ photos: [{ photoUrl: 'file:///synthetic/documents/original-photo.jpg' }] });
    const original = (await characterizations.findOne(parent.id)).photos[0];
    const serverId = randomUUID();
    await opened.db.write(() => original.update((row) => { row.apiId = serverId; }));
    await characterizations.update(parent.id, { photos: [{ id: original.id, apiId: serverId, photoUrl: 'file:///synthetic/documents/edited-photo.jpg' }] });
    const visible = (await characterizations.findOne(parent.id)).photos;
    assert.equal(visible.length, 1); assert.notEqual(visible[0].id, original.id);
    assert.equal(visible[0].photoUrl, 'file:///synthetic/documents/edited-photo.jpg');
    const archived = await opened.db.get('CompanyCharacterizationPhoto').find(original.id);
    assert.ok(archived.deleted_at); assert.equal(archived.photoUrl, 'file:///synthetic/documents/original-photo.jpg');
    const read = (await companies.getAll(workspaceId, 11)).characterizations.find((row) => row.characterization.id === parent.id);
    assert.deepEqual(read.photos.map((photo) => photo.id), [visible[0].id]);
    await captureVisit(journal);
    const entries = (await journal.read()).entries;
    assert.ok(entries.find((entry) => entry.operation.kind === 'PHOTO_DELETE' && entry.operation.entityId === serverId));
    assert.ok(entries.find((entry) => entry.operation.kind === 'PHOTO' && entry.operation.entityId === visible[0].id));
    assert.equal(entries.some((entry) => entry.operation.kind === 'PHOTO' && entry.operation.entityId === original.id), false);
  });

  it('removing an acknowledged audio preserves its original URI in an atomic deletion operation', async () => {
    const audioId = randomUUID(), serverId = randomUUID();
    const parent = await nextCharacter({ audios: [{ id: audioId, apiId: serverId, uri: 'file:///synthetic/documents/original-audio.m4a' }] });
    await characterizations.update(parent.id, { audios: [] });
    assert.deepEqual(JSON.parse((await characterizations.findOne(parent.id)).characterization.audios), []);
    const deletion = (await journal.read()).entries.find((entry) => entry.operation.kind === 'FILE_DELETE' && entry.operation.entityId === serverId);
    assert.ok(deletion);
    assert.equal(deletion.operation.payload.sourceSnapshot.uri, 'file:///synthetic/documents/original-audio.m4a');
    assert.equal(deletion.receipt.state, 'PENDING');
  });

  it('a media receipt cannot acknowledge a newer URI edited during its upload', async () => {
    const { acknowledgeMedia } = require('../../src/libs/sync/acknowledgeMedia.ts');
    const parent = await nextCharacter({ photos: [{ photoUrl: 'file:///synthetic/documents/in-flight-original.jpg' }], audios: [{ id: randomUUID(), uri: 'file:///synthetic/documents/in-flight-original.m4a' }] });
    await captureVisit(journal);
    const media = (await journal.read()).entries.filter((entry) => ['PHOTO', 'AUDIO'].includes(entry.operation.kind) && entry.operation.payload.characterizationId === parent.id);
    assert.equal(media.length, 2);
    const originalPhoto = (await characterizations.findOne(parent.id)).photos[0];
    await characterizations.update(parent.id, { photos: [{ id: originalPhoto.id, photoUrl: 'file:///synthetic/documents/edited-while-uploading.jpg' }], audios: [{ id: randomUUID(), uri: 'file:///synthetic/documents/edited-while-uploading.m4a' }] });
    for (const entry of media) await journal.updateReceipt({ operationId: entry.operation.operationId, kind: entry.operation.kind, entityId: entry.operation.entityId, state: 'APPLIED', durable: true, receivedAt: new Date().toISOString(), appliedAt: new Date().toISOString(), result: { id: randomUUID() } });
    await acknowledgeMedia(journal);
    const latest = await characterizations.findOne(parent.id);
    assert.equal(latest.photos[0].photoUrl, 'file:///synthetic/documents/edited-while-uploading.jpg');
    assert.equal(!!latest.photos[0].apiId, false);
    const audio = JSON.parse(latest.characterization.audios)[0];
    assert.equal(audio.uri, 'file:///synthetic/documents/edited-while-uploading.m4a');
    assert.equal(!!audio.apiId, false);
    assert.equal((await journal.read()).entries.filter((entry) => media.some((original) => entry.operation.operationId === original.operation.operationId)).length, 2);
  });

  it('a failed tombstone transaction leaves the source visible and recoverable', async () => {
    const parent = await nextCharacter();
    const sql = new DatabaseSync(join(directory, 'visit.db'));
    sql.exec("CREATE TRIGGER planner_fail_tombstone BEFORE INSERT ON SyncOperation WHEN NEW.record_type = 'OPERATION' BEGIN SELECT RAISE(ABORT, 'SYNTHETIC_TOMBSTONE_FAILURE'); END");
    try {
      await assert.rejects(characterizations.delete(parent.id), /SYNTHETIC_TOMBSTONE_FAILURE/);
      assert.equal(sql.prepare('SELECT status FROM CompanyCharacterization WHERE id=?').get(parent.id).status, 'ACTIVE');
      assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM SyncOperation WHERE data LIKE ?").get(`%${parent.id}%`).n, 0);
    } finally { sql.exec('DROP TRIGGER planner_fail_tombstone'); sql.close(); }
  });
});
