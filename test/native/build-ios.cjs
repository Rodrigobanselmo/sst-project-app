#!/usr/bin/env node
// Build the real app with an embedded JS bundle for offline simulator tests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const { X509Certificate } = require('node:crypto');

const appRoot = path.resolve(__dirname, '../..');
const args = process.argv.slice(2);
function option(name) {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}
const usage = `Build an iOS simulator app that starts without Metro.

Node 22 is required. Prepare ios/ and install its Pods before running this helper.
Usage:
  node test/native/build-ios.cjs --fixture /absolute/native/fixture.json \\
    --device SIMULATOR_UUID [--output /absolute/evidence/ios]
  node test/native/build-ios.cjs --api-url http://127.0.0.1:39871 \\
    --device SIMULATOR_UUID [--output /absolute/evidence/ios]

Only a loopback test API and an installed iOS simulator are accepted.
Generated AppDelegate.swift and .xcode.env.local are restored after the build.
If the disposable fixture declares storageCaPath, its public test CA is trusted
only inside that dedicated simulator. Boot the simulator before this operation.
This helper does not install Pods, prebuild the project, boot a device, or publish.
`;

function shellQuote(value) {
  return "'" + value.replace(/'/g, "'\\''") + "'";
}

async function main() {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(usage);
    return;
  }
  assert(Number(process.versions.node.split('.')[0]) >= 22, 'Run this helper with Node 22 or newer.');
  let apiURL = option('--api-url');
  let fixture;
  let fixturePath;
  if (option('--fixture')) {
    fixturePath = path.resolve(option('--fixture'));
    fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    assert.equal(fixture.contract, 'simplesst.native.e2e');
    assert.equal(fixture.version, 1);
    assert.equal(fixture.disposable, true, 'Only a disposable native test fixture is allowed.');
    apiURL = apiURL || fixture.apiURL || fixture.apiUrl;
  }
  assert(apiURL, 'Pass --fixture or an explicit --api-url for the disposable local API.');
  const address = new URL(apiURL);
  assert(['127.0.0.1', 'localhost', '[::1]'].includes(address.hostname), 'The simulator API must be loopback.');
  assert(['http:', 'https:'].includes(address.protocol) && !address.username && !address.password,
    'Use an HTTP(S) API URL without embedded credentials.');
  const device = option('--device');
  assert(/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(device || ''), 'Pass --device with a simulator UUID.');
  const devices = JSON.parse(execFileSync('xcrun', ['simctl', 'list', 'devices', 'available', '--json'], { encoding: 'utf8' }));
  assert(Object.values(devices.devices).flat().some((item) => item.udid === device && item.isAvailable),
    'The requested simulator is unavailable. This helper never targets a physical iPhone.');
  const workspace = path.join(appRoot, 'ios/SimpleSST.xcworkspace');
  const delegatePath = path.join(appRoot, 'ios/SimpleSST/AppDelegate.swift');
  const envPath = path.join(appRoot, 'ios/.xcode.env.local');
  assert(fs.existsSync(workspace) && fs.existsSync(delegatePath) && fs.existsSync(path.join(appRoot, 'ios/Pods/Manifest.lock')),
    'Generate ios/ and install Pods first; this helper does not change dependencies.');
  const prebuiltCore = path.join(appRoot, 'ios/Pods/React-Core-prebuilt/React.xcframework');
  if (fs.existsSync(prebuiltCore)) {
    assert(fs.existsSync(path.join(prebuiltCore, 'ios-arm64_x86_64-simulator/React.framework/React')),
      'The React-Core-prebuilt cache is incomplete: its simulator binary is missing. Reinstall that Pod and run pod install before building.');
  }
  const output = path.resolve(option('--output') || path.join(appRoot, '../sst-project-api/.diag-tmp/mobile-native-validation/ios'));
  fs.mkdirSync(output, { recursive: true });
  const originalDelegate = fs.readFileSync(delegatePath);
  const originalEnv = fs.existsSync(envPath) ? fs.readFileSync(envPath) : undefined;
  const envMode = originalEnv ? fs.statSync(envPath).mode : 0o600;
  const source = originalDelegate.toString('utf8');
  const anchor = '#if DEBUG\n    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")';
  const patch = '#if DEBUG\n    // Local native validation: a forced embedded bundle survives offline relaunches.\n' +
    '    if let bundled = Bundle.main.url(forResource: "main", withExtension: "jsbundle") {\n' +
    '      return bundled\n    }\n' +
    '    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")';
  assert(source.includes(anchor) || source.includes(patch), 'Unexpected generated AppDelegate; review its bundleURL() before using this helper.');
  let storageCA;
  if (fixture?.storageCaPath) {
    const caPath = path.resolve(path.dirname(fixturePath), fixture.storageCaPath);
    assert(fs.statSync(caPath).size <= 65536, 'The fixture CA must be a small public X.509 certificate.');
    const certificate = new X509Certificate(fs.readFileSync(caPath));
    assert(certificate.ca, 'storageCaPath must contain a CA certificate.');
    // This never invokes macOS security/keychain commands or trusts a host-wide CA.
    execFileSync('xcrun', ['simctl', 'keychain', device, 'add-root-cert', caPath], { stdio: 'pipe' });
    storageCA = { caPath, fingerprint256: certificate.fingerprint256, trustedDevice: device };
  }
  const backup = fs.mkdtempSync(path.join(output, '.ios-native-build-'));
  fs.chmodSync(backup, 0o700);
  fs.writeFileSync(path.join(backup, 'AppDelegate.before.swift'), originalDelegate, { mode: 0o600 });
  if (originalEnv) fs.writeFileSync(path.join(backup, 'xcode-env-local.before'), originalEnv, { mode: 0o600 });
  const derivedData = path.join(output, 'DerivedData');
  const logPath = path.join(output, 'build-standalone.log');
  const startedAt = new Date().toISOString();
  const buildArgs = ['-workspace', workspace, '-scheme', 'SimpleSST', '-configuration', 'Debug',
    '-sdk', 'iphonesimulator', '-destination', `platform=iOS Simulator,id=${device}`,
    '-derivedDataPath', derivedData, '-jobs', '3', 'CODE_SIGNING_ALLOWED=NO',
    'COMPILER_INDEX_STORE_ENABLE=NO', 'build'];
  let interrupted = false;
  let child;
  const interrupt = () => { interrupted = true; child?.kill('SIGINT'); };
  const log = fs.openSync(logPath, 'w', 0o600);
  try {
    // The generated Expo build phase sources this file again after setting SKIP_BUNDLING.
    // Setting SKIP_BUNDLING=0 would still skip; it must be unset.
    const overrides = '\n# Temporary overrides for disposable native simulator validation.\n' +
      `export NODE_BINARY=${shellQuote(process.execPath)}\nexport EXPO_NO_DOTENV=1\n` +
      `export EXPO_PUBLIC_API_URL=${shellQuote(apiURL)}\nexport FORCE_BUNDLING=1\n` +
      'export EXTRA_PACKAGER_ARGS="--dev false"\nunset SKIP_BUNDLING\n';
    fs.writeFileSync(envPath, Buffer.concat([originalEnv || Buffer.alloc(0), Buffer.from(overrides)]), { mode: envMode });
    fs.writeFileSync(delegatePath, source.includes(patch) ? source : source.replace(anchor, patch));
    process.on('SIGINT', interrupt);
    process.on('SIGTERM', interrupt);
    console.log(`Building simulator ${device}; log: ${logPath}`);
    const result = await new Promise((done, reject) => {
      child = spawn('xcodebuild', buildArgs, { cwd: appRoot, env: {
        ...process.env, EXPO_NO_DOTENV: '1', EXPO_PUBLIC_API_URL: apiURL,
        NODE_BINARY: process.execPath, RCT_NO_LAUNCH_PACKAGER: '1',
        PATH: path.dirname(process.execPath) + path.delimiter + (process.env.PATH || ''),
      }, stdio: ['ignore', log, log] });
      child.once('error', reject);
      child.once('exit', (code, signal) => done({ code, signal }));
    });
    const appPath = path.join(derivedData, 'Build/Products/Debug-iphonesimulator/SimpleSST.app');
    const bundlePath = path.join(appPath, 'main.jsbundle');
    const report = { startedAt, finishedAt: new Date().toISOString(), device, apiURL, configuration: 'Debug',
      javaScriptDev: false, fixturePath, storageCA, code: result.code, signal: result.signal, interrupted, appPath, bundlePath,
      embeddedBundlePresent: fs.existsSync(bundlePath),
      embeddedReactPresent: fs.existsSync(path.join(appPath, 'Frameworks/React.framework/React')), logPath };
    fs.writeFileSync(path.join(output, 'build-standalone.json'), JSON.stringify(report, null, 2) + '\n');
    assert.equal(result.code, 0, `xcodebuild failed (${result.code ?? result.signal}); inspect ${logPath}.`);
    assert(fs.existsSync(bundlePath), 'Build succeeded without main.jsbundle; offline relaunch cannot be validated.');
    if (fs.existsSync(prebuiltCore)) assert(report.embeddedReactPresent,
      'The app is missing its React runtime. Run pod install after repairing an incomplete prebuilt cache to regenerate the embed phase.');
    console.log(`Standalone simulator app ready: ${appPath}`);
  } finally {
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', interrupt);
    fs.closeSync(log);
    fs.writeFileSync(delegatePath, originalDelegate);
    if (originalEnv) fs.writeFileSync(envPath, originalEnv, { mode: envMode });
    else fs.rmSync(envPath, { force: true });
    fs.rmSync(backup, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
