# 🌙 Luna - Change History

*Illuminate your business path*

---

## גרסה 11.0 - שדות שירות דינמיים (28.12.2024)

### שינויים משמעותיים
1. **שם משפחה חובה** - שדה lastName הפך לשדה חובה ביצירת ליד
2. **מודל מחיר** - מודל קופץ להזנת מחיר בעת מעבר לשלב "בטיפול"
3. **ליווי משופר** - dropdown עם 3 אופציות במקום checkbox:
   - ללא ליווי
   - ליווי קצר
   - ליווי ארוך
4. **מלוות דינמיות** - שורות נפרדות לכל מלווה עם:
   - תיאור השירות
   - מחיר נפרד לכל מלווה

### שינויים טכניים

#### Schema Changes (MongoDB)
```javascript
{
  lastName: { type: String, required: true },  // הפך לחובה
  escortType: { type: String, default: 'none' }, // 'none' | 'short' | 'long'
  bridesmaids: [{                               // מערך במקום count + price
    service: String,
    price: Number
  }]
}
```

#### JavaScript Functions
- `StageManager` - ניהול מודל הזנת מחיר
- `toggleEscortPrice()` - הצגה/הסתרה של שדה מחיר ליווי
- `updateBridesmaidsFields()` - יצירת שדות דינמיים למלוות

#### Contract Generation
- חישוב מחיר כולל עם ליווי ומלוות
- טבלת שירותים מפורטת עם שורה לכל מלווה
- תרגום עברי לסוגי ליווי בחוזה

### קבצים ששונו
- `server-cloud.js` - עדכון schema, PDF generation
- `public/index.html` - מודלים חדשים, שדות דינמיים
- `public/js/app_db.js` - StageManager, פונקציות UI חדשות
- `README.md` - תיעוד מעודכן

---

## גרסה 10.1 - שיפור חוזה (25.12.2024)

### תכונות חדשות
- טבלת שירותים מקצועית בחוזה
- חישוב יתרה אוטומטי
- עיצוב עברי משופר
- תמיכה בליווי ומלוות

---

## גרסה 10.0 - מערכת חוזים (24.12.2024)

### תכונות עיקריות
- יצירת חוזה מתבנית Word
- המרה אוטומטית ל-PDF
- שליחה אוטומטית ב-WhatsApp
- שמירת היסטוריית חוזים

### טכנולוגיות
- Docxtemplater - מילוי תבניות Word
- Puppeteer - המרה ל-PDF
- WhatsApp API - שליחת הודעות

---

## גרסה 9.0 - מעבר ל-MongoDB (20.12.2024)

### שינויים משמעותיים
- מעבר מ-SQLite ל-MongoDB
- שרת Railway מבוסס cloud
- API מאובטח עם validation
- ביצועים משופרים

---

## גרסה 8.0 - גרסת SQLite (15.12.2024)

### תכונות ראשוניות
- CRM עם לוח קנבן
- ניהול לידים ועסקאות
- מעקב הכנסות ויעדים
- סטטיסטיקות וגרפים
- אינטגרציה עם WhatsApp
