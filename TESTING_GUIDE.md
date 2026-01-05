# 🧪 Mobile Authentication Testing Guide

## ⏱️ Wait for Deployment
Railway is now deploying your fix. Wait **2-3 minutes** before testing.

---

## 📱 Step-by-Step Mobile Testing

### **Test 1: iPhone Safari (Most Critical)**
1. Open iPhone Safari
2. Go to Settings → Safari → Clear History and Website Data
3. Navigate to: `https://lunabusiness.up.railway.app`
4. Click "Login with Google"
5. Complete Google authentication
6. **Expected:** Redirected to dashboard with user logged in ✅
7. **Expected:** User avatar shows in top-left ✅
8. **Verify:** Refresh page → User STAYS logged in ✅
9. **Verify:** Close tab, reopen site → User STAYS logged in ✅

### **Test 2: Android Chrome**
1. Open Chrome on Android
2. Menu → Settings → Privacy → Clear browsing data
3. Navigate to site and test login flow
4. Verify persistence as above

### **Test 3: iOS Chrome**
1. Open Chrome on iOS
2. Clear cookies
3. Test login flow
4. Verify persistence

---

## 🖥️ Desktop Verification (Should Still Work)
1. Open Desktop Chrome
2. Clear cookies
3. Test login flow
4. Verify everything works as before

---

## 🔍 How to Check Railway Logs

### **Method 1: Railway CLI**
```bash
railway login
railway link
railway logs
```

### **Method 2: Railway Dashboard**
1. Go to: https://railway.app
2. Select your project
3. Click "Deployments"
4. Click "View Logs"
5. Search for: `MOBILE AUTH DEBUG`

---

## 🎯 What to Look For in Logs

### **Successful Mobile Login:**
```
🔐 OAUTH CALLBACK RECEIVED
📱 Mobile: YES
✅ User authenticated successfully: user@example.com
📱 Device Type: MOBILE
📦 Session ID: abc123...
✅ Session saved successfully
🍪 Set-Cookie header: [connect.sid=abc123...]
📱 Mobile detected - adding 100ms delay before redirect
🏠 Redirecting to dashboard...
```

### **On Next Request (Should show authentication):**
```
🔍 MOBILE AUTH DEBUG
📱 Device: MOBILE
🔐 Authenticated: ✅ YES
👤 User: user@example.com
📦 SESSION:
   - Has Session: ✅
   - Session ID: abc123...
🍪 COOKIES:
   - Has Cookies: ✅
   - Has Session Cookie: ✅
```

---

## ⚠️ If Still Not Working

### **Check #1: Cookie in Browser**
**iPhone Safari:**
1. After login, open Safari Dev Tools (if available)
2. Check Application → Cookies
3. Should see: `connect.sid` cookie

**Chrome:**
1. Desktop Chrome: F12 → Application → Cookies
2. Should see: `connect.sid` cookie with:
   - Secure: ✅
   - HttpOnly: ✅
   - SameSite: Lax

### **Check #2: Google Console Redirect URI**
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click your OAuth Client ID
3. **Authorized redirect URIs** must have:
   ```
   https://lunabusiness.up.railway.app/auth/google/callback
   ```
4. Must be **exact match** - no trailing slash

### **Check #3: Environment Variables**
Railway dashboard → Your project → Variables:
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
SESSION_SECRET=...
GOOGLE_CALLBACK_URL=https://lunabusiness.up.railway.app/auth/google/callback
```

---

## 🐛 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Cookie not appearing | Check `sameSite: lax` in logs |
| Session lost on refresh | Check `domain: undefined` in logs |
| "Not authenticated" after redirect | Check Set-Cookie header in logs |
| Works on desktop, fails on mobile | Check mobile User-Agent in logs |
| Error "session_failed" | Check MongoDB connection |

---

## 📊 Debug Mode

Test with debug mode to see detailed logs:
```
https://lunabusiness.up.railway.app/?debug=1
```

This forces debug middleware to run even on desktop.

---

## ✅ Success Checklist

- [ ] Deployment completed (wait 2-3 minutes)
- [ ] Desktop login still works
- [ ] iPhone Safari login works
- [ ] Cookie persists after refresh on mobile
- [ ] Cookie persists after closing tab on mobile
- [ ] User data loads correctly on mobile
- [ ] No errors in Railway logs
- [ ] Set-Cookie header appears in logs
- [ ] Session cookie sent on subsequent requests

---

## 🎉 Next Steps After Success

Once mobile authentication works:

1. **Monitor logs** for the first day to catch any edge cases
2. **Test on multiple devices**:
   - iPhone Safari (iOS 15+)
   - iPhone Chrome
   - Android Chrome
   - Android Firefox
3. **User testing** with real users
4. **Remove debug logs** if they're too verbose (optional)
5. **Celebrate!** 🎊

---

## 📞 Need Help?

If issues persist:
1. Share Railway logs (search for "❌ ISSUE")
2. Share browser console errors (F12)
3. Confirm device/browser version
4. Check [MOBILE_AUTH_FIX.md](MOBILE_AUTH_FIX.md) for detailed troubleshooting

---

**Current Status:** ⏳ Waiting for Railway deployment...  
**Deployment Started:** ${new Date().toLocaleString()}  
**Estimated Ready:** ${new Date(Date.now() + 3 * 60 * 1000).toLocaleString()}
