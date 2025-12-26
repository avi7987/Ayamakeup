# 📊 סיכום עדכון V10.0 - מערכת יצירת חוזים

## ✨ תכונות חדשות

### 1. שדות נוספים בליד
- **lastName** - שם משפחה (נוסף לטופס הוספת ליד)
- **hasEscort** - האם יש ליווי?
- **escortPrice** - מחיר ליווי
- **hasBridesmaids** - האם יש מלוות?
- **bridesmaidsCount** - כמות מלוות
- **bridesmaidsPrice** - מחיר עבור מלוות
- **contractFileUrl** - קישור לקובץ החוזה שנוצר

### 2. מערכת העלאת תבניות
- ממשק להעלאת קובץ Word בהגדרות ההודעות (שלב "נשלח חוזה")
- אינדיקציה של סטטוס התבנית (קיימת/לא קיימת)
- תמיכה במשתנים דינמיים ({{firstName}}, {{lastName}}, וכו')
- שמירה בשרת בתיקיית uploads/

### 3. יצירת חוזים אוטומטית
- **ממלא אוטומטי** של תבנית Word עם נתוני הליד
- **המרה ל-PDF** באמצעות Puppeteer (דפדפן headless)
- **שמירה בשרת** בתיקיית contracts/
- **עיצוב RTL** תואם עברית ב-PDF
- שני פורמטים: Word + PDF

### 4. תצוגה מקדימה
- Modal חדש עם PDF viewer
- אפשרות לראות את החוזה לפני שליחה
- כפתור "אשר ושלח" או "חזור" לתיקונים

### 5. אינטגרציה עם WhatsApp
- הוספת קישור להורדת החוזה בהודעה
- שליחה אוטומטית דרך WhatsApp Web
- תיעוד בהיסטוריית ההודעות עם URL של החוזה

### 6. שדות נוספים במודל אישור WhatsApp
- מופיע רק בשלב "נשלח חוזה"
- שדות מילוי: שם משפחה, פרטי ליווי, פרטי מלוות
- תצוגה/הסתרה דינמית של שדות לפי צ'קבוקס

## 🛠️ שינויים טכניים

### Backend (server-cloud.js)
```javascript
// חבילות חדשות
const multer = require('multer');
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const puppeteer = require('puppeteer');

// אנדפוינטים חדשים
POST /api/contract-template        // העלאת תבנית
POST /api/generate-contract/:leadId // יצירת חוזה
GET /api/contract-template/status  // בדיקת סטטוס תבנית
```

### Frontend (app_db.js)
```javascript
// אובייקט חדש
const ContractManager = {
    uploadTemplate()      // העלאת תבנית
    checkTemplateStatus() // בדיקת סטטוס
    generateContract()    // יצירת חוזה
}

// עדכון WhatsAppAutomation
checkAndPrompt()     // תמיכה בשדות חוזה
sendConfirmed()      // טיפול בשליחת חוזה
previewContract()    // תצוגה מקדימה
confirmContractSend()// אישור לאחר תצוגה מקדימה
```

### UI (index.html)
```html
<!-- טופס הוספת ליד -->
<input id="lead-last-name"> <!-- שם משפחה -->

<!-- מודל אישור WhatsApp -->
<div id="contract-additional-fields"> <!-- שדות נוספים -->
<div id="contract-actions"> <!-- כפתור תצוגה מקדימה -->

<!-- מודל תצוגה מקדימה -->
<div id="modal-contract-preview">
  <iframe id="contract-preview-frame">
</div>
```

## 📦 תלויות חדשות (package.json)
```json
{
  "docxtemplater": "^3.x", // עיבוד תבניות Word
  "pizzip": "^3.x",        // קריאת קבצי ZIP/DOCX
  "multer": "^1.x",        // העלאת קבצים
  "puppeteer": "^21.x"     // המרה ל-PDF
}
```

## 📁 מבנה קבצים חדש
```
/uploads/
  └── contract-template.docx  (תבנית שהועלתה)

/contracts/
  ├── contract-{leadId}.docx  (חוזה Word ממולא)
  └── contract-{leadId}.pdf   (חוזה PDF)

/CONTRACT_SYSTEM_GUIDE.md     (מדריך מפורט)
/CONTRACT_QUICKSTART.md        (התחלה מהירה)
/CONTRACT_TEMPLATE_EXAMPLE.txt (דוגמת תבנית)
```

## 🔄 תהליך עבודה מלא

```
1. הגדרה ראשונית:
   └─> יצירת תבנית Word
   └─> העלאה דרך "הגדרות הודעות"

2. הוספת ליד:
   └─> מילוי שם פרטי + שם משפחה
   └─> בחירת מקור הגעה מרשימה (dropdown)

3. העברה לשלב "נשלח חוזה":
   └─> פתיחת מודל אישור
   └─> מילוי שדות נוספים (ליווי, מלוות)
   └─> [אופציונלי] תצוגה מקדימה
   └─> לחיצה על "שלח עכשיו"

4. יצירת חוזה אוטומטית:
   └─> מילוי תבנית Word עם נתונים
   └─> המרה ל-PDF
   └─> שמירה בשרת
   └─> עדכון ה-lead עם URL

5. שליחת WhatsApp:
   └─> פתיחת WhatsApp עם ההודעה
   └─> הוספת קישור לחוזה
   └─> תיעוד בהיסטוריה
```

## 🎯 יתרונות המערכת

1. **אוטומציה מלאה** - מכפתור אחד לחוזה מוכן
2. **עיצוב מותאם אישית** - השתמש בתבנית Word שלך
3. **גמישות** - תמיכה במשתנים רבים
4. **תצוגה מקדימה** - בדיקה לפני שליחה
5. **שמירה מרכזית** - כל החוזים נשמרים בשרת
6. **אינטגרציה חלקה** - עובד עם מערכת ה-WhatsApp הקיימת

## 🚀 גרסאות עתידיות (רעיונות)

- ✅ הוספת חתימה דיגיטלית
- ✅ שליחת החוזה כקובץ מצורף ב-WhatsApp (דורש Business API)
- ✅ תבניות מרובות לסוגי שירותים שונים
- ✅ גרסאות חוזה (v1, v2, v3...)
- ✅ סטטיסטיקות חוזים (כמה נשלחו, כמה נחתמו)
- ✅ תזכורת אוטומטית לחתימה
- ✅ סנכרון עם Google Drive

## 📝 הערות חשובות

### בעיות ידועות ופתרונות:
1. **Puppeteer במערכת הפקה (Railway)**
   - דורש התקנה של Chrome dependencies
   - ייתכן צורך ב-buildpack מיוחד
   - חלופה: שימוש ב-pdf-lib במקום Puppeteer

2. **תמיכה ב-RTL**
   - ה-PDF generator תומך בעברית
   - ייתכן שדרוש font מותאם לעברית

3. **גודל קבצים**
   - נדרש לוודא שיש מספיק מקום דיסק ב-Railway
   - שקול מנגנון ניקוי קבצים ישנים

### המלצות deployment:
```bash
# Railway buildpack for Puppeteer
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

## 📊 סטטיסטיקות עדכון

- **קבצים שונו:** 4 (server-cloud.js, app_db.js, index.html, .gitignore)
- **שורות נוספו:** ~840 שורות קוד
- **חבילות הותקנו:** 130 packages (כולל dependencies של puppeteer)
- **אנדפוינטים חדשים:** 3
- **משתנים זמינים:** 15
- **מודלים חדשים:** 2 (contract-preview, contract fields)

## ✅ בדיקות שבוצעו

- [x] Syntax check - אין שגיאות
- [x] Git commit successful
- [x] Push to GitHub successful
- [ ] בדיקה מקומית (דורש npm install)
- [ ] בדיקה ב-Railway (דורש deploy)
- [ ] בדיקת יצירת חוזה אמיתי
- [ ] בדיקת תצוגה מקדימה
- [ ] בדיקת שליחת WhatsApp

## 🎓 למידה והדרכה

קבצי עזר שנוצרו:
1. **CONTRACT_SYSTEM_GUIDE.md** - מדריך מפורט עם דוגמאות
2. **CONTRACT_QUICKSTART.md** - התחלה מהירה ל-5 דקות
3. **CONTRACT_TEMPLATE_EXAMPLE.txt** - דוגמת תבנית מוכנה לשימוש
4. **SUMMARY.md** - המסמך הזה

---

**גרסה:** V10.0  
**תאריך:** 27.12.2025  
**Build:** 27122025  
**Developer:** GitHub Copilot with Claude Sonnet 4.5
