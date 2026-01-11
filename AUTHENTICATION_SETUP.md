# 🔐 Google OAuth Setup Guide - הדרכת הגדרת התחברות

## סיכום המערכת החדשה

המערכת עברה ל**הפרדה מלאה בין משתמשים** עם Google OAuth authentication:
- ✅ כל משתמש רואה רק את הנתונים שלו
- ✅ לא ניתן ליצור/לערוך נתונים בלי התחברות
- ✅ Session management מאובטח עם MongoDB
- ✅ הגנה מלאה על כל ה-API routes

---

## 📋 שלב 1: הגדרת Google OAuth

### 1.1 יצירת פרויקט ב-Google Cloud Console

1. עבור אל [Google Cloud Console](https://console.cloud.google.com/)
2. לחץ על **"Select a project"** בחלק העליון
3. לחץ על **"NEW PROJECT"**
4. שם הפרויקט: `AyaMakeup CRM`
5. לחץ **CREATE**

### 1.2 הפעלת Google+ API

1. בתפריט הצד, עבור ל: **APIs & Services** → **Library**
2. חפש: `Google+ API`
3. לחץ על **"Google+ API"**
4. לחץ **ENABLE**

### 1.3 יצירת OAuth 2.0 Credentials

1. בתפריט הצד: **APIs & Services** → **Credentials**
2. לחץ **+ CREATE CREDENTIALS** → **OAuth client ID**
3. אם מתבקש, הגדר **OAuth consent screen**:
   - User Type: **External**
   - App name: `AyaMakeup CRM`
   - User support email: האימייל שלך
   - Developer contact: האימייל שלך
   - לחץ **SAVE AND CONTINUE**
   - Scopes: לחץ **ADD OR REMOVE SCOPES**
     - בחר: `../auth/userinfo.email`
     - בחר: `../auth/userinfo.profile`
   - לחץ **SAVE AND CONTINUE**
   - Test users: הוסף את האימייל שלך
   - לחץ **SAVE AND CONTINUE**

4. חזור ל-**Credentials** → **+ CREATE CREDENTIALS** → **OAuth client ID**
5. Application type: **Web application**
6. Name: `AyaMakeup Web Client`
7. **Authorized JavaScript origins**:
   - הוסף: `http://localhost:3000`
   - (בייצור: הוסף גם את ה-URL הסופי, למשל `https://your-domain.com`)
8. **Authorized redirect URIs**:
   - הוסף: `http://localhost:3000/auth/google/callback`
   - (בייצור: הוסף גם `https://your-domain.com/auth/google/callback`)
9. לחץ **CREATE**
10. **שמור את:**
    - Client ID (מתחיל ב-...apps.googleusercontent.com)
    - Client Secret

---

## 📝 שלב 2: עדכון קובץ .env

צור/ערוך את הקובץ `.env` בתיקיית הפרויקט:

```env
# MongoDB
MONGODB_URI=your_mongodb_connection_string_here

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here

# Session Secret (יצור מחרוזת אקראית ארוכה)
SESSION_SECRET=your-super-secret-random-string-minimum-32-characters

# Server Configuration
PORT=3000
BASE_URL=http://localhost:3000

# Environment
NODE_ENV=development
```

### 📌 איך ליצור SESSION_SECRET חזק?

בטרמינל, הרץ:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
העתק את התוצאה ל-SESSION_SECRET

---

## 🚀 שלב 3: הפעלת השרת

### 3.1 ריצת הסקריפט למחיקת נתונים ישנים

**⚠️ חשוב: זה ימחק את כל הנתונים שלא משוייכים למשתמש!**

```bash
node cleanup-old-data.js
```

הסקריפט:
- יספור כמה נתונים ללא userId קיימים
- יחכה 10 שניות (אפשר לבטל ב-Ctrl+C)
- ימחק את כל הנתונים הישנים

### 3.2 הפעלת השרת החדש

```bash
node server-auth.js
```

אמור לראות:
```
✅ Connected to MongoDB Atlas successfully!
🔐 ========================================
   CRM Server with AUTHENTICATION
🔐 ========================================
🌐 Server: http://localhost:3000
📦 Database: MongoDB Atlas (Cloud)
🔑 Auth: Google OAuth 2.0
🚀 API: http://localhost:3000/api
========================================
```

---

## 🧪 שלב 4: בדיקת המערכת

### 4.1 בדיקת Authentication

1. פתח דפדפן: `http://localhost:3000`
2. אמור לראות מסך התחברות
3. לחץ על **"התחבר עם Google"**
4. בחר חשבון Google
5. אשר הרשאות
6. אמור להיות מועבר בחזרה למערכת

### 4.2 בדיקת הפרדת משתמשים

**בדיקה 1: משתמש ראשון**
1. התחבר עם חשבון Google #1
2. צור ליד חדש
3. וודא שהליד מופיע

**בדיקה 2: משתמש שני**
1. פתח דפדפן אחר (או Incognito)
2. התחבר עם חשבון Google #2
3. וודא שאתה **לא רואה** את הליד של משתמש #1
4. צור ליד משלך
5. וודא שרק הליד שלך מופיע

**בדיקה 3: חזרה למשתמש ראשון**
1. חזור לדפדפן הראשון
2. רענן את הדף
3. וודא שאתה רואה רק את הליד שיצרת

---

## 🔧 פתרון בעיות נפוצות

### בעיה: "Error: redirect_uri_mismatch"
**פתרון:** 
- וודא ש-`http://localhost:3000/auth/google/callback` מופיע ב-Authorized redirect URIs
- וודא שאין רווח או תו נוסף
- שים לב לפורט (3000)

### בעיה: "Access blocked: This app's request is invalid"
**פתרון:**
- ב-Google Cloud Console, עבור ל-**OAuth consent screen**
- שנה את Status ל-**PUBLISHED** (או הוסף את עצמך ל-Test users)

### בעיה: "MONGODB_URI is not defined"
**פתרון:**
- וודא שקובץ `.env` קיים בתיקיית הראשית
- וודא שאין רווחים סביב ה-`=`
- וודא שהקובץ נקרא `.env` (לא `.env.txt`)

### בעיה: משתמש מתנתק אחרי רענון
**פתרון:**
- וודא ש-SESSION_SECRET מוגדר ב-.env
- וודא ש-MongoDB connection פעיל
- בדוק שאין שגיאות בקונסול של השרת

---

## 📊 מבנה הנתונים החדש

### Lead/Client Documents

```javascript
{
  "_id": "507f1f77bcf86cd799439011",
  "userId": "117891234567890123456",      // Google User ID
  "userEmail": "user@gmail.com",          // למזהה קל
  "id": 1,                                 // ID פנימי (unique per user)
  "name": "שם הלקוח",
  // ... rest of fields
}
```

### Indexes
- `userId`: מאיץ queries לפי משתמש
- `{ userId: 1, id: 1 }`: compound index - unique ID per user

---

## 🚢 העלאה לייצור (Production)

### 1. עדכון Google OAuth

ב-Google Cloud Console:
1. עבור ל-Credentials → OAuth 2.0 Client IDs
2. ערוך את ה-Client
3. הוסף ל-**Authorized JavaScript origins**:
   - `https://your-domain.com`
4. הוסף ל-**Authorized redirect URIs**:
   - `https://your-domain.com/auth/google/callback`

### 2. עדכון .env

```env
NODE_ENV=production
BASE_URL=https://your-domain.com
SESSION_SECRET=<SECRET FROM PRODUCTION>
FRONTEND_URL=https://your-domain.com
```

### 3. הגדרות נוספות

בקובץ `server-auth.js`, cookie הופך ל-secure:
```javascript
cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
}
```

---

## 🎯 סיכום

✅ **מה השתנה:**
- כל API route מוגן ב-`isAuthenticated` middleware
- כל query מסנן לפי `userId`
- Session מנוהל ב-MongoDB (persistent)
- נתונים ישנים נמחקו

✅ **מה זה אומר:**
- משתמש A לא יכול לראות/לערוך נתונים של משתמש B
- לא ניתן להשתמש במערכת בלי התחברות
- Sessions נשמרים בין רענונים
- מוכן ל-production עם HTTPS

---

## 📞 צריך עזרה?

אם יש בעיות:
1. בדוק את הקונסול של השרת (errors)
2. בדוק את הקונסול של הדפדפן (F12)
3. וודא ש-MongoDB connection תקין
4. וודא ש-Google OAuth credentials נכונים

---

**נוצר על ידי: GitHub Copilot**
**תאריך: ינואר 2026**
