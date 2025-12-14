# 🍎 iOS Setup with Personal Apple Account

## Current Situation

✅ **Android build is in progress!** (Build ID: 0526a786-e13e-41d9-8b27-209be67f03f0)  
⚠️ **iOS build failed** - You're logged into your company Apple account, but need your personal account

## What You Need

### 1. Personal Apple Developer Account
- **Cost**: $99/year
- **Sign up**: https://developer.apple.com/programs/enroll/
- **Use your personal Apple ID**: rodrigobanselmo@gmail.com (or your personal email)

### 2. Create App in App Store Connect (Personal Account)

Since you only have access to your company app in App Store Connect, you need to:

#### Step A: Enroll in Apple Developer Program (if not already)
1. Go to https://developer.apple.com/programs/enroll/
2. Sign in with your **personal Apple ID** (rodrigobanselmo@gmail.com)
3. Complete enrollment ($99/year)
4. Wait for approval (usually 24-48 hours)

#### Step B: Create Your Personal App
1. Go to https://appstoreconnect.apple.com/
2. **Make sure you're logged in with your personal Apple ID** (not company)
3. Click "My Apps" → "+" → "New App"
4. Fill in:
   - **Platform**: iOS
   - **Name**: SimpleSST (or your preferred name)
   - **Primary Language**: Portuguese (Brazil)
   - **Bundle ID**: Click "+" to create new
     - **Bundle ID**: `com.simplesst.app`
     - **Description**: SimpleSST App
   - **SKU**: `simplesst-app` (any unique identifier)
5. Click "Create"
6. **Save the App ID** (looks like: 1234567890)

#### Step C: Get Your Apple Team ID
1. Go to https://developer.apple.com/account
2. **Make sure you're logged in with your personal Apple ID**
3. Click "Membership" in the sidebar
4. Copy your **Team ID** (looks like: ABC123XYZ)

## How to Build iOS with Personal Account

### Option 1: Build iOS Only (Recommended for Now)

When you're ready to build iOS:

```bash
# Build only iOS
eas build --platform ios --profile production
```

When prompted:
- **Apple ID**: Enter your **personal** Apple ID (rodrigobanselmo@gmail.com)
- **Password**: Enter your personal Apple password
- **2FA Code**: Enter the code from your personal device

### Option 2: Update eas.json with Personal Credentials

Edit `eas.json` and update the iOS submit section:

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "rodrigobanselmo@gmail.com",
      "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID",
      "appleTeamId": "YOUR_PERSONAL_APPLE_TEAM_ID"
    },
    "android": {
      "serviceAccountKeyPath": "./google-service-account.json",
      "track": "internal"
    }
  }
}
```

Replace:
- `YOUR_APP_STORE_CONNECT_APP_ID` - The App ID from Step B (e.g., 1234567890)
- `YOUR_PERSONAL_APPLE_TEAM_ID` - The Team ID from Step C (e.g., ABC123XYZ)

## Current Android Build Status

Your Android build is currently building! Check status:

```bash
# View build status
eas build:list

# View specific build
eas build:view 0526a786-e13e-41d9-8b27-209be67f03f0

# Or visit the dashboard
# https://expo.dev/accounts/rodrigobanselmo/projects/SimpleSST/builds/0526a786-e13e-41d9-8b27-209be67f03f0
```

You'll receive an email when the Android build completes (usually 10-20 minutes).

## Separating Company vs Personal Apple Accounts

### Problem
You're currently logged into your company Apple account on your Mac, which is why EAS tried to use it.

### Solutions

#### Solution 1: Use Different Apple ID During Build
When running `eas build --platform ios`, EAS will ask for your Apple ID. Just enter your **personal** Apple ID instead of the company one.

#### Solution 2: Logout from Company Account (Temporary)
If you want to completely switch:

1. **On your Mac**: System Settings → Apple ID → Sign Out
2. **Sign in with personal account**
3. Run the iOS build
4. **Sign back into company account** when done

#### Solution 3: Use EAS Dashboard (Easiest)
You can manage credentials directly in the EAS dashboard without needing to login on your Mac:

1. Go to https://expo.dev/accounts/rodrigobanselmo/projects/SimpleSST/credentials
2. Add iOS credentials manually
3. Upload certificates/provisioning profiles

## Next Steps

### Immediate (While Android Builds)
1. ✅ Wait for Android build to complete (~10-20 min)
2. ✅ Download and test the Android APK/AAB

### For iOS (When Ready)
1. Enroll in Apple Developer Program (if not already) - $99/year
2. Create app in App Store Connect with **personal** Apple ID
3. Get your personal Apple Team ID
4. Update `eas.json` with personal credentials
5. Run: `eas build --platform ios --profile production`

## Important Notes

### Company vs Personal
- **Company Apple Account**: For your company's apps
- **Personal Apple Account**: For SimpleSST (your personal app)
- These are **completely separate** - you need a personal developer account

### Apple Developer Program
- **Required** for App Store distribution
- **Cost**: $99/year
- **Enrollment**: https://developer.apple.com/programs/enroll/
- **Approval time**: Usually 24-48 hours

### Bundle ID
- Must be unique across all apps
- `com.simplesst.app` should work (unless someone else has it)
- Cannot be changed after first upload to App Store

## Troubleshooting

### "You don't have access to this app"
- You're logged into company account
- Switch to personal Apple ID

### "Bundle ID already exists"
- Someone else is using `com.simplesst.app`
- Choose a different one (e.g., `com.rodrigo.simplesst`)
- Update in `app.json` → `ios.bundleIdentifier`

### "Not enrolled in Apple Developer Program"
- You need to enroll ($99/year)
- Go to https://developer.apple.com/programs/enroll/

## Quick Commands

```bash
# Check Android build status
eas build:list

# Build iOS only (when ready)
eas build --platform ios --profile production

# Build both (after iOS is set up)
eas build --platform all --profile production

# View project info
eas project:info

# View credentials
eas credentials
```

## Summary

✅ **Android**: Building now! (using your existing keystore)  
⏳ **iOS**: Need personal Apple Developer account ($99/year)  
📧 **Email**: You'll get notified when Android build completes  
🔗 **Dashboard**: https://expo.dev/accounts/rodrigobanselmo/projects/SimpleSST

---

**For now, focus on the Android build. Set up iOS when you're ready!** 🚀

