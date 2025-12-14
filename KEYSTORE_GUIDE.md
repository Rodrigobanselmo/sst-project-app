# 🔐 Android Keystore Guide for SimpleSST

## What is `my-upload-key.keystore`?

Your `my-upload-key.keystore` file is **CRITICAL** for your Android app. It's like a digital signature that proves you are the legitimate owner of your app.

### ⚠️ EXTREMELY IMPORTANT

1. **NEVER lose this file** - If you lose it, you can NEVER update your app on Google Play Store
2. **NEVER share the passwords** - Keep them secret
3. **BACKUP this file** - Store it in multiple safe locations (encrypted cloud storage, external drive, etc.)

## What I've Configured

✅ **credentials.json** - Created to tell EAS about your keystore  
✅ **eas.json** - Updated to use local credentials (`credentialsSource: "local"`)  
✅ **.gitignore** - Updated to protect `credentials.json` from being committed  

## Your Keystore Details

- **File**: `my-upload-key.keystore`
- **Alias**: `my-key-alias`
- **Store Password**: `-Sil3556725`
- **Key Password**: `-Sil3556725`

## Two Options for Using Your Keystore with EAS

### Option 1: Keep Keystore Local (Current Setup) ✅

**Pros:**
- You maintain full control of your keystore
- Keystore stays on your computer
- More secure (not uploaded to cloud)

**Cons:**
- You need the keystore file on any computer you build from
- Need to manage backups yourself

**How it works:**
- EAS reads `credentials.json` during build
- Uses your local `my-upload-key.keystore` file
- Builds are done on EAS servers but use your keystore

### Option 2: Upload Keystore to EAS (Alternative)

**Pros:**
- Build from any computer without the keystore file
- EAS manages and backs up your keystore
- Easier for team collaboration

**Cons:**
- Keystore is stored on Expo's servers
- Less direct control

**To switch to this option:**
```bash
# Remove credentialsSource from eas.json
# Then run:
eas credentials
# Select Android → production → Keystore
# Choose "Upload a new keystore"
# Point to your my-upload-key.keystore file
```

## Current Configuration (Option 1)

Your `eas.json` is configured to use local credentials:

```json
"android": {
  "buildType": "app-bundle",
  "gradleCommand": ":app:bundleRelease",
  "credentialsSource": "local"
}
```

Your `credentials.json` contains:
```json
{
  "android": {
    "keystore": {
      "keystorePath": "my-upload-key.keystore",
      "keystorePassword": "-Sil3556725",
      "keyAlias": "my-key-alias",
      "keyPassword": "-Sil3556725"
    }
  }
}
```

## Building with Your Keystore

When you run:
```bash
npm run build:android
# or
eas build --platform android --profile production
```

EAS will:
1. Read `credentials.json`
2. Use your `my-upload-key.keystore` file
3. Sign the APK/AAB with your keystore
4. Upload the signed build to EAS servers

## Important Notes

### If You've Already Published to Google Play

✅ **You MUST keep using this exact keystore** for all future updates  
✅ Google Play will reject any update signed with a different keystore  
✅ This is why backing up is critical  

### If This is a New App (Not Yet Published)

You have two choices:
1. **Keep using this keystore** (recommended if you already have it)
2. **Let EAS generate a new one** (only if you haven't published yet)

To let EAS generate a new one:
```bash
# Remove credentials.json
rm credentials.json

# Update eas.json - remove "credentialsSource": "local"
# Then run:
eas credentials
# Select Android → production → Keystore
# Choose "Generate new keystore"
```

## Backup Checklist

- [ ] Copy `my-upload-key.keystore` to encrypted cloud storage (Google Drive, Dropbox, etc.)
- [ ] Copy to external hard drive
- [ ] Store passwords in password manager (1Password, LastPass, etc.)
- [ ] Document the keystore details in a secure location
- [ ] Test that you can access backups

## Security Best Practices

1. **Never commit keystore to git** (unless it's a private repo and you're sure)
2. **Never share passwords in plain text**
3. **Use environment variables** for passwords in CI/CD
4. **Keep credentials.json out of git** (already in .gitignore)
5. **Regularly verify your backups work**

## What's in .gitignore

```
# EAS / Expo credentials
google-service-account.json
credentials.json
*.p12
*.mobileprovision
*.cer
*.certSigningRequest

# Keystores - IMPORTANT: Keep my-upload-key.keystore backed up safely!
# Uncomment the line below if you want to keep keystore out of git:
# my-upload-key.keystore
```

**Note:** Currently `my-upload-key.keystore` is NOT in .gitignore, so it WILL be committed to git. If you want to keep it out of git, uncomment that line.

## Troubleshooting

### Build fails with "Keystore not found"
- Make sure `my-upload-key.keystore` is in the project root
- Check that `credentials.json` has the correct path

### Build fails with "Wrong password"
- Verify passwords in `credentials.json` match your keystore
- Check for typos or extra spaces

### "Keystore was tampered with"
- Your keystore file may be corrupted
- Restore from backup immediately

## Next Steps

1. **Backup your keystore NOW** (if you haven't already)
2. **Test a build**: `npm run build:android`
3. **Keep credentials.json safe** (it's in .gitignore)
4. **Consider uploading to EAS** for easier management (optional)

---

**Remember:** Your keystore is irreplaceable. Treat it like a password to your bank account! 🔐

