# 🌙 Luna CRM

**Illuminate your business path** - Modern business management system

מערכת CRM מקצועית לניהול עסקים קטנים ובינוניים, עם ניהול לידים, מעקב הכנסות, וסטטיסטיקות.

## 🎯 תכונות עיקריות

- **ניהול לידים מתקדם** - לוח קנבן עם גרירה ושחרור
- **מעקב הכנסות** - רישום עסקאות ותשלומים
- **סטטיסטיקות** - גרפים וניתוחים חודשיים ושנתיים
- **מסד נתונים SQLite** - חינמי ללא תלות בשרת חיצוני
- **ממשק עברית מלא** - תמיכה מלאה ב-RTL
- **ניהול כלות** - מעקב מיוחד לעסקאות כלה

## 📦 התקנה

### דרישות מקדימות
- Node.js (גרסה 14 ומעלה)
- npm (מגיע עם Node.js)

### שלבי התקנה

1. **התקנת תלויות:**
```bash
npm install
```

2. **הרצת השרת:**
```bash
npm start
```

השרת יפעל על: http://localhost:3000

## 🚀 שימוש

### הרצה במצב פיתוח
```bash
npm run dev
```
השרת יתחיל מחדש אוטומטית עם כל שינוי בקוד.

### פתיחת האתר
פתח דפדפן וגש ל: http://localhost:3000/index_new.html

### העברת נתונים קיימים
אם יש לך נתונים מהגרסה הישנה (Google Sheets):
1. היכנס לעמוד הסטטיסטיקה
2. לחץ על כפתור "📤 העבר נתונים מישנים"
3. כל הנתונים יועברו אוטומטית מ-localStorage למסד הנתונים

## 🗂️ מבנה הפרויקט

```
Ayamakeup/
├── css/
│   └── styles.css          # עיצוב מסודר
├── js/
│   ├── app.js              # גרסה ישנה (Google Sheets)
│   └── app_db.js           # גרסה חדשה (Database)
├── index.html              # גרסה מקורית
├── index_new.html          # גרסה חדשה מסודרת
├── server.js               # שרת Node.js + API
├── package.json            # תלויות הפרויקט
└── db.json                 # מסד נתונים (נוצר אוטומטית)
```

## 🔌 API Endpoints

### Clients (הכנסות)
- `GET /api/clients` - קבלת כל הלקוחות
- `GET /api/clients/month/:month` - סינון לפי חודש
- `POST /api/clients` - הוספת לקוח חדש
- `PUT /api/clients/:id` - עדכון לקוח
- `DELETE /api/clients/:id` - מחיקת לקוח
- `POST /api/clients/bulk-delete` - מחיקה מרובה

### Leads (לידים)
- `GET /api/leads` - קבלת כל הלידים
- `GET /api/leads/status/:status` - סינון לפי סטטוס
- `POST /api/leads` - הוספת ליד חדש
- `PATCH /api/leads/:id/status` - עדכון סטטוס (לגרירה)
- `PUT /api/leads/:id` - עדכון ליד
- `DELETE /api/leads/:id` - מחיקת ליד

### Statistics (סטטיסטיקה)
- `GET /api/stats/summary?month=` - סיכום סטטיסטי
- `GET /api/stats/monthly` - פילוח חודשי

### Migration (העברת נתונים)
- `POST /api/migrate` - העברת נתונים מישנים

## 🛠️ טכנולוגיות

### Frontend
- HTML5 + CSS3
- Vanilla JavaScript (ללא תלויות)
- Tailwind CSS (CDN)
- Chart.js - גרפים
- Sortable.js - גרירה ושחרור

### Backend
- Node.js
- Express.js
- better-sqlite3 - מסד נתונים
- CORS - תמיכה ב-Cross-Origin
LowDB - JSON database
## 💾 מסד הנתונים

המערכת משתמשת ב-LowDB - מסד נתונים JSON פשוט:
- **חינמי לחלוטין** - ללא צורך בשרת חיצוני
- **קל להתקנה** - אין צורך ב-Build Tools
- **מהיר ויעיל** - מתאים לאפליקציות קטנות-בינוניות
- **גיבוי פשוט** - העתק את הקובץ `db.json`

