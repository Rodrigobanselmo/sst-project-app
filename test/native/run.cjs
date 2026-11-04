#!/usr/bin/env node
// UI tests run against a disposable API created by test/api/run.cjs --native-mobile.
const assert = require('node:assert/strict');
const { readFileSync, mkdirSync, writeFileSync, existsSync } = require('node:fs');
const { resolve, join, dirname } = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const { randomUUID, createHash } = require('node:crypto');
const { homedir } = require('node:os');

const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
}
function execute(binary, command, log) {
  return new Promise((done, reject) => {
    const child = spawn(binary, command, { env: {
      ...process.env, MAESTRO_CLI_NO_ANALYTICS: '1', MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: 'true',
      MAESTRO_DRIVER_STARTUP_TIMEOUT: '180000',
    }, stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = [];
    for (const source of [child.stdout, child.stderr]) source.on('data', (chunk) => {
      chunks.push(chunk); process.stdout.write(chunk);
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      writeFileSync(log, Buffer.concat(chunks));
      done({ code, signal });
    });
  });
}

async function main() {
  assert(option('--fixture'), 'Pass --fixture pointing to the disposable native/fixture.json.');
  const fixturePath = resolve(option('--fixture'));
  const baseFixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
  assert.equal(baseFixture.contract, 'simplesst.native.e2e', 'Only the native test fixture is allowed.');
  assert.equal(baseFixture.version, 1);
  assert.equal(baseFixture.disposable, true, 'A disposable database fixture is required.');
  const profile = option('--profile', 'normal');
  assert(['normal', 'protected'].includes(profile), 'Pass --profile normal|protected.');
  const fixture = profile === 'normal' ? baseFixture : { ...baseFixture, ...baseFixture.protectedFixture };
  const apiURL = fixture.apiURL || fixture.apiUrl;
  const address = new URL(apiURL);
  assert(['127.0.0.1', 'localhost'].includes(address.hostname), 'The test API must be local.');
  const platform = option('--platform');
  assert(['ios', 'android'].includes(platform), 'Pass --platform ios|android.');
  const device = option('--device');
  assert(device, 'Pass a dedicated simulator/emulator --device; app state is reset in the first flow.');
  assert(platform === 'android' ? /^emulator-\d+$/.test(device) : /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(device),
    'Only dedicated simulator/emulator IDs are accepted by this suite.');
  const maestro = option('--maestro', process.env.MAESTRO_BIN || 'maestro');
  const output = resolve(option('--output', join(fixturePath, '..', platform, profile)));
  mkdirSync(output, { recursive: true });
  const headers = { 'x-native-test-token': fixture.controlToken, 'content-type': 'application/json' };
  async function request(path, body) {
    const response = await fetch(new URL(path, address), { method: body ? 'POST' : 'GET', headers,
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) });
    assert(response.ok, `Native test control ${path} returned ${response.status}.`);
    return response.json();
  }
  const initialStatus = await request('/__native_test/status');
  const first = fixture.characterizations[0];
  const initialSources = profile === 'normal' ? initialStatus : initialStatus.protected;
  const currentFirst = initialSources.characterizations.find((item) => item.id === first.id);
  const contextPath = join(output, 'run-context.json');
  const continuing = option('--flow') && option('--flow') !== '01-login-download';
  assert(!continuing || existsSync(contextPath), 'Start with flow 01 so later phases share the same unique draft markers.');
  const previous = continuing ? JSON.parse(readFileSync(contextPath, 'utf8')) : undefined;
  if (previous) {
    assert.equal(previous.fixturePath, fixturePath); assert.equal(previous.platform, platform); assert.equal(previous.profile, profile);
  }
  const marker = randomUUID().slice(0, 8);
  const protectedBaselines = previous?.protectedBaselines || baseFixture.protectedFixture.risks.slice(0, 2)
    .map((risk) => initialStatus.protected.assessments.find((item) => item.riskId === risk.id && !item.endDate));
  const protectedDates = initialStatus.protected.assessments.map((item) => Date.parse(item.startDate));
  const commonDate = new Date(Math.max(Date.UTC(2026, 9, 23), ...protectedDates.filter(Number.isFinite)) + 86400000);
  const exceptionDate = new Date(commonDate.getTime() + 86400000);
  const brazilian = (date) => date.toISOString().slice(0, 10).split('-').reverse().join('/');
  const probability = String(initialStatus.protected.assessments.find((item) => !item.endDate && item.riskId === baseFixture.protectedFixture.risks[0].id)?.probability === 4 ? 5 : 4);
  const environment = {
    EMAIL: fixture.email, PASSWORD: fixture.password,
    COMPANY_NAME: fixture.companyName, WORKSPACE_NAME: fixture.workspaceName,
    ...(previous?.environment || {
      CHARACTERIZATION_NAME: currentFirst?.name || first.name,
      EDITED_NAME: `Visita ${platform} ${marker}`,
      RECOVERY_DRAFT_NAME: `Resgate ${platform} ${marker}`,
      COMMON_DATE: brazilian(commonDate), COMMON_DATE_DIGITS: brazilian(commonDate).replaceAll('/', ''),
      EXCEPTION_DATE: brazilian(exceptionDate), EXCEPTION_DATE_DIGITS: brazilian(exceptionDate).replaceAll('/', ''),
      TARGET_PROBABILITY: probability,
      PROTECTED_CHAR_1: baseFixture.protectedFixture.characterizations[0].name,
      PROTECTED_CHAR_2: baseFixture.protectedFixture.characterizations[1].name,
      RISK_1: baseFixture.protectedFixture.risks[0].name, RISK_2: baseFixture.protectedFixture.risks[1].name,
    }),
  };
  if (!previous) writeFileSync(contextPath, JSON.stringify({ fixturePath, platform, profile,
    protectedBaselines, environment: { ...environment, EMAIL: undefined, PASSWORD: undefined } }, null, 2));
  for (const [name, value] of Object.entries(environment)) assert.equal(typeof value, 'string', `Missing fixture ${name}.`);
  const flows = (profile === 'normal' ? [
    ['01-login-download', { syncMode: 'normal', mutationMode: 'normal' }],
    ['02-default-date', { syncMode: 'normal' }],
    ['03-continue-without-refresh', { syncMode: 'delay', delayMs: 30000 }],
    ['04-restart-unavailable', { syncMode: 'fail' }],
    ['05-sync-pending', { syncMode: 'normal', mutationMode: 'normal' }],
    ['06-recovery', { syncMode: 'normal', mutationMode: 'fail' }],
  ] : [
    ['01-login-download', { syncMode: 'normal', mutationMode: 'normal' }],
    ['02-default-date', { syncMode: 'normal' }],
    ['07-protected-risks', { syncMode: 'normal', mutationMode: 'normal' }],
    ['08-batch-exception', { syncMode: 'normal', mutationMode: 'normal' }],
  ]).filter(([name]) => !option('--flow') || name === option('--flow'));
  assert(flows.length, 'Unknown --flow.');
  const summaryPath = join(output, 'summary.json');
  const results = continuing && existsSync(summaryPath) ? JSON.parse(readFileSync(summaryPath, 'utf8')) : [];
  try {
    for (const [name, control] of flows) {
      console.log(`\n[${platform}] ${name}`);
      await request('/__native_test/control', control);
      const directory = join(output, name); mkdirSync(directory, { recursive: true });
      const command = ['--udid', device, 'test', '--format', 'JUNIT', '--output', join(directory, 'results.xml'),
        '--test-output-dir', directory, ...Object.entries(environment).flatMap(([key, value]) => ['-e', `${key}=${value}`]),
        join(__dirname, 'flows', `${name}.yaml`)];
      const began = Date.now();
      const result = await execute(maestro, command, join(directory, 'maestro.log'));
      const status = await request('/__native_test/status');
      writeFileSync(join(directory, 'server-status.json'), JSON.stringify(status, null, 2));
      let verificationError;
      try {
        if (result.code === 0 && name === '07-protected-risks') {
          const oldOperations = new Set(initialStatus.protected.operations.map((item) => item.operationId));
          for (const baseline of protectedBaselines) {
            const current = status.protected.assessments.find((item) => item.id === baseline.id);
            assert.equal(current.probability, baseline.probability, 'An undecided protected risk was changed.');
            assert.equal(current.endDate, baseline.endDate, 'An undecided protected period was closed.');
            assert(status.protected.operations.some((item) => !oldOperations.has(item.operationId) && item.entityId === baseline.id && item.state === 'NEEDS_REVIEW' &&
              item.error?.code === 'SST_DECISION_REQUIRED' && item.payload.probability === Number(environment.TARGET_PROBABILITY)),
              'The protected risk must remain explicitly pending before the decision.');
          }
        }
        if (result.code === 0 && name === '08-batch-exception') {
          for (const [index, baseline] of protectedBaselines.entries()) {
            const desiredDate = (index ? environment.EXCEPTION_DATE : environment.COMMON_DATE).split('/').reverse().join('-');
            const active = status.protected.assessments.find((item) => item.riskId === baseline.riskId && !item.endDate);
            assert(active && active.id !== baseline.id, 'A new condition must preserve the old risk assessment.');
            assert.equal(active.probability, Number(environment.TARGET_PROBABILITY));
            assert.equal(active.startDate.slice(0, 10), desiredDate);
            const old = status.protected.assessments.find((item) => item.id === baseline.id);
            assert(old, 'The old assessment must remain present.');
            assert.equal(old.probability, baseline.probability);
            assert.equal(old.startDate, baseline.startDate);
            assert.equal(old.endDate?.slice(0, 10), desiredDate, 'The old period must close on the chosen boundary.');
          }
        }
        if (result.code === 0 && name === '08-batch-exception') {
          const replaced = new Set(protectedBaselines.map((item) => item.id));
          for (const prior of initialStatus.protected.assessments.filter((item) => !replaced.has(item.id))) {
            assert.deepEqual(status.protected.assessments.find((item) => item.id === prior.id), prior,
              'Unselected risks and earlier historical assessments must remain unchanged.');
          }
        }
        if (result.code === 0 && name === '05-sync-pending') {
          assert.equal(status.characterizations.find((item) => item.id === first.id)?.name, environment.EDITED_NAME,
            'UI completed, but the real API did not persist the edited name.');
        }
        if (result.code === 0 && name === '06-recovery') {
          assert.equal(status.characterizations.find((item) => item.id === first.id)?.name, environment.EDITED_NAME,
            'The failed normal synchronization must not apply the recovery-only draft.');
          assert(status.recentRequests.some((item) => item.status === 503 && Date.parse(item.at) >= began &&
            String(item.path).startsWith(`/companies/${fixture.companyId}/mobile-sync/`)),
            'The test must exercise a failed normal sync before sending the recovery.');
          const previousPackages = new Set(initialStatus.recoveryPackages.map((item) => item.id));
          const packages = status.recoveryPackages.filter((item) => !previousPackages.has(item.id) && item.state === 'COMPLETE');
          assert(packages.length, 'UI completed, but no new COMPLETE recovery package was saved.');
          let recoveredDraft = false;
          for (const pkg of packages) {
            const manifest = pkg.manifest;
            for (const asset of manifest.assets) {
              const object = status.objects.find((item) => item.key.includes(`/${pkg.id}/${asset.assetId}/`)
                && item.size === asset.size && item.sha256 === asset.sha256);
              assert(object, `Recovery asset ${asset.assetId} is missing or corrupt.`);
              const bytes = readFileSync(join(dirname(fixturePath), 'private-objects', createHash('sha256').update(object.key).digest('hex')));
              assert.equal(bytes.length, asset.size);
              assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256);
              if (asset.assetId === manifest.rawAssetId) {
                const raw = JSON.parse(bytes.toString('utf8'));
                assert.equal(raw.format, 'simplesst.visit.raw'); assert.equal(raw.version, 1);
                assert.equal(raw.context.companyId, fixture.companyId); assert.equal(raw.context.workspaceId, fixture.workspaceId);
                const parent = raw.tables.CompanyCharacterization.find((item) => item.apiId === first.id || item.id === first.id);
                assert(parent, 'The failed draft must exist in the exported source table.');
                recoveredDraft ||= parent.name === environment.RECOVERY_DRAFT_NAME;
                const risks = raw.tables.RiskData.filter((item) => [parent.id, parent.apiId].includes(item.characterizationId));
                assert.equal(risks.length, fixture.risks.length, 'The recovery must preserve all three risk families.');
                const riskIds = new Set(risks.flatMap((item) => [item.id, item.apiId]));
                assert(raw.tables.MMGenerateToRiskData.some((item) => riskIds.has(item.riskDataId)), 'Generating source relation is missing.');
                const epi = raw.tables.MMEpisToRiskData.find((item) => riskIds.has(item.riskDataId) && item.epiId === fixture.epiId);
                assert(epi, 'EPI relation is missing.');
                for (const [field, expected] of Object.entries({ efficientlyCheck: true, epcCheck: false, lifeTimeInDays: 180,
                  longPeriodsCheck: false, maintenanceCheck: false, sanitationCheck: false, tradeSignCheck: false,
                  trainingCheck: false, unstoppedCheck: false, validationCheck: true })) {
                  assert.equal(epi[field], expected, `The recovery must preserve the original EPI answer: ${field}.`);
                }
                assert.deepEqual(raw.readErrors, []);
              }
            }
            assert(status.objects.some((item) => item.key.endsWith(`/${pkg.id}/manifest.json`)),
              'The final private manifest was not stored.');
          }
          assert(recoveredDraft, 'The recovery JSON must contain the draft that could not be applied.');
        }
      } catch (error) { verificationError = error.message; }
      const entry = { flow: name, platform, profile, ...result, verificationError,
        passed: result.code === 0 && !verificationError, elapsedMs: Date.now() - began };
      const previousResult = results.findIndex((item) => item.flow === name);
      if (previousResult >= 0) results.splice(previousResult, 1);
      results.push(entry);
      writeFileSync(join(directory, 'result.json'), JSON.stringify(entry, null, 2));
      writeFileSync(summaryPath, JSON.stringify(results, null, 2));
      assert.equal(result.code, 0, `Native UI flow failed: ${name}; inspect ${directory}.`);
      assert(!verificationError, verificationError);
    }
  } finally {
    await request('/__native_test/control', { syncMode: 'normal', mutationMode: 'normal' }).catch(() => undefined);
    if (platform === 'android') {
      const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || join(homedir(), 'Library/Android/sdk');
      // The device guard above restricts this cleanup to the explicitly selected emulator.
      try { execFileSync(join(sdk, 'platform-tools/adb'), ['-s', device, 'shell', 'cmd', 'connectivity', 'airplane-mode', 'disable'], { stdio: 'ignore' }); }
      catch { console.error('Could not restore emulator connectivity; disable airplane mode before continuing.'); }
    }
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
