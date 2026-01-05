// debug-mobile-auth.js
// 🔍 Mobile Authentication Debug Middleware
// Logs detailed information about mobile authentication flow

const chalk = require('chalk'); // Optional: for colored console output

/**
 * Mobile User-Agent Detection
 */
function isMobileUserAgent(userAgent) {
    if (!userAgent) return false;
    return /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
}

/**
 * Debug Middleware - Logs authentication state for mobile devices
 * Place this AFTER passport.initialize() and passport.session()
 */
function debugMobileAuth(req, res, next) {
    const userAgent = req.get('user-agent');
    const isMobile = isMobileUserAgent(userAgent);
    
    // Only log for mobile devices or if explicitly debugging
    if (!isMobile && !req.query.debug) {
        return next();
    }

    const debugInfo = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        isMobile,
        userAgent,
        
        // Session Information
        hasSession: !!req.session,
        sessionID: req.sessionID,
        sessionCookie: req.session?.cookie,
        
        // Authentication Status
        isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
        hasUser: !!req.user,
        userId: req.user?._id?.toString(),
        userEmail: req.user?.email,
        
        // Headers
        origin: req.get('origin'),
        referer: req.get('referer'),
        host: req.get('host'),
        protocol: req.protocol,
        secure: req.secure,
        
        // Cookies
        hasCookies: !!req.cookies || !!req.headers.cookie,
        rawCookieHeader: req.headers.cookie,
        sessionCookieName: 'connect.sid',
        hasSessionCookie: req.headers.cookie?.includes('connect.sid'),
        
        // Request Details
        ip: req.ip || req.connection.remoteAddress,
        xhr: req.xhr
    };

    // Color-coded console output
    console.log('\n' + '='.repeat(80));
    console.log(`🔍 MOBILE AUTH DEBUG - ${debugInfo.timestamp}`);
    console.log('='.repeat(80));
    
    console.log(`📱 Device: ${isMobile ? 'MOBILE' : 'DESKTOP'}`);
    console.log(`🌐 Request: ${debugInfo.method} ${debugInfo.path}`);
    console.log(`🔐 Authenticated: ${debugInfo.isAuthenticated ? '✅ YES' : '❌ NO'}`);
    
    if (debugInfo.hasUser) {
        console.log(`👤 User: ${debugInfo.userEmail} (${debugInfo.userId})`);
    } else {
        console.log(`👤 User: ❌ None`);
    }
    
    console.log(`\n📦 SESSION:`);
    console.log(`   - Has Session: ${debugInfo.hasSession ? '✅' : '❌'}`);
    console.log(`   - Session ID: ${debugInfo.sessionID || 'None'}`);
    
    if (debugInfo.sessionCookie) {
        console.log(`   - Cookie Config:`);
        console.log(`     • maxAge: ${debugInfo.sessionCookie.maxAge}`);
        console.log(`     • httpOnly: ${debugInfo.sessionCookie.httpOnly}`);
        console.log(`     • secure: ${debugInfo.sessionCookie.secure}`);
        console.log(`     • sameSite: ${debugInfo.sessionCookie.sameSite}`);
        console.log(`     • domain: ${debugInfo.sessionCookie.domain || 'undefined'}`);
        console.log(`     • path: ${debugInfo.sessionCookie.path}`);
    }
    
    console.log(`\n🍪 COOKIES:`);
    console.log(`   - Has Cookies: ${debugInfo.hasCookies ? '✅' : '❌'}`);
    console.log(`   - Has Session Cookie: ${debugInfo.hasSessionCookie ? '✅' : '❌'}`);
    console.log(`   - Raw Cookie Header: ${debugInfo.rawCookieHeader || 'None'}`);
    
    console.log(`\n🌍 REQUEST DETAILS:`);
    console.log(`   - Origin: ${debugInfo.origin || 'None'}`);
    console.log(`   - Referer: ${debugInfo.referer || 'None'}`);
    console.log(`   - Host: ${debugInfo.host}`);
    console.log(`   - Protocol: ${debugInfo.protocol}`);
    console.log(`   - Secure: ${debugInfo.secure ? '✅' : '❌'}`);
    console.log(`   - IP: ${debugInfo.ip}`);
    console.log(`   - User-Agent: ${userAgent?.substring(0, 100)}...`);
    
    // CRITICAL CHECKS
    console.log(`\n⚠️ CRITICAL CHECKS:`);
    
    // Check 1: Session Cookie Present
    if (!debugInfo.hasSessionCookie) {
        console.log(`   ❌ ISSUE 1: Session cookie NOT being sent by browser`);
        console.log(`      → Mobile browser may be blocking cookie`);
        console.log(`      → Check SameSite and Secure flags`);
    } else {
        console.log(`   ✅ Session cookie present in request`);
    }
    
    // Check 2: Authentication Mismatch
    if (debugInfo.hasSession && !debugInfo.isAuthenticated) {
        console.log(`   ⚠️ ISSUE 2: Session exists but user NOT authenticated`);
        console.log(`      → Session may not contain user data`);
        console.log(`      → Check passport deserialization`);
    } else if (debugInfo.isAuthenticated) {
        console.log(`   ✅ User authenticated successfully`);
    }
    
    // Check 3: Cookie Configuration for Mobile
    if (isMobile && debugInfo.sessionCookie) {
        const { secure, sameSite } = debugInfo.sessionCookie;
        
        if (!secure && debugInfo.protocol === 'https') {
            console.log(`   ⚠️ ISSUE 3: secure=false but request is HTTPS`);
            console.log(`      → Cookie should have secure=true for HTTPS`);
        }
        
        if (sameSite === 'none' && !secure) {
            console.log(`   ❌ ISSUE 4: SameSite=none requires secure=true`);
            console.log(`      → Mobile browsers will reject this cookie`);
        }
        
        if (sameSite === 'strict') {
            console.log(`   ⚠️ ISSUE 5: SameSite=strict may block OAuth callback`);
            console.log(`      → Consider using 'lax' for OAuth flows`);
        }
    }
    
    console.log('='.repeat(80) + '\n');
    
    // Also log to file for persistent debugging
    if (process.env.LOG_MOBILE_AUTH === 'true') {
        const fs = require('fs');
        const logEntry = `${JSON.stringify(debugInfo, null, 2)}\n\n`;
        fs.appendFileSync('mobile-auth-debug.log', logEntry);
    }
    
    next();
}

