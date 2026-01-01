# 🔐 LUNA - מדריך יישום מערכת אימות Google OAuth

## 📋 סטטוס הכנת המערכת

### ✅ הושלמו:
1. ספריות OAuth הותקנו (passport, passport-google-oauth20, express-session, connect-mongo, googleapis)
2. סכמת User נוספה למסד הנתונים
3. userId נוסף לכל הסכמות (Client, Lead, Goals, ContractTemplate)

### 🚧 דורש יישום:
1. הגדרת Google Cloud Console והשגת Client ID + Secret
2. הוספת קוד האימות ל-server-cloud.js
3. יצירת דף התחברות (login.html)
4. הגנה על כל ה-API routes
5. עדכון queries להוסיף userId
6. הגדרת משתני סביבה (.env)
7. טסטים ואימות

---

## 🎯 שלב 1: הגדרת Google Cloud Console

### 1.1 יצירת פרויקט Google Cloud

1. **גש ל-Google Cloud Console:**
   https://console.cloud.google.com/

2. **צור פרויקט חדש:**
   - שם הפרויקט: `LUNA CRM`
   - לחץ Create

3. **אפשר את Google Calendar API:**
   - עבור ל-APIs & Services > Library
   - חפש "Google Calendar API"
   - לחץ Enable

4. **אפשר את Google OAuth2 API:**
   - חפש "Google+ API" או "People API"
   - לחץ Enable

### 1.2 יצירת OAuth Credentials

1. **עבור ל-APIs & Services > Credentials**

2. **צור OAuth Client ID:**
   - לחץ על "Create Credentials" > "OAuth Client ID"
   - Application type: Web application
   - Name: `LUNA CRM OAuth`

3. **הגדר Authorized redirect URIs:**
   ```
   http://localhost:3000/auth/google/callback
   https://YOUR-RAILWAY-DOMAIN.railway.app/auth/google/callback
   ```
   (החלף YOUR-RAILWAY-DOMAIN בדומיין האמיתי שלך)

4. **שמור את:**
   - Client ID
   - Client Secret

### 1.3 הגדרת OAuth Consent Screen

1. **עבור ל-OAuth consent screen**
2. **מלא את הפרטים:**
   - App name: `LUNA`
   - User support email: הכנס את המייל שלך
   - Developer contact: הכנס את המייל שלך

3. **Scopes - הוסף:**
   - `userinfo.email`
   - `userinfo.profile`
   - `calendar` (או `calendar.events`)

4. **Test users:**
   - הוסף את המייל שלך לבדיקות

---

## 🔧 שלב 2: הגדרת משתני סביבה

### 2.1 עדכן קובץ .env

הוסף את השורות הבאות ל-`.env`:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Session Secret (יצור מחרוזת אקראית חזקה)
SESSION_SECRET=luna-super-secret-key-change-this-in-production-32chars-min

# Base URL (לצורך redirects)
BASE_URL=http://localhost:3000
```

### 2.2 עדכון ב-Railway (production)

1. גש ל-Railway Dashboard
2. Settings > Variables
3. הוסף את כל המשתנים מלמעלה עם הערכים המתאימים
4. **חשוב:** שנה את `BASE_URL` ל-URL האמיתי שלך:
   ```
   BASE_URL=https://your-app.railway.app
   GOOGLE_CALLBACK_URL=https://your-app.railway.app/auth/google/callback
   ```

---

## 💻 שלב 3: יישום הקוד

בגלל שה-server.js גדול מאוד (1690 שורות), אני ממליץ על אחת מהאופציות הבאות:

### אופציה א' (מומלצת): יצירת קובץ auth נפרד

צור קובץ חדש: `auth-config.js`:

```javascript
// auth-config.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const MongoStore = require('connect-mongo');

// Import User model (יצטרך להיות exported מה-server)
// const { User } = require('./server-cloud');

function setupAuth(app, mongoose, User) {
    // Session middleware
    app.use(session({
        secret: process.env.SESSION_SECRET || 'luna-secret-key',
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGODB_URI,
            ttl: 30 * 24 * 60 * 60 // 30 days
        }),
        cookie: {
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        }
    }));

    // Passport initialization
    app.use(passport.initialize());
    app.use(passport.session());

    // Serialize user
    passport.serializeUser((user, done) => {
        done(null, user._id);
    });

    // Deserialize user
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });

    // Google OAuth Strategy
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        scope: [
            'profile',
            'email',
            'https://www.googleapis.com/auth/calendar'
        ]
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            console.log('🔐 Google OAuth callback received');
            
            // Check if user exists
            let user = await User.findOne({ googleId: profile.id });
            
            if (user) {
                // Update existing user
                console.log('✅ Existing user found:', user.email);
                user.lastLogin = new Date();
                user.accessToken = accessToken;
                if (refreshToken) {
                    user.refreshToken = refreshToken;
                }
                user.tokenExpiry = new Date(Date.now() + 3600 * 1000); // 1 hour
                await user.save();
            } else {
                // Create new user
                console.log('🆕 Creating new user:', profile.emails[0].value);
                user = await User.create({
                    googleId: profile.id,
                    email: profile.emails[0].value,
                    name: profile.displayName,
                    picture: profile.photos[0]?.value || '',
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                    tokenExpiry: new Date(Date.now() + 3600 * 1000)
                });
            }
            
            return done(null, user);
        } catch (error) {
            console.error('❌ Error in Google OAuth:', error);
            return done(error, null);
        }
    }));
}

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    
    // If API request, return 401
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ 
            error: 'נדרשת התחברות',
            redirectTo: '/login'
        });
    }
    
    // Otherwise redirect to login
    res.redirect('/login');
}

