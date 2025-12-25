<<<<<<< HEAD
# 🚀 העלאה ל-Railway (שירות ענן חינמי)

## שלב 1: הכנת Git Repository

אם עדיין אין לך Git repository, פתח טרמינל והרץ:

```bash
git init
git add .
git commit -m "Initial commit - CRM System"
```

## שלב 2: העלאה ל-GitHub

1. לך ל-https://github.com והתחבר
2. לחץ על ה-**+** למעלה ימינה → **New repository**
3. שם: `ayamakeup-crm`
4. **אל תסמן** "Initialize with README"
5. לחץ **Create repository**

בטרמינל, הרץ:
```bash
git remote add origin https://github.com/YOUR_USERNAME/ayamakeup-crm.git
git branch -M main
git push -u origin main
```

## שלב 3: פריסה ל-Railway

1. לך ל-https://railway.app והתחבר עם GitHub
2. לחץ על **New Project**
3. בחר **Deploy from GitHub repo**
4. בחר את ה-repository: `ayamakeup-crm`
5. Railway יתחיל לפרוס אוטומטית

## שלב 4: הגדרת Environment Variables

1. לחץ על הפרויקט ב-Railway
2. לחץ על **Variables**
3. הוסף:
   - `MONGODB_URI` = (העתק מקובץ .env שלך)
   - `PORT` = `3000`

## שלב 5: קבלת URL

1. לחץ על **Settings** → **Generate Domain**
2. תקבל כתובת כמו: `https://ayamakeup-crm-production.up.railway.app`

## שלב 6: עדכון Frontend

עדכן את `js/app_db.js`:
```javascript
const API_BASE_URL = 'https://YOUR-APP-NAME.up.railway.app/api';
```

העלה את השינוי:
```bash
git add js/app_db.js
git commit -m "Update API URL"
git push
```

## ✅ סיימת!

האתר שלך זמין ב: `https://YOUR-APP-NAME.up.railway.app/index_new.html`

---

## 🔄 עדכונים עתידיים

כל פעם שתעשה שינויים:
```bash
git add .
git commit -m "תיאור השינוי"
git push
```

Railway יעדכן אוטומטית!
=======
# 🚀 העלאה ל-Railway (שירות ענן חינמי)

## שלב 1: הכנת Git Repository

אם עדיין אין לך Git repository, פתח טרמינל והרץ:

```bash
git init
git add .
git commit -m "Initial commit - CRM System"
```

## שלב 2: העלאה ל-GitHub

1. לך ל-https://github.com והתחבר
2. לחץ על ה-**+** למעלה ימינה → **New repository**
3. שם: `ayamakeup-crm`
4. **אל תסמן** "Initialize with README"
5. לחץ **Create repository**

בטרמינל, הרץ:
```bash
git remote add origin https://github.com/YOUR_USERNAME/ayamakeup-crm.git
git branch -M main
git push -u origin main
```

## שלב 3: פריסה ל-Railway

1. לך ל-https://railway.app והתחבר עם GitHub
2. לחץ על **New Project**
3. בחר **Deploy from GitHub repo**
4. בחר את ה-repository: `ayamakeup-crm`
5. Railway יתחיל לפרוס אוטומטית

## שלב 4: הגדרת Environment Variables

1. לחץ על הפרויקט ב-Railway
2. לחץ על **Variables**
3. הוסף:
   - `MONGODB_URI` = (העתק מקובץ .env שלך)
   - `PORT` = `3000`

## שלב 5: קבלת URL

1. לחץ על **Settings** → **Generate Domain**
2. תקבל כתובת כמו: `https://ayamakeup-crm-production.up.railway.app`

## שלב 6: עדכון Frontend

עדכן את `js/app_db.js`:
```javascript
const API_BASE_URL = 'https://YOUR-APP-NAME.up.railway.app/api';
```

העלה את השינוי:
```bash
git add js/app_db.js
git commit -m "Update API URL"
git push
```

## ✅ סיימת!

האתר שלך זמין ב: `https://YOUR-APP-NAME.up.railway.app/index_new.html`

---

## 🔄 עדכונים עתידיים

כל פעם שתעשה שינויים:
```bash
git add .
git commit -m "תיאור השינוי"
git push
```

Railway יעדכן אוטומטית!
>>>>>>> 44e2edbdbede27982bb1a993c11d2726aae79e69
