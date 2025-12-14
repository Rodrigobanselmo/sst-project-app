# EAS Build & Deploy Guide for SimpleSST

## 🚀 Quick Start Commands

### Build Commands
```bash
# Development build (for testing on device)
eas build --profile development --platform android
eas build --profile development --platform ios

# Preview build (internal testing)
eas build --profile preview --platform android
eas build --profile preview --platform ios

# Production build (for stores)
eas build --profile production --platform android
eas build --profile production --platform ios

# Build both platforms at once
eas build --profile production --platform all
```

### Submit to Stores
```bash
# Submit to Google Play Store
eas submit --platform android --latest

# Submit to Apple App Store
eas submit --platform ios --latest
```

## 📱 Initial Setup Steps

### 1. Configure Expo Project ID
Run this command to link your project to Expo:
```bash
eas project:init
```

### 2. iOS Setup (Apple App Store)

#### A. Create App in App Store Connect
1. Go to https://appstoreconnect.apple.com/
2. Click "My Apps" → "+" → "New App"
3. Fill in:
   - **Platform**: iOS
   - **Name**: SimpleSST
   - **Primary Language**: Portuguese (Brazil) or your preference
   - **Bundle ID**: com.simplesst.app (must match your app.json)
   - **SKU**: simplesst-app (or any unique identifier)
4. Save the **App ID** (you'll need this later)

#### B. Get Your Apple Team ID
```bash
# This command will show your Apple Team ID
eas device:create
```
Or find it at: https://developer.apple.com/account → Membership

#### C. Update eas.json with iOS credentials
Edit `eas.json` and update the iOS submit section:
```json
"ios": {
  "appleId": "your-apple-id@email.com",
  "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID",
  "appleTeamId": "YOUR_APPLE_TEAM_ID"
}
```

### 3. Android Setup (Google Play Store)

#### A. Create App in Google Play Console
1. Go to https://play.google.com/console
2. Click "Create app"
3. Fill in app details:
   - **App name**: SimpleSST
   - **Default language**: Portuguese (Brazil)
   - **App or game**: App
   - **Free or paid**: Free
4. Complete the setup questionnaire

#### B. Create Service Account for EAS
1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Select your project (or create one)
3. Go to "IAM & Admin" → "Service Accounts"
4. Click "Create Service Account"
5. Name it "eas-submit" and create
6. Click on the service account → "Keys" → "Add Key" → "Create new key"
7. Choose JSON format and download
8. Save the file as `google-service-account.json` in your project root
9. **Add to .gitignore**: `echo "google-service-account.json" >> .gitignore`

#### C. Grant Permissions
1. Go back to Google Play Console
2. Go to "Setup" → "API access"
3. Link your Google Cloud project
4. Grant access to the service account with "Release manager" role

### 4. Build Your First Production App

```bash
# Build for both platforms
eas build --profile production --platform all
```

This will:
- Build an AAB file for Android
- Build an IPA file for iOS
- Upload to EAS servers
- Provide download links

## 🔐 Credentials Management

EAS will automatically manage your credentials:
- **iOS**: Distribution certificates and provisioning profiles
- **Android**: Keystore (already configured in your app.json)

To view/manage credentials:
```bash
eas credentials
```

## 📦 Deployment Workflow

### For Testing (Internal)
```bash
# 1. Build preview version
eas build --profile preview --platform all

# 2. Share the download link with testers
```

### For Production Release
```bash
# 1. Update version in app.json
# Increment "version" and "ios.buildNumber" / "android.versionCode"

# 2. Build production version
eas build --profile production --platform all

# 3. Wait for build to complete (you'll get an email)

# 4. Submit to stores
eas submit --platform android --latest
eas submit --platform ios --latest
```

## 🎯 Important Notes

### Version Management
- **iOS**: Update `ios.buildNumber` in app.json for each build
- **Android**: Update `android.versionCode` in app.json for each build
- **Both**: Update `version` for user-facing version (e.g., "1.0.16")

### Auto-increment
The production profile has `"autoIncrement": true`, which will automatically bump build numbers.

### Build Profiles Explained
- **development**: For development builds with dev client
- **preview**: For internal testing (APK/IPA files)
- **production**: For store submissions (AAB for Android, IPA for iOS)

## 🔧 Troubleshooting

### iOS Build Fails
- Make sure you have an Apple Developer account ($99/year)
- Check that bundle identifier matches in app.json and App Store Connect
- Run `eas credentials` to check certificate status

### Android Build Fails
- Check that your keystore configuration in app.json is correct
- Verify package name matches in app.json

### Submission Fails
- **iOS**: Verify Apple ID, App ID, and Team ID in eas.json
- **Android**: Check service account JSON file exists and has correct permissions

## 📚 Additional Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [App Store Connect](https://appstoreconnect.apple.com/)
- [Google Play Console](https://play.google.com/console)