/**
 * Callback Debug Middleware - Specifically for OAuth callback
 * Place this BEFORE the passport.authenticate callback
 */
function debugOAuthCallback(req, res, next) {
    console.log('\n' + '🔐'.repeat(40));
    console.log('🔐 OAUTH CALLBACK RECEIVED');
    console.log('🔐'.repeat(40));
    console.log(`📱 Mobile: ${isMobileUserAgent(req.get('user-agent')) ? 'YES' : 'NO'}`);
    console.log(`🔗 Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
    console.log(`❓ Query Params:`, req.query);
    console.log(`🍪 Incoming Cookies:`, req.headers.cookie || 'None');
    console.log(`📦 Session ID (before auth):`, req.sessionID || 'None');
    console.log('🔐'.repeat(40) + '\n');
    next();
}

/**
 * Session Save Debug - Wrap around req.session.save()
 */
function debugSessionSave(req, res, next) {
    if (!req.session || !req.session.save) {
        return next();
    }
    
    const originalSave = req.session.save.bind(req.session);
    req.session.save = function(callback) {
        console.log('💾 Saving session...');
        console.log(`   - Session ID: ${req.sessionID}`);
        console.log(`   - User: ${req.user?.email || 'None'}`);
        
        originalSave((err) => {
            if (err) {
                console.log('❌ Session save FAILED:', err.message);
            } else {
                console.log('✅ Session saved successfully');
                console.log(`🍪 Set-Cookie header will be: connect.sid=${req.sessionID}`);
            }
            callback(err);
        });
    };
    
    next();
}

module.exports = {
    debugMobileAuth,
    debugOAuthCallback,
    debugSessionSave,
    isMobileUserAgent
};