// Auth routes
function setupAuthRoutes(app) {
    // Login page
    app.get('/login', (req, res) => {
        if (req.isAuthenticated()) {
            return res.redirect('/');
        }
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    });

    // Start OAuth flow
    app.get('/auth/google',
        passport.authenticate('google', {
            scope: [
                'profile',
                'email',
                'https://www.googleapis.com/auth/calendar'
            ],
            accessType: 'offline',
            prompt: 'consent'
        })
    );

    // OAuth callback
    app.get('/auth/google/callback',
        passport.authenticate('google', {
            failureRedirect: '/login?error=auth_failed',
            failureMessage: true
        }),
        (req, res) => {
            console.log('✅ User authenticated successfully:', req.user.email);
            res.redirect('/');
        }
    );

    // Logout
    app.get('/auth/logout', (req, res) => {
        req.logout((err) => {
            if (err) {
                console.error('Error during logout:', err);
            }
            req.session.destroy(() => {
                res.clearCookie('connect.sid');
                res.redirect('/login');
            });
        });
    });

    // Check auth status (for frontend)
    app.get('/api/auth/status', (req, res) => {
        if (req.isAuthenticated()) {
            res.json({
                authenticated: true,
                user: {
                    id: req.user._id,
                    email: req.user.email,
                    name: req.user.name,
                    picture: req.user.picture
                }
            });
        } else {
            res.json({ authenticated: false });
        }
    });
}

module.exports = {
    setupAuth,
    requireAuth,
    setupAuthRoutes
};
```

### אופציה ב': עדכון ידני של server-cloud.js

אם אתה מעדיף, אני יכול לספק לך את כל השינויים המדויקים שצריך לעשות ב-server-cloud.js.

---

## 📄 שלב 4: יצירת דף התחברות

צור קובץ חדש: `public/login.html`

תוכן מלא בהמשך (עיצוב LUNA).

---

## 🛡️ שלב 5: הגנה על API Routes

כל ה-routes צריכים להוסיף את ה-middleware `requireAuth`:

```javascript
// Before:
app.get('/api/leads', async (req, res) => { ... });

// After:
app.get('/api/leads', requireAuth, async (req, res) => {
    try {
        const userId = req.user._id;
        const leads = await Lead.find({ userId }).sort({ contactDate: -1 });
        res.json(leads);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

---

## 📝 שלב 6: עדכון Queries

כל query למסד נתונים צריך להוסיף `userId`:

### דוגמאות:

```javascript
// GET all leads
const leads = await Lead.find({ userId: req.user._id });

// CREATE lead
const lead = new Lead({
    ...req.body,
    userId: req.user._id
});

// UPDATE lead
const lead = await Lead.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    req.body,
    { new: true }
);

// DELETE lead
await Lead.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id
});
```

---

## 🎨 שלב 7: עיצוב דף התחברות

יצירת login.html בסגנון LUNA (מינימליסטי, נשי, מקצועי).

---

## ✅ שלב 8: בדיקות

### בדיקות לוקליות:
1. `npm start`
2. גש ל-http://localhost:3000
3. בדוק redirect לדף התחברות
4. לחץ על "התחברות עם Google"
5. אשר הרשאות
6. בדוק שאתה מועבר לאפליקציה

### בדיקות ב-Railway:
1. Deploy
2. חזור על אותן בדיקות
3. בדוק Google Calendar permissions

---

## 🚨 חשוב - נקודות לתשומת לב

### מיגרציית נתונים קיימים
אם יש לך כבר נתונים במערכת, תצטרך להריץ סקריפט מיגרציה שמקשר את כל הנתונים הקיימים ל-user הראשון שלך.

### בטיחות
- **אל תשתף** את ה-Client Secret
- השתמש ב-SESSION_SECRET חזק (32+ תווים אקראיים)
- הגדר `secure: true` ב-cookies בייצור

### גיבוי
לפני deploy production, עשה גיבוי למסד הנתונים!

---

## 🤔 למה לא עשינו זאת אוטומטית?

זה פרויקט production עם נתונים קיימים. אני רוצה שתבין כל שינוי ותחליט איך ומתי ליישם אותו.

**האם אתה רוצה:**
1. ✅ שאתחיל ליישם את השלבים הללו כעת?
2. 📖 שאמשיך לפרט יותר כל שלב?
3. 🔄 שניצור סביבת dev נפרדת לבדיקה לפני שנגע ב-production?

תגיד לי איך להמשיך! 🚀
