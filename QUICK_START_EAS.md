# 🚀 Quick Start: Deploy SimpleSST with EAS

## What I've Set Up For You

✅ **EAS CLI** - Installed globally  
✅ **eas.json** - Build configuration file  
✅ **npm scripts** - Easy deployment commands  
✅ **.gitignore** - Updated to protect credentials  
✅ **Documentation** - Complete guides and checklists  

## 🎯 Next Steps (Do These Now!)

### Step 1: Login to Expo (if not already)
```bash
eas login
```
Enter your Expo account credentials.

### Step 2: Initialize Your Project
```bash
eas project:init
```
This will:
- Create a project on Expo servers
- Give you a project ID
- Link your local project to Expo

### Step 3: Update app.json
After running `eas project:init`, you'll get a project ID. Update your `app.json`:

```json
"extra": {
  "eas": {
    "projectId": "YOUR_PROJECT_ID_HERE"
  }
}
```

### Step 4: Set Up Apple App Store (for iOS)

#### A. Create Your Personal App in App Store Connect
1. Go to https://appstoreconnect.apple.com/
2. Click "My Apps" → "+" → "New App"
3. Fill in:
   - **Name**: SimpleSST (or your app name)
   - **Bundle ID**: Create new → `com.simplesst.app`
   - **SKU**: `simplesst-app`
4. **Save the App ID** (looks like: 1234567890)

#### B. Get Your Apple Team ID
1. Go to https://developer.apple.com/account
2. Click "Membership" in sidebar
3. Copy your **Team ID** (looks like: ABC123XYZ)

#### C. Update eas.json
Edit `eas.json` and replace these values in the iOS submit section:
```json
"ios": {
  "appleId": "your-apple-id@email.com",
  "ascAppId": "1234567890",
  "appleTeamId": "ABC123XYZ"
}
```

### Step 5: Set Up Google Play Store (for Android)

#### A. Create Service Account
1. Go to https://console.cloud.google.com/
2. Create or select a project
3. Go to "IAM & Admin" → "Service Accounts"
4. Click "Create Service Account"
5. Name: `eas-submit`
6. Click "Create and Continue"
7. Skip optional steps, click "Done"
8. Click on the new service account
9. Go to "Keys" tab → "Add Key" → "Create new key"
10. Choose **JSON** format
11. Download and save as `google-service-account.json` in your project root

#### B. Link to Play Console
1. Go to https://play.google.com/console
2. Create your app if you haven't already
3. Go to "Setup" → "API access"
4. Click "Link" to link your Google Cloud project
5. Grant access to your service account with "Release manager" role

### Step 6: Build Your First App! 🎉
```bash
# Build for both iOS and Android
npm run build:prod
```

This will:
- Build production-ready apps
- Upload to EAS servers
- Send you an email when done
- Provide download links

### Step 7: Submit to Stores
After the build completes:
```bash
# Submit to both stores
npm run submit:all
```

## 📱 Testing Before Production

Want to test first? Use preview builds:
```bash
npm run build:preview
```

This creates installable APK (Android) and IPA (iOS) files for testing without submitting to stores.

## 🔑 Important Files

- **eas.json** - Build and submit configuration
- **app.json** - App metadata and settings
- **google-service-account.json** - Android credentials (don't commit!)
- **DEPLOYMENT_CHECKLIST.md** - Step-by-step checklist
- **EAS_DEPLOYMENT_GUIDE.md** - Detailed documentation

## 💡 Pro Tips

1. **Version Management**: Always update version numbers in `app.json` before building
2. **Test First**: Use `build:preview` to test before production
3. **Credentials**: EAS manages iOS certificates automatically - no manual setup needed!
4. **Build Time**: First build takes ~15-20 minutes, subsequent builds are faster
5. **Monitoring**: Check build status at https://expo.dev

## 🆘 Troubleshooting

### "Not logged in"
```bash
eas login
```

### "Project not configured"
```bash
eas project:init
```

### iOS build fails
- Ensure you have an active Apple Developer account ($99/year)
- Check bundle identifier matches in app.json and App Store Connect

### Android build fails
- Verify your keystore configuration in app.json
- Check package name matches

## 📚 Learn More

- **EAS Build Docs**: https://docs.expo.dev/build/introduction/
- **EAS Submit Docs**: https://docs.expo.dev/submit/introduction/
- **Expo Dashboard**: https://expo.dev

---

**Ready to deploy?** Start with Step 1 above! 🚀

