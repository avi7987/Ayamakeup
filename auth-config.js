// auth-config.js
// מודול נפרד לניהול אימות Google OAuth
// לא משנה את הקוד הקיים - רק מוסיף פונקציונליות חדשה

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const path = require('path');

// Optional debug middleware - won't break if module has issues
let debugMobileAuth, debugOAuthCallback, debugSessionSave;
try {
    const debugModule = require('./debug-mobile-auth');
    debugMobileAuth = debugModule.debugMobileAuth;
    debugOAuthCallback = debugModule.debugOAuthCallback;
    debugSessionSave = debugModule.debugSessionSave;
    console.log('✅ Debug middleware loaded');
} catch (error) {
    console.log('⚠️ Debug middleware not available:', error.message);
    // Fallback: no-op middlewares
    debugMobileAuth = (req, res, next) => next();
    debugOAuthCallback = (req, res, next) => next();
    debugSessionSave = (req, res, next) => next();
}

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
            // 🔒 MOBILE FIX: secure must be true for HTTPS (Railway auto-provides HTTPS)
            secure: process.env.NODE_ENV === 'production',
            // 🔒 MOBILE FIX: 'lax' works for OAuth callbacks AND mobile browsers
            // 'none' requires exact domain match and can be blocked by mobile Safari
            sameSite: 'lax',
            // 🔒 MOBILE FIX: Remove domain setting - let browser handle it
            // Setting domain can cause cookie to be rejected on mobile
            domain: undefined
        }
    }));

    // אתחול Passport
    app.use(passport.initialize());
    app.use(passport.session());
    
    // 🔍 Debug middleware for mobile authentication (after passport setup)
    app.use(debugSessionSave);
    app.use(debugMobileAuth);

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
        callbackURL: process.env.GOOGLE_CALLBACK_URL || (
            process.env.NODE_ENV === 'production' 
                ? 'https://lunabusiness.up.railway.app/auth/google/callback'
                : 'http://localhost:3001/auth/google/callback'
        ),
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
        debugOAuthCallback, // 🔍 Debug before passport processes
        passport.authenticate('google', {
            failureRedirect: '/login?error=auth_failed',
            failureMessage: true
        }),
        (req, res) => {
            const userAgent = req.get('user-agent');
            const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
            
            console.log('✅ User authenticated successfully:', req.user.email);
            console.log('📱 Device Type:', isMobile ? 'MOBILE' : 'DESKTOP');
            console.log('📦 Session ID:', req.sessionID);
            console.log('🍪 Session Cookie Config:', req.session.cookie);
            console.log('🔐 req.isAuthenticated():', req.isAuthenticated());
            
            // 🔒 MOBILE FIX: Explicitly save session before redirect
            // Mobile browsers need confirmation that session is persisted
            req.session.save((err) => {
                if (err) {
                    console.error('❌ Failed to save session:', err);
                    console.error('   → User will appear logged out on redirect');
                    return res.redirect('/login?error=session_failed');
                }
                
                console.log('✅ Session saved successfully');
                console.log('   → Session ID:', req.sessionID);
                console.log('   → User ID:', req.user._id);
                
                // 🔒 MOBILE FIX: Add explicit Set-Cookie header verification
                const cookieHeader = res.getHeader('Set-Cookie');
                console.log('🍪 Set-Cookie header:', cookieHeader);
                
                if (!cookieHeader || !cookieHeader.toString().includes('connect.sid')) {
                    console.error('⚠️ WARNING: Set-Cookie header missing or invalid!');
                    console.error('   → Mobile browser may not receive session cookie');
                }
                
                console.log('🏠 Redirecting to dashboard...');
                
                // Add a small delay for mobile browsers to process the cookie
                if (isMobile) {
                    console.log('📱 Mobile detected - adding 100ms delay before redirect');
                    setTimeout(() => {
                        res.redirect('/');
                    }, 100);
                } else {
                    res.redirect('/');
                }
            });
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
        const userAgent = req.get('user-agent');
        const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
        
        console.log('🔍 Auth status check:');
        console.log('   - Device:', isMobile ? 'MOBILE' : 'DESKTOP');
        console.log('   - Session ID:', req.sessionID);
        console.log('   - Has Session Cookie:', req.headers.cookie?.includes('connect.sid') ? '✅' : '❌');
        console.log('   - isAuthenticated():', req.isAuthenticated ? req.isAuthenticated() : 'N/A');
        console.log('   - Has User:', !!req.user);
        
        if (req.isAuthenticated()) {
            console.log('   - User Email:', req.user.email);
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
            console.log('   ❌ User NOT authenticated');
            console.log('   → Check if session cookie is being sent');
            res.json({ 
                authenticated: false,
                debug: {
                    hasSession: !!req.session,
                    sessionID: req.sessionID,
                    hasCookie: !!req.headers.cookie
                }
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
    setupAuthRoutes,
    debugMobileAuth,
    debugOAuthCallback,
    debugSessionSave
};
