# Fix Firebase Unauthorized Domain Error

## Problem
The error `auth/unauthorized-domain` occurs because your Firebase project doesn't recognize `localhost` as an authorized domain for authentication.

## Solution Steps

### 1. Add Authorized Domains in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `news-fa2f1`
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Add these domains:
   - `localhost`
   - `127.0.0.1`
   - `http://localhost:3000`
   - `http://localhost:3001`
   - `http://127.0.0.1:3000`
   - `http://127.0.0.1:3001`

### 2. Alternative: Use Firebase CLI

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Add authorized domains
firebase auth:web:set --project=news-fa2f1
```

### 3. Test the Fix

After adding the domains:
1. Restart your development server
2. Try Google Sign-In again
3. The error should be resolved

## Development vs Production

**For Development:**
- Add `localhost` and `127.0.0.1` to authorized domains
- Use the development server port (3000/3001)

**For Production:**
- Add your actual domain (e.g., `yourdomain.com`)
- Add `https://yourdomain.com`

## Additional Tips

1. **Clear Browser Cache**: Sometimes browser cache can cause issues
2. **Check Firebase Project ID**: Ensure you're using the correct project (`news-fa2f1`)
3. **Verify API Key**: Double-check your Firebase configuration

## Current Firebase Configuration

Your Firebase config is set to:
- Project ID: `news-fa2f1`
- Auth Domain: `news-fa2f1.firebaseapp.com`
- API Key: `AIzaSyBNNFW_tQcfOck2_b__Ej3joel241dMhFs`

## Error Handling

The app now includes better error handling for:
- `auth/unauthorized-domain` - Domain not authorized
- `auth/popup-closed-by-user` - User closed popup
- `auth/popup-blocked` - Popup blocked by browser
- `auth/cancelled-popup-request` - Sign-in cancelled
