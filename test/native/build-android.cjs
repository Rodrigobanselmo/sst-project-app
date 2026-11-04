#!/usr/bin/env node
// Standalone, debug-signed APK for the disposable native test API. Never publishes.
const assert = require('node:assert/strict');
const { spawn, execFileSync } = require('node:child_process');
const { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, createWriteStream } = require('node:fs');
const { resolve, join, dirname } = require('node:path');
const { homedir } = require('node:os');
const { X509Certificate } = require('node:crypto');

const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  assert(args[index + 1] && !args[index + 1].startsWith('--'), `Missing value for ${name}.`);
  return args[index + 1];
}
function fixtureData(file) {
  const fixture = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(fixture.contract, 'simplesst.native.e2e', 'Only the disposable native test fixture is allowed.');
  assert.equal(fixture.version, 1);
  assert.equal(fixture.disposable, true);
  const apiURL = new URL(fixture.apiURL);
  assert.equal(apiURL.protocol, 'http:');
  assert.equal(apiURL.hostname, '127.0.0.1', 'This APK can target only the local test API.');
  assert(!apiURL.username && !apiURL.password && !apiURL.search && !apiURL.hash);
  assert.equal(apiURL.pathname, '/');
  for (const key of ['apiPort', 'storagePort']) {
    assert(Number.isInteger(fixture[key]) && fixture[key] >= 1024 && fixture[key] <= 65535, `Invalid fixture ${key}.`);
  }
  assert.equal(Number(apiURL.port), fixture.apiPort);
  let storageCA;
  if (fixture.storageURL) {
    const storageURL = new URL(fixture.storageURL);
    assert.equal(storageURL.protocol, 'https:', 'The disposable object store must use HTTPS.');
    assert(['127.0.0.1', 'localhost'].includes(storageURL.hostname), 'Only loopback object storage is allowed.');
    assert(!storageURL.username && !storageURL.password && !storageURL.search && !storageURL.hash);
    assert.equal(Number(storageURL.port), fixture.storagePort);
    assert(fixture.storageCaPath, 'The HTTPS test object store requires its public CA certificate.');
  }
  if (fixture.storageCaPath) {
    assert.equal(typeof fixture.storageCaPath, 'string');
    const path = resolve(dirname(file), fixture.storageCaPath);
    const bytes = readFileSync(path);
    assert(bytes.length <= 64 * 1024, 'The test CA certificate is unexpectedly large.');
    assert(/^\s*-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----\s*$/.test(bytes.toString()) &&
      !bytes.toString().includes('PRIVATE KEY'), 'Supply only the public PEM CA certificate.');
    const certificate = new X509Certificate(bytes);
    assert(certificate.ca, 'The test trust anchor must be a CA certificate.');
    assert(Date.parse(certificate.validFrom) <= Date.now() && Date.parse(certificate.validTo) > Date.now(), 'The test CA certificate must be currently valid.');
    storageCA = { path, bytes };
  }
  return { fixture, apiURL, storageCA };
}