### גיבוי ושחזור
```bash
# גיבוי
copy db.json db_backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%.json

# שחזור
copy db_backup_20251225.json db.json
```

## 🔒 אבטחה

- מסד הנתונים מקומי בלבד
- אין חשיפה לאינטרנט (אלא אם מגדירים)
- localStorage כ-fallback
- CORS מוגבל למקור מקומי

## 🐛 בעיות נפוצות

### השרת לא עולה
```bash
# בדוק אם הפורט תפוס
netstat -ano | findstr :3000

# הרוג תהליך קיים
taskkill /PID <PID> /F

# או שנה פורט ב-server.js
```

### נתונים לא נשמרים
1. בדוק שהשרת פועל
2. פתח Console בדפדפן (F12)
3. חפש שגיאות אדומות
4. בדוק שהקובץ `db.json` נוצר בתיקיית הפרויקט

## 📝 הערות גרסה

### V9.0 - Database Edition (25.12.2025)
- ✅ מעבר ממסד נתונים ל-SQLite
- ✅ ניתוק מ-Google Sheets
- ✅ ארגון קוד - הפרדה ל-HTML, CSS, JS
- ✅ API RESTful מלא
- ✅ כלי הלמסד נתונים LowDB (JSON)
- ✅ ניתוק מ-Google Sheets
- ✅ ארגון קוד - הפרדה ל-HTML, CSS, JS
- ✅ API RESTful מלא
- ✅ כלי העברת נתונים
- ✅ ביצועים משופרים
- ✅ התקנה פשוטה ללא Build Toolsד נתונים
- localStorage כמטמון

## 🤝 תמיכה

לשאלות או בעיות:
1. פתח את ה-Console בדפדפן (F12)
2. בדוק שגיאות בקובץ `crm.db`
3. ודא ש-Node.js פועל בגרסה מעודכנת

## 📄 רישיון

פרויקט פרטי לשימוש עסקי פנימי.

---

**Built with ❤️ by Luna** 🌙  
*Illuminate your business path*


## 🎯 תכונות עיקריות

- **ניהול לידים מתקדם** - לוח קנבן עם גרירה ושחרור
- **מעקב הכנסות** - רישום עסקאות ותשלומים
- **סטטיסטיקות** - גרפים וניתוחים חודשיים ושנתיים
- **מסד נתונים SQLite** - חינמי ללא תלות בשרת חיצוני
- **ממשק עברית מלא** - תמיכה מלאה ב-RTL
- **ניהול כלות** - מעקב מיוחד לעסקאות כלה

## 📦 התקנה

### דרישות מקדימות
- Node.js (גרסה 14 ומעלה)
- npm (מגיע עם Node.js)

### שלבי התקנה

1. **התקנת תלויות:**
```bash
npm install
```

2. **הרצת השרת:**
```bash
npm start
```

השרת יפעל על: http://localhost:3000

## 🚀 שימוש

### הרצה במצב פיתוח
```bash
npm run dev
```
השרת יתחיל מחדש אוטומטית עם כל שינוי בקוד.

### פתיחת האתר
פתח דפדפן וגש ל: http://localhost:3000/index_new.html

### העברת נתונים קיימים
אם יש לך נתונים מהגרסה הישנה (Google Sheets):
1. היכנס לעמוד הסטטיסטיקה
2. לחץ על כפתור "📤 העבר נתונים מישנים"
3. כל הנתונים יועברו אוטומטית מ-localStorage למסד הנתונים

## 🗂️ מבנה הפרויקט

```
Ayamakeup/
├── css/
│   └── styles.css          # עיצוב מסודר
├── js/
│   ├── app.js              # גרסה ישנה (Google Sheets)
│   └── app_db.js           # גרסה חדשה (Database)
├── index.html              # גרסה מקורית
├── index_new.html          # גרסה חדשה מסודרת
├── server.js               # שרת Node.js + API
├── package.json            # תלויות הפרויקט
└── db.json                 # מסד נתונים (נוצר אוטומטית)
```

