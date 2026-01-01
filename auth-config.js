// auth-config.js
// מודול נפרד לניהול אימות Google OAuth
// לא משנה את הקוד הקיים - רק מוסיף פונקציונליות חדשה

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const path = require('path');

/**
 * הגדרת מערכת האימות - להוסיף ל-server לפני כל ה-routes
 * @param {Express} app - Express app instance
 * @param {Mongoose} mongoose - Mongoose instance
 * @param {Model} User - User model
 */
function setupAuth(app, mongoose, User) {
    console.log('🔐 Setting up authentication system...');

    // Session middleware - חייב להיות לפני passport
    app.use(session({
        secret: process.env.SESSION_SECRET || 'luna-secret-key-change-in-production',
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGODB_URI,
            collectionName: 'sessions',
            ttl: 30 * 24 * 60 * 60 // 30 ימים
        }),
        cookie: {
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 ימים
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // HTTPS בלבד ב-production
            sameSite: 'lax'
        }
    }));

    // אתחול Passport
    app.use(passport.initialize());
    app.use(passport.session());

    // Serialize user - שמירת ה-ID ב-session
    passport.serializeUser((user, done) => {
        console.log('💾 Serializing user:', user.email);
        done(null, user._id.toString());
    });

    // Deserialize user - טעינת המשתמש מה-DB
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            if (!user) {
                console.log('⚠️ User not found in deserialize:', id);
                return done(null, false);
            }
            console.log('✅ User deserialized:', user.email);
            done(null, user);
        } catch (err) {
            console.error('❌ Error deserializing user:', err);
            done(err, null);
        }
    });

    // Google OAuth Strategy
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.warn('⚠️ WARNING: Google OAuth credentials not configured!');
        console.warn('   Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
        return; // לא להמשיך אם אין credentials
    }

    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
        scope: [
            'profile',
            'email',
            'https://www.googleapis.com/auth/calendar'
        ]
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            console.log('🔐 Google OAuth callback received');
            console.log('   Google ID:', profile.id);
            console.log('   Email:', profile.emails[0].value);
            
            // בדיקה אם המשתמש קיים
            let user = await User.findOne({ googleId: profile.id });
            
            if (user) {
                // משתמש קיים - עדכון פרטים
                console.log('✅ Existing user found:', user.email);
                user.lastLogin = new Date();
                user.accessToken = accessToken;
                if (refreshToken) {
                    user.refreshToken = refreshToken;
                }
                user.tokenExpiry = new Date(Date.now() + 3600 * 1000); // שעה
                await user.save();
            } else {
                // משתמש חדש - יצירה
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
                console.log('✨ New user created successfully!');
            }
            
            return done(null, user);
        } catch (error) {
            console.error('❌ Error in Google OAuth callback:', error);
            return done(error, null);
        }
    }));

    console.log('✅ Authentication system configured');
}

/**
 * Middleware לבדיקת אימות
 * מגן על routes שדורשים התחברות
 * תומך ב-fallback mode אם אימות לא מוגדר
 */
function requireAuth(req, res, next) {
    // FALLBACK MODE: אם אימות לא מוגדר, השתמש ב-user ברירת מחדל
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        // Mode ללא אימות - צור mock user
        req.user = {
            _id: 'default-user-id',
            email: 'default@ayamakeup.com',
            name: 'Default User'
        };
        return next();
    }
    
    // רק אם אימות מוגדר, בדוק אם המשתמש מאומת
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }
    
    console.log('🚫 Unauthorized access attempt to:', req.path);
    
    // אם זה בקשת API - החזר 401
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ 
            error: 'נדרשת התחברות',
            redirectTo: '/login',
            message: 'אנא התחבר כדי להמשיך'
        });
    }
    
    // אחרת - redirect לדף התחברות
    res.redirect('/login');
}

/**
 * Middleware אופציונלי - לא חוסם אם אין אימות
 * שימושי לדפים שעובדים גם בלי התחברות אבל משתנים אם יש
 */
function optionalAuth(req, res, next) {
    // פשוט ממשיך - req.user יהיה undefined אם לא מחובר
    next();
}

/**
 * הגדרת Auth Routes
 * @param {Express} app - Express app instance
 */
function setupAuthRoutes(app) {
    console.log('🛣️ Setting up auth routes...');

    // דף התחברות
    app.get('/login', (req, res) => {
        if (req.isAuthenticated()) {
            console.log('👤 User already authenticated, redirecting to dashboard');
            return res.redirect('/');
        }
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    });

    // התחלת תהליך OAuth
    app.get('/auth/google',
        passport.authenticate('google', {
            scope: [
                'profile',
                'email',
                'https://www.googleapis.com/auth/calendar'
            ],
            accessType: 'offline', // כדי לקבל refresh token
            prompt: 'consent' // לוודא שמקבלים refresh token תמיד
        })
    );

    // Callback מ-Google
    app.get('/auth/google/callback',
        passport.authenticate('google', {
            failureRedirect: '/login?error=auth_failed',
            failureMessage: true
        }),
        (req, res) => {
            console.log('✅ User authenticated successfully:', req.user.email);
            console.log('🏠 Redirecting to dashboard');
            res.redirect('/');
        }
    );

    // התנתקות - Support both GET and POST
    const logoutHandler = (req, res) => {
        const userEmail = req.user?.email || 'Unknown';
        console.log('👋 User logging out:', userEmail);
        
        req.logout((err) => {
            if (err) {
                console.error('❌ Error during logout:', err);
            }
            req.session.destroy((err) => {
                if (err) {
                    console.error('❌ Error destroying session:', err);
                }
                res.clearCookie('connect.sid');
                console.log('✅ Logout successful');
                
                // If it's a POST request (from fetch), send JSON
                if (req.method === 'POST') {
                    res.json({ success: true, message: 'Logged out successfully' });
                } else {
                    // If it's a GET request, redirect
                    res.redirect('/');
                }
            });
        });
    };
    
    app.get('/auth/logout', logoutHandler);
    app.post('/auth/logout', logoutHandler);

    // בדיקת סטטוס אימות (ל-frontend)
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
            res.json({ 
                authenticated: false 
            });
        }
    });

    // מידע על המשתמש המחובר
    app.get('/api/auth/me', requireAuth, (req, res) => {
        res.json({
            id: req.user._id,
            email: req.user.email,
            name: req.user.name,
            picture: req.user.picture,
            createdAt: req.user.createdAt,
            lastLogin: req.user.lastLogin
        });
    });

    console.log('✅ Auth routes configured');
}

// Export כל הפונקציות
module.exports = {
    setupAuth,
    requireAuth,
    optionalAuth,
    setupAuthRoutes
};
