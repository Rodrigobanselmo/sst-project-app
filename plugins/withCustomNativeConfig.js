const { withDangerousMod, withAndroidManifest } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Custom config plugin to add custom native configurations
 * 1. Adds simdjson podspec source for WatermelonDB
 * 2. Ensures Android manifest has correct attributes (tools:replace, requestLegacyExternalStorage)
 * 3. Adds keystore configuration to gradle.properties
 * 4. Configures release signing in build.gradle
 */
const withCustomNativeConfig = (config) => {
  // iOS Podfile modifications - add simdjson for WatermelonDB and modular headers
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfileContent = fs.readFileSync(podfilePath, 'utf-8');

      let modified = false;

      // Add use_modular_headers! for Swift pods compatibility FIRST
      if (!podfileContent.includes('use_modular_headers!')) {
        // Add after use_expo_modules! and before use_frameworks!
        const modulesRegex = /(target\s+['"]SimpleSST['"]\s+do\s+use_expo_modules!\s+)/;

        if (modulesRegex.test(podfileContent)) {
          podfileContent = podfileContent.replace(
            modulesRegex,
            `$1\n  use_modular_headers!\n`
          );
          modified = true;
        }
      }

      // Add simdjson pod from node_modules for WatermelonDB
      // WatermelonDB depends on simdjson which needs to be referenced locally
      const simdjsonPod = "  pod 'simdjson', path: '../node_modules/@nozbe/simdjson'\n";

      if (!podfileContent.includes("pod 'simdjson'")) {
        // Add simdjson pod after use_expo_modules! (right after the blank line)
        // This ensures it's added before any conditional statements
        const targetRegex = /(target\s+['"]SimpleSST['"]\s+do\s+use_expo_modules!\s+\n\s+\n\s+use_modular_headers!\s*\n)/;

        if (targetRegex.test(podfileContent)) {
          podfileContent = podfileContent.replace(
            targetRegex,
            `$1${simdjsonPod}`
          );
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(podfilePath, podfileContent);
      }

      return config;
    },
  ]);

  // Android Manifest modifications
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;

    // Remove READ_MEDIA_IMAGES and READ_MEDIA_VIDEO permissions
    // Android 13+ Photo Picker doesn't require these permissions
    if (androidManifest.manifest['uses-permission']) {
      androidManifest.manifest['uses-permission'] = androidManifest.manifest['uses-permission'].filter(
        (permission) => {
          const permissionName = permission.$['android:name'];
          return (
            permissionName !== 'android.permission.READ_MEDIA_IMAGES' &&
            permissionName !== 'android.permission.READ_MEDIA_VIDEO'
          );
        }
      );
    }

    // Ensure the application element has the correct attributes
    if (androidManifest.manifest.application && androidManifest.manifest.application[0]) {
      const application = androidManifest.manifest.application[0];

      // Initialize $ object if not present
      if (!application.$) {
        application.$ = {};
      }

      // Ensure tools namespace is declared in manifest root
      if (!androidManifest.manifest.$) {
        androidManifest.manifest.$ = {};
      }
      if (!androidManifest.manifest.$['xmlns:tools']) {
        androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
      }

      // Add tools:replace for allowBackup
      const existingReplace = application.$['tools:replace'];
      if (!existingReplace) {
        application.$['tools:replace'] = 'android:allowBackup';
      } else if (!existingReplace.includes('android:allowBackup')) {
        application.$['tools:replace'] = existingReplace + ',android:allowBackup';
      }

      // Ensure requestLegacyExternalStorage is set
      if (!application.$['android:requestLegacyExternalStorage']) {
        application.$['android:requestLegacyExternalStorage'] = 'true';
      }

      // Set extractNativeLibs to false for 16KB page size support (Android 15+)
      application.$['android:extractNativeLibs'] = 'false';
    }

    return config;
  });

  // Android gradle.properties modifications
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const gradlePropertiesPath = path.join(
        config.modRequest.platformProjectRoot,
        'gradle.properties'
      );
      let gradlePropertiesContent = fs.readFileSync(gradlePropertiesPath, 'utf-8');

      // Add keystore configuration if not present
      const keystoreConfig = `
# Keystore configuration for release builds
MYAPP_UPLOAD_STORE_FILE=my-upload-key.keystore
MYAPP_UPLOAD_KEY_ALIAS=my-key-alias
MYAPP_UPLOAD_STORE_PASSWORD=-Sil3556725
MYAPP_UPLOAD_KEY_PASSWORD=-Sil3556725`;

      if (!gradlePropertiesContent.includes('MYAPP_UPLOAD_STORE_FILE')) {
        gradlePropertiesContent += keystoreConfig;
        fs.writeFileSync(gradlePropertiesPath, gradlePropertiesContent);
      }

      // Also update build.gradle to use release signing config
      const buildGradlePath = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'build.gradle'
      );
      let buildGradleContent = fs.readFileSync(buildGradlePath, 'utf-8');

      // Add release signing config if not present
      if (!buildGradleContent.includes('signingConfigs.release')) {
        // Add release signing config after debug signing config
        const releaseSigningConfig = `        release {
            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                storeFile file('../../' + MYAPP_UPLOAD_STORE_FILE)
                storePassword MYAPP_UPLOAD_STORE_PASSWORD
                keyAlias MYAPP_UPLOAD_KEY_ALIAS
                keyPassword MYAPP_UPLOAD_KEY_PASSWORD
            }
        }`;

        buildGradleContent = buildGradleContent.replace(
          /(signingConfigs\s*\{[\s\S]*?debug\s*\{[\s\S]*?\}\s*)/,
          `$1\n${releaseSigningConfig}\n`
        );

        // Update buildTypes to use correct signing configs
        // First, ensure debug uses debug signing config
        buildGradleContent = buildGradleContent.replace(
          /(buildTypes\s*\{[\s\S]*?debug\s*\{[\s\S]*?)signingConfig signingConfigs\.\w+/,
          '$1signingConfig signingConfigs.debug'
        );

        // Then, ensure release uses release signing config
        buildGradleContent = buildGradleContent.replace(
          /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
          '$1signingConfig signingConfigs.release'
        );

        fs.writeFileSync(buildGradlePath, buildGradleContent);
      }

      // Add 16KB page size support for Android 15+ compatibility
      // Re-read the file in case it was modified above
      buildGradleContent = fs.readFileSync(buildGradlePath, 'utf-8');

      // Check if packaging block exists
      if (!buildGradleContent.includes('useLegacyPackaging')) {
        // Add packaging options for 16KB page alignment
        const packagingConfig = `
    packaging {
        jniLibs {
            useLegacyPackaging = false
        }
    }`;

        // Add after android { block opening, before other configurations
        if (buildGradleContent.includes('android {')) {
          // Find the end of defaultConfig block and add after it
          buildGradleContent = buildGradleContent.replace(
            /(defaultConfig\s*\{[\s\S]*?\n    \})/,
            `$1${packagingConfig}`
          );
          fs.writeFileSync(buildGradlePath, buildGradleContent);
        }
      }

      // Update gradle.properties with 16KB page alignment settings
      gradlePropertiesContent = fs.readFileSync(gradlePropertiesPath, 'utf-8');

      // Add Android 16KB page size support settings
      if (!gradlePropertiesContent.includes('android.bundle.enableUncompressedNativeLibs')) {
        const pageAlignmentConfig = `

# Android 15+ 16KB page size support
android.bundle.enableUncompressedNativeLibs=true`;

        gradlePropertiesContent += pageAlignmentConfig;
        fs.writeFileSync(gradlePropertiesPath, gradlePropertiesContent);
      }

      // Add externalNativeBuild configuration for 16KB page alignment in build.gradle
      buildGradleContent = fs.readFileSync(buildGradlePath, 'utf-8');

      if (!buildGradleContent.includes('-Wl,-z,max-page-size=16384')) {
        // Check if externalNativeBuild already exists
        if (buildGradleContent.includes('externalNativeBuild')) {
          // Modify existing configuration - this is complex, skip for now
        } else {
          // Add the Android NDK page alignment configuration
          const ndkConfig = `
    // 16KB page size support for Android 15+
    defaultConfig {
        externalNativeBuild {
            cmake {
                arguments "-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON"
                cppFlags "-Wl,-z,max-page-size=16384"
            }
        }
    }`;

          // This might not apply directly since React Native handles native builds
          // The key is ensuring dependencies are compatible
        }
      }

      return config;
    },
  ]);

  return config;
};

module.exports = withCustomNativeConfig;

