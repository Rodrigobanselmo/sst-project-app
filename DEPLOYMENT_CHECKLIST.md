# 🚀 SimpleSST Deployment Checklist

## ✅ One-Time Setup (Do this first!)

### 1. Expo Account Setup
- [ ] Login to EAS: `eas login`
- [ ] Initialize project: `eas project:init`
- [ ] Update `app.json` with the project ID from the command above

### 2. iOS Setup (Apple App Store)
- [ ] Have an active Apple Developer account ($99/year)
- [ ] Create app in App Store Connect (https://appstoreconnect.apple.com/)
  - App Name: SimpleSST
  - Bundle ID: com.simplesst.app
  - Save the App ID
- [ ] Get your Apple Team ID from https://developer.apple.com/account
- [ ] Update `eas.json` with:
  - `appleId`: Your Apple ID email
  - `ascAppId`: App Store Connect App ID
  - `appleTeamId`: Your Apple Team ID

### 3. Android Setup (Google Play Store)
- [ ] Create app in Google Play Console (https://play.google.com/console)
  - App Name: SimpleSST
  - Package: com.simplesst.app
- [ ] Create Google Cloud Service Account
  - Go to https://console.cloud.google.com/
  - Create service account named "eas-submit"
  - Download JSON key
  - Save as `google-service-account.json` in project root
- [ ] Grant service account access in Play Console
  - Go to Setup → API access
  - Grant "Release manager" role to service account

## 📦 Before Each Release

### Pre-Release Checklist
- [ ] Test app thoroughly on both iOS and Android
- [ ] Update version numbers in `app.json`:
  - [ ] `version`: "1.0.X" (user-facing version)
  - [ ] `ios.buildNumber`: Increment by 1
  - [ ] `android.versionCode`: Increment by 1
- [ ] Commit all changes to git
- [ ] Create a git tag: `git tag v1.0.X`

### Build & Deploy
- [ ] Build production apps: `npm run build:prod`
- [ ] Wait for build to complete (check email or EAS dashboard)
- [ ] Test the builds if possible
- [ ] Submit to stores: `npm run submit:all`

## 🎯 Quick Commands Reference

```bash
# Development builds (for testing)
npm run build:dev

# Preview builds (internal testing)
npm run build:preview

# Production builds
npm run build:prod          # Both platforms
npm run build:android       # Android only
npm run build:ios           # iOS only

# Submit to stores
npm run submit:all          # Both stores
npm run submit:android      # Google Play only
npm run submit:ios          # App Store only
```

## 📱 First Time Deployment Steps

1. **Complete one-time setup** (see above)
2. **Build your first production app**:
   ```bash
   npm run build:prod
   ```
3. **Wait for build** (you'll get an email when ready)
4. **Download and test** the builds from EAS dashboard
5. **Submit to stores**:
   ```bash
   npm run submit:all
   ```

## 🔄 Regular Update Workflow

1. Make your code changes
2. Test thoroughly
3. Update version in `app.json`
4. Run `npm run build:prod`
5. Wait for build completion
6. Run `npm run submit:all`
7. Monitor store review process

## 📝 Notes

- **iOS Review**: Usually takes 1-3 days
- **Android Review**: Usually takes a few hours to 1 day
- **Auto-increment**: Build numbers auto-increment in production profile
- **Credentials**: EAS manages all certificates and keys automatically

## 🆘 Need Help?

- Check `EAS_DEPLOYMENT_GUIDE.md` for detailed instructions
- Visit https://docs.expo.dev/build/introduction/
- Check EAS dashboard: https://expo.dev/accounts/[your-account]/projects/simplesst

