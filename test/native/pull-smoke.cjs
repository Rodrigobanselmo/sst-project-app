#!/usr/bin/env node
// Read-only authenticated HTTP from the isolated native fixture, then the real
// app repositories/pull/planner against a new disposable schema-45 SQLite file.
require('../register.cjs');
const assert = require('node:assert/strict');
const { readFileSync, writeFileSync, mkdtempSync, rmSync } = require('node:fs');
const { resolve, dirname, join } = require('node:path');
const { tmpdir } = require('node:os');
const { createHash } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { synchronize } = require('@nozbe/watermelondb/sync');
const { openDatabase } = require('../sync/watermelon-fixture.cjs');
const { bindDatabase } = require('../sync/database-binding.cjs');
const { setPullResponse } = require('../sync/pull-http-boundary.cjs');
const { catalogChangesForUpsert } = require('../../src/libs/sync/catalogChanges.ts');
const { pickEpiAnswers } = require('../../src/libs/sync/epiAnswers.ts');
const { collectRawVisit, RAW_VISIT_TABLES } = require('../../src/libs/sync/rawVisit.ts');

async function main() {
  assert(process.argv[2], 'Pass the disposable native/fixture.json.');
  const fixturePath = resolve(process.argv[2]), f = JSON.parse(readFileSync(fixturePath, 'utf8'));
  assert.equal(f.contract, 'simplesst.native.e2e'); assert.equal(f.version, 1); assert.equal(f.disposable, true);
  assert.equal(new URL(f.apiURL).hostname, '127.0.0.1');
  assert.equal(new URL(f.apiURL).protocol, 'http:');
  const directory = mkdtempSync(join(tmpdir(), 'simplesst-native-http-sqlite-'));
  const result = { passed: false, profiles: [], createdAt: new Date().toISOString() };
  try {
    for (const [profile, config] of [['normal', f], ['protected', f.protectedFixture]]) {
      const login = await fetch(`${f.apiURL}/session`, { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: config.email, password: config.password, isApp: true }), signal: AbortSignal.timeout(15000) });
      assert.equal(login.status, 200); const session = await login.json();
      assert(Number.isSafeInteger(session.user.id));
      const headers = { authorization: `Bearer ${session.token}` };
      const get = async (path) => {
        const response = await fetch(f.apiURL + path, { headers, signal: AbortSignal.timeout(15000) });
        assert.equal(response.status, 200, `Fixture ${profile} read ${path.split('?')[0]} returned ${response.status}`);
        return response.json();
      };
      const catalog = await get(`/sync?companyIds=${config.companyId}&companyStartIds=${config.companyId}`);
      const remote = await get(`/sync/characterization?companyId=${config.companyId}&workspaceId=${config.workspaceId}`);
      const context = { userId: session.user.id, companyId: config.companyId, workspaceId: config.workspaceId };
      const filename = join(directory, `${profile}.db`);
      let opened = await openDatabase(filename);
      const bind = () => { bindDatabase(opened.db); require('../../src/libs/sync/storage.ts').syncStorage = opened.storage; };
      try {
        bind();
        for (let replay = 0; replay < 2; replay++) await synchronize({ database: opened.db, sendCreatedAsUpdated: true,
          pullChanges: async () => ({ changes: catalogChangesForUpsert(catalog.changes, context.userId), timestamp: catalog.latestVersion + replay }) });
        if (profile === 'protected') {
          const employee = await opened.db.get('Employee').find(String(config.employeeId));
          assert.equal(employee.apiId, config.employeeId);
          assert.equal(employee.userId, String(context.userId));
        }
        setPullResponse(async () => structuredClone(remote));
        const { pullCharacterizations } = require('../../src/libs/sync/pull.ts');
        const { RiskDataRepository } = require('../../src/repositories/riskDataRepository.ts');
        const { CharacterizationRepository } = require('../../src/repositories/characterizationRepository.ts');
        const { createSyncJournal } = require('../../src/libs/sync/storage.ts');
        const { captureVisit } = require('../../src/libs/sync/planner.ts');
        const repository = new RiskDataRepository();
        assert.equal((await pullCharacterizations(context)).complete, true);
        const parents = new CharacterizationRepository();
        for (const remoteParent of remote.characterizations) {
          const { characterization: row } = await parents.findOne(remoteParent.id);
          await parents.update(row.id, { name: row.name, type: row.type,
            description: row.description || '', profileName: row.profileName || '',
            luminosity: row.luminosity || '', noiseValue: row.noiseValue || '',
            temperature: row.temperature || '', moisturePercentage: row.moisturePercentage || '' });
        }
        const remoteRisks = remote.characterizations.flatMap((c) => c.homogeneousGroup?.riskFactorData || []);
        let epiCount = 0;
        for (const risk of remoteRisks) {
          const stored = await opened.db.get('RiskData').find(risk.id), info = await repository.getRiskDataInfo(stored);
          for (const epi of risk.epiToRiskFactorData || []) {
            const fromForm = info.episToRiskData.find((e) => Number(e.id) === epi.epiId);
            assert.deepEqual(pickEpiAnswers(fromForm), pickEpiAnswers(epi)); epiCount++;
          }
          const activities = JSON.parse(stored.activities);
          await repository.update(risk.id, { riskId: risk.riskId, ...info,
            probability: stored.probability, probabilityAfter: stored.probabilityAfter || '',
            exposure: stored.exposure || '', realActivity: activities.realActivity || '',
            activities: activities.activities.map((activity) => ({ name: activity.description, description: activity.subActivity,
              id: activity.description + String(activity.subActivity) })) });
        }
        let journal = await createSyncJournal(context);
        await captureVisit(journal);
        assert.deepEqual((await journal.read()).entries, [], 'Unchanged API data/form saves must produce no operations.');
        opened.close(); opened = await openDatabase(filename); bind();
        journal = await createSyncJournal(context); await captureVisit(journal);
        assert.deepEqual((await journal.read()).entries, [], 'Restart must not fabricate changes.');
        const sql = new DatabaseSync(filename, { readOnly: true });
        let raw;
        try { raw = await collectRawVisit(context, async (table) => {
          assert.ok(RAW_VISIT_TABLES.includes(table)); return sql.prepare(`SELECT * FROM "${table}"`).all();
        }, result.createdAt); } finally { sql.close(); }
        assert.deepEqual(raw.readErrors, []);
        for (const risk of remoteRisks) for (const epi of risk.epiToRiskFactorData || []) {
          const stored = raw.document.tables.MMEpisToRiskData.find((e) => e.riskDataId === risk.id && e.epiId === epi.epiId);
          assert(stored);
          const expected = Object.fromEntries(Object.entries(pickEpiAnswers(epi)).map(([key, value]) => [key, typeof value === 'boolean' ? Number(value) : value]));
          assert.deepEqual(pickEpiAnswers(stored), expected);
          if (profile === 'normal') { assert.equal(stored.lifeTimeInDays, 180); assert.equal(stored.trainingCheck, 0); assert.equal(stored.validationCheck, 1); }
        }
        if (profile === 'normal') assert(epiCount > 0, 'The regression must actually exercise an EPI.');
        result.profiles.push({ profile, authenticated: true, fullCatalogReplays: 2, riskCount: remoteRisks.length,
          epiCount, actualMmAnswersPreserved: true, formSavePreserved: true, emptyFormDefaultsNormalized: true, sqliteRestartPreserved: true,
          fabricatedOperations: 0, rawSha256: createHash('sha256').update(JSON.stringify(raw.document)).digest('hex') });
      } finally { opened.close(); }
    }
    result.passed = true;
    const output = resolve(dirname(fixturePath), 'http-sqlite-pull-smoke.json');
    writeFileSync(output, JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ ...result, output }, null, 2));
  } finally { rmSync(directory, { recursive: true, force: true }); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
