# iOS simulator build for offline tests

Use Node 22 and an iOS simulator installed through Xcode. The project currently uses Expo SDK 54 / React Native 0.81, whose minimum supported Xcode is 16.1. See the [React Native release documentation](https://reactnative.dev/blog/2025/08/12/react-native-0.81) and [Expo build infrastructure](https://docs.expo.dev/build-reference/infrastructure/).

Prepare the generated `ios/` project and install its Pods using the project's normal Expo workflow before running this helper. It intentionally does not run prebuild, install or update dependencies, upgrade Xcode, select a signing identity, or publish anything.

```sh
node test/native/build-ios.cjs \
  --fixture /absolute/path/to/native/fixture.json \
  --device YOUR_DEDICATED_SIMULATOR_UUID \
  --output /absolute/path/to/evidence/ios
```

`--api-url http://127.0.0.1:39871` can replace `--fixture` when preparing a local disposable API manually. The helper rejects external API addresses and physical device identifiers. Obtain a simulator UUID with `xcrun simctl list devices available`.

The recovery storage fixture uses HTTPS, retaining the real application's secure upload checks. If the disposable fixture includes `storageCaPath`, the helper validates that it is a public CA certificate and runs `xcrun simctl keychain YOUR_SIMULATOR_UUID add-root-cert PATH_TO_TEST_CA`. Boot the dedicated simulator first. Trust is added only to that simulator, never to the Mac's keychain. Delete the disposable simulator after testing to remove its test trust and data. This does not disable TLS verification or alter the production networking configuration.

The normal Debug simulator build depends on Metro. This helper instead temporarily sets `EXPO_NO_DOTENV=1`, the test `EXPO_PUBLIC_API_URL`, Node's executable, and `FORCE_BUNDLING=1`. `EXTRA_PACKAGER_ARGS="--dev false"` creates production JavaScript inside the Debug native binary; Expo development WebSockets cannot run from an embedded bundle. It unsets `SKIP_BUNDLING`: setting it to `0` would still skip the bundle. The generated AppDelegate temporarily prefers the embedded `main.jsbundle`, allowing application restarts while the test API is unavailable.

The native binary remains Debug, preserving native diagnostics and RedBox errors. React Native's `RCTDevLoadingView` briefly displays “Connect to Metro to develop JavaScript.” when a Debug binary loads an embedded file; it automatically hides after 15 seconds. The iOS flows wait for this banner to disappear before screenshots taken soon after a restart. They do not disable development errors or change application code to hide failures.

The generated `.xcode.env.local` and AppDelegate are backed up privately and restored after success, build failure, or a handled interrupt. Backups are removed after restoration. If the process is forcibly killed before cleanup, its `.ios-native-build-*` directory inside the chosen output contains the originals; restore them before resuming normal development. No `.env` file or tracked app configuration is rewritten.

The output contains the actual simulator `.app`, `build-standalone.log`, and `build-standalone.json`. Three compiler jobs and a disabled index store keep the initial build from exhausting the development machine. The helper verifies that the JavaScript bundle and prebuilt React runtime are embedded before declaring success.

Install the generated app on the dedicated simulator, then use the native UI runner. This build alone does not prove a successful visit or synchronization, and simulator tests do not cover physical cameras, background suspension, or low storage.

## Incomplete local Pod cache

The first validation found an old `React-Core-prebuilt` cache containing headers and metadata but no `React` executable. That caused a link failure. Its generated CocoaPods embed phase also omitted React, causing an immediate `DYLD Library missing` crash after only the executable was repaired.

Repair or reinstall the incomplete Pod using its official artifact for the **same locked version**, then run `pod install --no-repo-update` to regenerate the embed phase. Rebuild afterward. Do not work around this by manually adding frameworks to the finished `.app` or changing React Native versions. The helper reports the missing executable or missing embedded runtime so this failure is visible before UI tests.
