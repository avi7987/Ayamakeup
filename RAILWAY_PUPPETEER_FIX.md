# Railway Deployment - הוראות הגדרה

## בעיית Puppeteer ב-Railway

אם מקבלים שגיאה "Multi error" בעת יצירת חוזה, הבעיה היא ש-Puppeteer צריך Chrome/Chromium מותקן בשרת.

## פתרון:

### שלב 1: הגדרת railway.json
הקובץ `railway.json` כבר מוגדר עם:
```json
"nixPacks": {
  "packages": ["chromium"]
}
```

### שלב 2: משתני סביבה ב-Railway

1. היכנס ל-Railway Dashboard
2. בחר את הפרויקט `ayamakeup-production`
3. לחץ על **Variables**
4. הוסף משתנה חדש:
   - **Key**: `PUPPETEER_EXECUTABLE_PATH`
   - **Value**: `/usr/bin/chromium-browser`

### שלב 3: Redeploy

לחץ על **Deploy** מחדש כדי ש-Railway יתקין את Chromium.

## אלטרנטיבה: שימוש ב-Chrome for Testing

אם הפתרון הראשון לא עובד, נסה:

```json
"nixPacks": {
  "packages": ["chromium", "nss", "freetype", "harfbuzz", "ca-certificates", "ttf-freefont"]
}
```

## בדיקת הלוגים

צפה בלוגים ב-Railway כדי לראות את ההודעות המפורטות:
- `📄 Generating contract for lead:`
- `🚀 Launching Puppeteer...`
- `✅ Browser launched`
- `📝 Generating PDF...`

אם יש שגיאה, היא תופיע בלוגים עם פרטים מלאים.

## טיפ נוסף

אם Railway לא מצליח להתקין Chromium דרך nixPacks, אפשר להשתמש ב-`puppeteer-core` ולהוסיף buildpack:

```json
"build": {
  "builder": "HEROKU",
  "buildpacks": [
    "heroku/nodejs",
    "https://github.com/jontewks/puppeteer-heroku-buildpack"
  ]
}
```

---

**עדכון אחרון**: commit `a26dabe`  
**תאריך**: 26.12.2024