async function main() {
  if (args.includes('--help')) {
    console.log('Usage: node test/native/build-android.cjs --fixture /absolute/native/fixture.json --device emulator-5554 [--sdk /path/to/sdk] [--output /path] [--build-only] [--no-launch]');
    return;
  }
  assert(Number(process.versions.node.split('.')[0]) >= 22, 'Use Node.js 22 or newer.');
  assert(option('--fixture'), 'Pass --fixture pointing to the disposable native/fixture.json.');
  const fixturePath = resolve(option('--fixture'));
  const { fixture, apiURL, storageCA } = fixtureData(fixturePath);
  const device = option('--device');
  assert(/^emulator-\d+$/.test(device || ''), 'Pass a dedicated --device emulator-5554; physical devices are not permitted.');
  const app = resolve(__dirname, '../..');
  const android = join(app, 'android');
  const sdk = resolve(option('--sdk', process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || join(homedir(), 'Library/Android/sdk')));
  const adb = join(sdk, 'platform-tools/adb');
  assert(existsSync(adb), `Android SDK platform-tools are missing at ${sdk}.`);
  assert(existsSync(join(android, 'gradlew')), 'Generate the Android project with Expo prebuild before running this helper.');
  const output = resolve(option('--output', join(dirname(fixturePath), 'android-build')));
  mkdirSync(output, { recursive: true });
  const env = { ...process.env, PATH: `${dirname(process.execPath)}:${process.env.PATH || ''}`,
    ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk,
    EXPO_NO_DOTENV: '1', EXPO_PUBLIC_API_URL: apiURL.origin, NODE_ENV: 'production' };
  if (!env.JAVA_HOME) env.JAVA_HOME = execFileSync('/usr/libexec/java_home', ['-v', '17'], { encoding: 'utf8' }).trim();
  const adbText = (...command) => execFileSync(adb, ['-s', device, ...command], { env, encoding: 'utf8' }).trim();
  assert.equal(adbText('shell', 'getprop', 'ro.kernel.qemu'), '1', 'The selected device must be an Android emulator.');
  assert.equal(adbText('shell', 'getprop', 'sys.boot_completed'), '1', 'Wait for the emulator to finish booting.');

  let child;
  let interrupted = false;
  const handleSignal = () => { interrupted = true; child?.kill('SIGTERM'); };
  process.on('SIGINT', handleSignal); process.on('SIGTERM', handleSignal);
  function execute(binary, command, log) {
    assert(!interrupted, 'Build interrupted.');
    return new Promise((done, reject) => {
      const stream = createWriteStream(log);
      child = spawn(binary, command, { cwd: android, env, stdio: ['ignore', 'pipe', 'pipe'] });
      for (const source of [child.stdout, child.stderr]) source.on('data', (chunk) => stream.write(chunk));
      child.once('error', (error) => { stream.end(); child = undefined; reject(error); });
      child.once('close', (code, signal) => {
        stream.end(() => { child = undefined; code === 0 && !interrupted ? done() : reject(new Error(`Android build failed (${signal || code}); inspect ${log}.`)); });
      });
    });
  }
  const originals = new Map();
  const backups = join(output, 'native-overrides-backup');
  mkdirSync(backups, { recursive: true, mode: 0o700 });
  function override(relative, content) {
    const path = join(android, relative);
    const prior = existsSync(path) ? readFileSync(path) : null;
    originals.set(path, prior);
    // Backups may include existing local signing settings: keep them private.
    if (prior !== null) writeFileSync(join(backups, `${originals.size}.bak`), prior, { mode: 0o600 });
    writeFileSync(join(backups, 'manifest.json'), JSON.stringify([...originals.keys()].map((file, index) => ({ path: file, existed: originals.get(file) !== null, backup: originals.get(file) !== null ? join(backups, `${index + 1}.bak`) : null })), null, 2), { mode: 0o600 });
    mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, content);
  }
  const began = Date.now();
  const generatedBundles = ['app/build/generated/assets/react/release', 'app/build/generated/assets/createBundleReleaseJsAndAssets'];
  let metroTemp;
  try {
    const gradle = join(android, 'app/build.gradle');
    const source = readFileSync(gradle, 'utf8');
    assert(/signingConfig\s+signingConfigs\.(?:release|debug)/.test(source), 'Cannot safely locate the generated signing configuration.');
    override('app/build.gradle', source.replace(/signingConfig\s+signingConfigs\.release/g, 'signingConfig signingConfigs.debug // Local native test only'));
    override('local.properties', `sdk.dir=${sdk.replace(/\\/g, '\\\\').replace(/ /g, '\\ ')}\n`);
    const manifest = 'app/src/release/AndroidManifest.xml';
    const existing = existsSync(join(android, manifest)) ? readFileSync(join(android, manifest), 'utf8') : '';
    assert(!existing || existing.includes('Local emulator validation only') || existing.includes('Local native test only'), 'An existing release manifest requires review before applying a test override.');
    // Trust this fixture's public CA only for loopback. Android system/user trust
    // stores and production configuration remain unchanged.
    if (storageCA) override('app/src/release/res/raw/native_e2e_ca.pem', storageCA.bytes);
    override('app/src/release/res/xml/native_e2e_network_security_config.xml', `<network-security-config>\n  <base-config cleartextTrafficPermitted="false">\n    <trust-anchors><certificates src="system" /></trust-anchors>\n  </base-config>\n  <domain-config cleartextTrafficPermitted="true">\n    <domain includeSubdomains="false">127.0.0.1</domain>\n    <domain includeSubdomains="false">localhost</domain>\n    <trust-anchors>\n      <certificates src="system" />\n${storageCA ? '      <certificates src="@raw/native_e2e_ca" />\n' : ''}    </trust-anchors>\n  </domain-config>\n</network-security-config>\n`);
    override(manifest, `<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools">\n  <!-- Local native test only: the API is reached through adb reverse. -->\n  <application android:usesCleartextTraffic="false" android:networkSecurityConfig="@xml/native_e2e_network_security_config" tools:targetApi="28" tools:replace="android:usesCleartextTraffic,android:networkSecurityConfig" />\n</manifest>\n`);
    // Environment variables are not Gradle inputs. Force only JS rebundling so a
    // previous production bundle can never be reused in a local test APK.
    for (const generated of generatedBundles) {
      rmSync(join(android, generated), { recursive: true, force: true });
    }
    const log = join(output, 'build.log');
    // Expo clears os.tmpdir()/metro-cache when embedding JS. Keep simultaneous
    // iOS and Android test builds from deleting each other's Metro cache.
    metroTemp = mkdtempSync('/tmp/simplesst-native-android-');
    env.TMPDIR = metroTemp;
    console.log(`Building a standalone arm64 APK for ${apiURL.origin}. Log: ${log}`);
    await execute(join(android, 'gradlew'), [':app:assembleRelease', '-PreactNativeArchitectures=arm64-v8a', '--max-workers=2', '--no-daemon', '-Dorg.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m'], log);
    const apk = join(android, 'app/build/outputs/apk/release/app-release.apk');
    assert(existsSync(apk), 'Gradle completed without the expected APK.');
    if (!args.includes('--build-only')) {
      for (const port of new Set([fixture.apiPort, fixture.storagePort])) adbText('reverse', `tcp:${port}`, `tcp:${port}`);
      // Installs only into the explicit emulator; existing local test data is preserved.
      adbText('install', '-r', apk);
      if (!args.includes('--no-launch')) adbText('shell', 'am', 'start', '-W', '-n', 'com.simplesst.app/.MainActivity');
    }
    writeFileSync(join(output, 'build-result.json'), JSON.stringify({ contract: 'simplesst.native.android-build', version: 1, apiURL: apiURL.origin, device, architecture: 'arm64-v8a', signing: 'debug', standalone: true, apk, fixturePath, ...(storageCA && { testCaPath: storageCA.path, testCaHosts: ['127.0.0.1', 'localhost'] }), elapsedMs: Date.now() - began, installed: !args.includes('--build-only'), finishedAt: new Date().toISOString() }, null, 2));
    console.log(`Android test APK ready: ${apk}`);
  } finally {
    for (const [file, bytes] of [...originals].reverse()) bytes === null ? rmSync(file, { force: true }) : writeFileSync(file, bytes);
    // Preserve the standalone APK, but prevent a later local production build
    // from reusing the test API URL cached inside these Gradle task outputs.
    for (const generated of generatedBundles) rmSync(join(android, generated), { recursive: true, force: true });
    if (metroTemp) rmSync(metroTemp, { recursive: true, force: true });
    process.off('SIGINT', handleSignal); process.off('SIGTERM', handleSignal);
    // Complete backups remain available only after an abnormal process termination.
    rmSync(backups, { recursive: true, force: true });
  }
}
module.exports = { fixtureData };
if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