## 🔌 API Endpoints

### Clients (הכנסות)
- `GET /api/clients` - קבלת כל הלקוחות
- `GET /api/clients/month/:month` - סינון לפי חודש
- `POST /api/clients` - הוספת לקוח חדש
- `PUT /api/clients/:id` - עדכון לקוח
- `DELETE /api/clients/:id` - מחיקת לקוח
- `POST /api/clients/bulk-delete` - מחיקה מרובה

### Leads (לידים)
- `GET /api/leads` - קבלת כל הלידים
- `GET /api/leads/status/:status` - סינון לפי סטטוס
- `POST /api/leads` - הוספת ליד חדש
- `PATCH /api/leads/:id/status` - עדכון סטטוס (לגרירה)
- `PUT /api/leads/:id` - עדכון ליד
- `DELETE /api/leads/:id` - מחיקת ליד

### Statistics (סטטיסטיקה)
- `GET /api/stats/summary?month=` - סיכום סטטיסטי
- `GET /api/stats/monthly` - פילוח חודשי

### Migration (העברת נתונים)
- `POST /api/migrate` - העברת נתונים מישנים

## 🛠️ טכנולוגיות

### Frontend
- HTML5 + CSS3
- Vanilla JavaScript (ללא תלויות)
- Tailwind CSS (CDN)
- Chart.js - גרפים
- Sortable.js - גרירה ושחרור

### Backend
- Node.js
- Express.js
- better-sqlite3 - מסד נתונים
- CORS - תמיכה ב-Cross-Origin
LowDB - JSON database
## 💾 מסד הנתונים

המערכת משתמשת ב-LowDB - מסד נתונים JSON פשוט:
- **חינמי לחלוטין** - ללא צורך בשרת חיצוני
- **קל להתקנה** - אין צורך ב-Build Tools
- **מהיר ויעיל** - מתאים לאפליקציות קטנות-בינוניות
- **גיבוי פשוט** - העתק את הקובץ `db.json`

### גיבוי ושחזור
```bash
# גיבוי
copy db.json db_backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%.json

# שחזור
copy db_backup_20251225.json db.json
```

## 🔒 אבטחה

- מסד הנתונים מקומי בלבד
- אין חשיפה לאינטרנט (אלא אם מגדירים)
- localStorage כ-fallback
- CORS מוגבל למקור מקומי

## 🐛 בעיות נפוצות

### השרת לא עולה
```bash
# בדוק אם הפורט תפוס
netstat -ano | findstr :3000

# הרוג תהליך קיים
taskkill /PID <PID> /F

# או שנה פורט ב-server.js
```

### נתונים לא נשמרים
1. בדוק שהשרת פועל
2. פתח Console בדפדפן (F12)
3. חפש שגיאות אדומות
4. בדוק שהקובץ `db.json` נוצר בתיקיית הפרויקט

## 📝 הערות גרסה

### V9.0 - Database Edition (25.12.2025)
- ✅ מעבר ממסד נתונים ל-SQLite
- ✅ ניתוק מ-Google Sheets
- ✅ ארגון קוד - הפרדה ל-HTML, CSS, JS
- ✅ API RESTful מלא
- ✅ כלי הלמסד נתונים LowDB (JSON)
- ✅ ניתוק מ-Google Sheets
- ✅ ארגון קוד - הפרדה ל-HTML, CSS, JS
- ✅ API RESTful מלא
- ✅ כלי העברת נתונים
- ✅ ביצועים משופרים
- ✅ התקנה פשוטה ללא Build Toolsד נתונים
- localStorage כמטמון

## 🤝 תמיכה

לשאלות או בעיות:
1. פתח את ה-Console בדפדפן (F12)
2. בדוק שגיאות בקובץ `crm.db`
3. ודא ש-Node.js פועל בגרסה מעודכנת

## 📄 רישיון

פרויקט פרטי לשימוש עסקי פנימי.

---

**Built with ❤️ by Luna** 🌙  
*Illuminate your business path*
