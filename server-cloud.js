require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs').promises;
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const puppeteer = require('puppeteer');

// Auth system imports
const { setupAuth, requireAuth, setupAuthRoutes } = require('./auth-config');

// Initialize Express App
const app = express();
const PORT = process.env.PORT || 3000;

// 🔒 CRITICAL: Trust proxy for Railway/HTTPS
// Railway uses a proxy, we need to trust it for secure cookies to work
app.set('trust proxy', 1);

// Middleware
app.use(cors({
    origin: true, // Allow all origins for now
    credentials: true // CRITICAL: Allow cookies to be sent
}));
app.use(bodyParser.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('ג ERROR: MONGODB_URI is not defined in .env file');
    process.exit(1);
}

console.log('נ”„ Connecting to MongoDB Atlas...');

// Helper function to get Israel date
function getIsraelDate() {
    return new Date().toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' });
}

// Connect to MongoDB
async function connectDB() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB Atlas successfully!');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

// MongoDB Schemas

// ==================== USER SCHEMA ====================
const userSchema = new mongoose.Schema({
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    picture: { type: String, default: '' },
    // Google Calendar tokens
    accessToken: { type: String, default: '' },
    refreshToken: { type: String, default: '' },
    tokenExpiry: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date, default: Date.now }
});

const clientSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.Mixed, required: false }, // Support both ObjectId and String, optional for backward compatibility
    name: { type: String, required: true },
    phone: { type: String, required: false },
    service: { type: String, required: true },
    price: { type: Number, required: true },
    date: { type: Date, required: true },
    notes: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

const leadSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.Mixed, required: false }, // Support both ObjectId and String, optional for backward compatibility
    name: { type: String, required: true },
    lastName: { type: String, required: true }, // Changed to required
    phone: { type: String, required: true },
    service: { type: String, default: '' },
    status: { type: String, default: 'new' },
    source: { type: String, default: '' },
    eventDate: { type: String, default: '' },
    location: { type: String, default: '' },
    isBride: { type: Boolean, default: false },
    // Enhanced fields
    notes: { type: String, default: '' },
    proposedPrice: { type: Number, default: 0 },
    proposedDeposit: { type: Number, default: 0 }, // Proposed deposit shown in contract
    price: { type: Number, default: 0 },
    deposit: { type: Number, default: 0 }, // Old field - keeping for backwards compatibility
    actualDeposit: { type: Number, default: 0 }, // Actual deposit paid when deal is closed
    depositPaymentMethod: { type: String, default: 'מזומן' }, // Payment method for deposit
    eventPayment: { type: Number, default: 0 }, // Payment at the event day
    eventPaymentMethod: { type: String, default: 'מזומן' }, // Payment method for event payment
    income: { type: Number, default: 0 }, // Total income (actualDeposit + eventPayment)
    completedAt: { type: Date, default: null }, // When event was marked as completed
    // Calendar fields
    calendarSet: { type: Boolean, default: false }, // Whether event was added to calendar
    calendarStartTime: { type: String, default: '' }, // Event start time (HH:MM format)
    calendarDuration: { type: Number, default: 3 }, // Service duration in hours
    calendarEscortTime: { type: String, default: '' }, // Escort start time (HH:MM format)
    calendarEscortDuration: { type: Number, default: 4 }, // Escort duration in hours
    calendarLocation: { type: String, default: '' }, // Event location
    calendarNotes: { type: String, default: '' }, // Calendar notes
    contractStatus: { type: String, default: 'pending' }, // pending, sent, signed
    // Contract-related fields
    escortType: { type: String, default: 'none' }, // none, short, long
    escortPrice: { type: Number, default: 0 },
    bridesmaids: [{ 
        service: String,
        price: Number
    }],
    contractFileUrl: { type: String, default: '' },
    // Digital signature fields
    customerSignature: { type: String, default: '' }, // Base64 image of signature
    customerSignedAt: { type: Date, default: null },
    signedContractUrl: { type: String, default: '' }, // Final signed PDF
    reminders: [{ 
        id: Number,
        date: String,
        time: String,
        note: String,
        completed: Boolean,
        createdAt: String
    }],
    stageHistory: [{
        stage: String,
        timestamp: String,
        note: String
    }],
    calendarEventId: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const goalsSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.Mixed, required: false }, // Support both ObjectId and String, optional for backward compatibility
    year: { type: Number, required: true },
    income: { type: Number, default: 0 },
    brides: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now }
});

// Contract Template Schema - stores the custom HTML template
const contractTemplateSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.Mixed, required: false }, // Support both ObjectId and String, optional for backward compatibility
    templateHTML: { type: String, required: true },
    logoUrl: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Client = mongoose.model('Client', clientSchema);
const Lead = mongoose.model('Lead', leadSchema);
const Goals = mongoose.model('Goals', goalsSchema);
const ContractTemplate = mongoose.model('ContractTemplate', contractTemplateSchema);

// ==================== FILE UPLOAD SETUP ====================
// Setup multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (err) {
            cb(err);
        }
    },
    filename: (req, file, cb) => {
        // Save contract template with a fixed name
        const ext = path.extname(file.originalname);
        cb(null, `contract-template${ext}`);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Only accept .docx files
        if (path.extname(file.originalname).toLowerCase() === '.docx') {
            cb(null, true);
        } else {
            cb(new Error('רק קבצי .docx מותרים'));
        }
    }
});

// ==================== AUTHENTICATION SETUP ====================
// Setup authentication system (if credentials are configured)
console.log('🔍 Checking OAuth credentials...');
console.log('   GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET (' + process.env.GOOGLE_CLIENT_ID.substring(0, 20) + '...)' : 'MISSING');
console.log('   GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET (length: ' + process.env.GOOGLE_CLIENT_SECRET.length + ')' : 'MISSING');

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    console.log('🔐 Initializing authentication system...');
    setupAuth(app, mongoose, User);
    setupAuthRoutes(app);
    console.log('✅ Authentication enabled - Multi-user mode');
} else {
    console.warn('⚠️  Authentication disabled - Running in FALLBACK mode');
    console.warn('   Using default user for all requests');
    console.warn('   Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Railway Variables to enable auth');
    
    // Fallback routes for when OAuth is not configured
    app.get('/login', (req, res) => {
        res.redirect('/'); // Just redirect to main page in fallback mode
    });
    
    app.get('/auth/google', (req, res) => {
        res.redirect('/'); // Redirect to main page
    });
    
    app.get('/auth/google/callback', (req, res) => {
        res.redirect('/');
    });
    
    app.post('/logout', (req, res) => {
        res.redirect('/');
    });
    
    app.get('/logout', (req, res) => {
        res.redirect('/');
    });
    
    // Ensure default user exists in DB for fallback mode
    (async () => {
        try {
            let defaultUser = await User.findOne({ email: 'default@ayamakeup.com' });
            if (!defaultUser) {
                defaultUser = await User.create({
                    googleId: 'default-google-id',
                    email: 'default@ayamakeup.com',
                    name: 'Default User',
                    picture: ''
                });
                console.log('✅ Created default user for fallback mode');
            }
        } catch (err) {
            console.log('⚠️  Default user setup:', err.message);
        }
    })();
}

// ==================== STATIC FILES ====================
// Serve generated contracts
app.use('/contracts', express.static(path.join(__dirname, 'contracts')));

// Serve index.html for root path (no authentication required - will check in frontend)
app.get('/', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve static files from public directory (CSS, JS, images) - AFTER protected routes
app.use(express.static(path.join(__dirname, 'public'), {
    index: false // Don't serve index.html automatically
}));

// Serve contract signing page
app.get('/contract-sign/:leadId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contract-sign.html'));
});

// ==================== API ROUTES ====================

// Get current user info - NO AUTH REQUIRED for fallback mode
app.get('/api/user', (req, res) => {
    const userAgent = req.get('user-agent');
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
    
    console.log('🔍 /api/user called');
    console.log('   Device:', isMobile ? 'MOBILE' : 'DESKTOP');
    console.log('   Has Session:', !!req.session);
    console.log('   Session ID:', req.sessionID);
    console.log('   Has Cookie:', !!req.headers.cookie);
    console.log('   Cookie:', req.headers.cookie?.substring(0, 100));
    console.log('   isAuthenticated():', req.isAuthenticated ? req.isAuthenticated() : 'N/A');
    console.log('   Has User:', !!req.user);
    
    // Check if in fallback mode (no Google credentials)
    const isFallbackMode = !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET;
    
    if (isFallbackMode) {
        console.log('   ⚠️ Running in FALLBACK mode');
        // Return fallback mode - allow access without login
        return res.json({
            user: null,
            isAuthenticated: false,
            isFallbackMode: true
        });
    }
    
    // If Google auth is configured, check if user is authenticated
    if (req.isAuthenticated && req.isAuthenticated()) {
        console.log('   ✅ User authenticated:', req.user.email);
        return res.json({
            user: {
                _id: req.user._id,
                email: req.user.email,
                name: req.user.name,
                picture: req.user.picture || ''
            },
            isAuthenticated: true,
            isFallbackMode: false
        });
    }
    
    // Not authenticated and not in fallback mode
    console.log('   ❌ User NOT authenticated');
    res.json({
        user: null,
        isAuthenticated: false,
        isFallbackMode: false
    });
});

// Debug endpoint - test auth
app.get('/api/debug/user', requireAuth, (req, res) => {
    res.json({ 
        user: req.user,
        isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false
    });
});

// Debug endpoint - check OAuth config
app.get('/api/debug/config', (req, res) => {
    res.json({
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        hasMongoDB: !!process.env.MONGODB_URI,
        hasSessionSecret: !!process.env.SESSION_SECRET,
        nodeEnv: process.env.NODE_ENV,
        callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'not set'
    });
});

// 🔍 NEW: Comprehensive session & cookie debugging endpoint
app.get('/api/debug/session', (req, res) => {
    const userAgent = req.get('user-agent');
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
    
    const debugData = {
        timestamp: new Date().toISOString(),
        device: isMobile ? 'MOBILE' : 'DESKTOP',
        userAgent: userAgent,
        
        // Request Info
        request: {
            protocol: req.protocol,
            secure: req.secure,
            host: req.get('host'),
            origin: req.get('origin') || 'None',
            referer: req.get('referer') || 'None',
            ip: req.ip || req.connection.remoteAddress
        },
        
        // Session Info
        session: {
            exists: !!req.session,
            sessionID: req.sessionID || 'None',
            cookie: req.session ? {
                maxAge: req.session.cookie.maxAge,
                expires: req.session.cookie.expires,
                httpOnly: req.session.cookie.httpOnly,
                secure: req.session.cookie.secure,
                sameSite: req.session.cookie.sameSite,
                domain: req.session.cookie.domain || 'undefined',
                path: req.session.cookie.path
            } : 'No session'
        },
        
        // Cookie Headers
        cookies: {
            hasCookieHeader: !!req.headers.cookie,
            rawCookieHeader: req.headers.cookie || 'None',
            hasSessionCookie: req.headers.cookie?.includes('connect.sid') || false,
            parsedCookies: req.headers.cookie ? 
                req.headers.cookie.split(';').map(c => c.trim().split('=')[0]) : []
        },
        
        // Authentication Status
        auth: {
            hasAuthMethod: !!req.isAuthenticated,
            isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
            hasUser: !!req.user,
            userId: req.user?._id?.toString() || 'None',
            userEmail: req.user?.email || 'None'
        },
        
        // Environment Check
        environment: {
            nodeEnv: process.env.NODE_ENV || 'development',
            hasGoogleAuth: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
            isFallbackMode: !(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
        },
        
        // Cookie Configuration Analysis
        analysis: {
            cookieSecureOK: req.session ? 
                (req.protocol === 'https' ? req.session.cookie.secure : true) : 'No session',
            cookieSameSiteOK: req.session ? 
                (req.session.cookie.sameSite === 'lax' || req.session.cookie.sameSite === 'none') : 'No session',
            httpsEnabled: req.protocol === 'https',
            issues: []
        }
    };
    
    // Analyze potential issues
    if (req.session) {
        if (req.protocol === 'https' && !req.session.cookie.secure) {
            debugData.analysis.issues.push('❌ HTTPS enabled but cookie.secure=false');
        }
        if (req.session.cookie.sameSite === 'none' && !req.session.cookie.secure) {
            debugData.analysis.issues.push('❌ sameSite=none requires secure=true');
        }
        if (!req.headers.cookie && req.sessionID) {
            debugData.analysis.issues.push('⚠️ Session exists but no cookie header in request');
        }
        if (req.headers.cookie && !req.headers.cookie.includes('connect.sid')) {
            debugData.analysis.issues.push('⚠️ Cookie header exists but no session cookie');
        }
        if (req.session && !req.isAuthenticated()) {
            debugData.analysis.issues.push('⚠️ Session exists but user not authenticated');
        }
    }
    
    if (debugData.analysis.issues.length === 0) {
        debugData.analysis.issues.push('✅ No issues detected');
    }
    
    // Log to console for Railway logs
    console.log('\n' + '='.repeat(80));
    console.log('🔍 SESSION DEBUG REQUEST');
    console.log('='.repeat(80));
    console.log('Device:', debugData.device);
    console.log('Protocol:', debugData.request.protocol);
    console.log('Secure:', debugData.request.secure);
    console.log('Session ID:', debugData.session.sessionID);
    console.log('Has Cookie:', debugData.cookies.hasCookieHeader);
    console.log('Authenticated:', debugData.auth.isAuthenticated);
    console.log('Issues:', debugData.analysis.issues);
    console.log('='.repeat(80) + '\n');
    
    res.json(debugData);
});

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'CRM API is running', 
        database: 'MongoDB Atlas',
        databaseName: mongoose.connection.name,
        connected: mongoose.connection.readyState === 1
    });
});

// ==================== CLIENTS/INCOME ROUTES ====================

// Get all clients
app.get('/api/clients', requireAuth, async (req, res) => {
    try {
        const userId = req.user._id;
        let query = {};
        
        // In fallback mode (default-user-id), query all data for backward compatibility
        if (userId !== 'default-user-id') {
            query = { 
                $or: [
                    { userId: userId },
                    { userId: userId.toString() }
                ]
            };
        }
        
        const clients = await Client.find(query).sort({ date: -1 });
        res.json(clients);
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single client
app.get('/api/clients/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.user._id;
        const client = await Client.findOne({ _id: req.params.id, userId });
        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }
        res.json(client);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new client
app.post('/api/clients', requireAuth, async (req, res) => {
    try {
        const userId = req.user._id;
        const client = new Client({
            ...req.body,
            userId
        });
        await client.save();
        res.status(201).json(client);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update client
app.put('/api/clients/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.user._id;
        const client = await Client.findOneAndUpdate(
            { _id: req.params.id, userId },
            req.body,
            { new: true, runValidators: true }
        );
        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }
        res.json(client);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Bulk delete clients (must be before the :id route)
app.post('/api/clients/bulk-delete', requireAuth, async (req, res) => {
    try {
        const userId = req.user._id;
        const { ids } = req.body;
        
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Invalid ids array' });
        }
        
        const result = await Client.deleteMany({ 
            _id: { $in: ids }, 
            userId 
        });
        
        res.json({ 
            success: true, 
            message: `${result.deletedCount} clients deleted successfully`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete client
app.delete('/api/clients/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.user._id;
        const client = await Client.findOneAndDelete({ _id: req.params.id, userId });
        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }
        res.json({ message: 'Client deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== LEADS ROUTES ====================

// Get all leads
app.get('/api/leads', requireAuth, async (req, res) => {
    try {
        const userId = req.user._id;
        let query = {};
        
        // In fallback mode (default-user-id), query all data for backward compatibility
        if (userId !== 'default-user-id') {
            query = { 
                $or: [
                    { userId: userId },
                    { userId: userId.toString() }
                ]
            };
        }
        
        const leads = await Lead.find(query).sort({ contactDate: -1 });
        res.json(leads);
    } catch (error) {
        console.error('Error fetching leads:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single lead
app.get('/api/leads/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.user._id;
        const lead = await Lead.findOne({ _id: req.params.id, userId });
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        res.json(lead);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new lead
app.post('/api/leads', requireAuth, async (req, res) => {
    try {
        const userId = req.user._id;
        const lead = new Lead({
            ...req.body,
            userId
        });
        await lead.save();
        res.status(201).json(lead);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update lead
app.put('/api/leads/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.user._id;
        console.log('🔍 PUT /api/leads/:id - Received:', {
            leadId: req.params.id,
            userId: userId.toString(),
            bodyKeys: Object.keys(req.body),
            hasProposedPrice: 'proposedPrice' in req.body,
            proposedPrice: req.body.proposedPrice
        });
        
        const lead = await Lead.findOneAndUpdate(
            { _id: req.params.id, userId },
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!lead) {
            console.error('❌ Lead not found:', {
                searchId: req.params.id,
                userId: userId.toString()
            });
            
            // Check if lead exists at all
            const leadExists = await Lead.findById(req.params.id);
            if (leadExists) {
                console.error('⚠️ Lead exists but belongs to different user:', {
                    leadUserId: leadExists.userId.toString(),
                    requestUserId: userId.toString()
                });
            } else {
                console.error('⚠️ Lead does not exist in database');
            }
            
            return res.status(404).json({ error: 'Lead not found' });
        }
        
        console.log('✅ Lead updated successfully:', {
            leadId: lead._id.toString(),
            proposedPrice: lead.proposedPrice
        });
        
        res.json(lead);
    } catch (error) {
        console.error('❌ Error updating lead:', error);
        res.status(400).json({ error: error.message });
    }
});

// Update lead status (PATCH)
app.patch('/api/leads/:id/status', async (req, res) => {
    try {
        const lead = await Lead.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status, updatedAt: new Date() },
            { new: true }
        );
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        res.json(lead);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete lead
app.delete('/api/leads/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.user._id;
        const leadId = req.params.id;
        console.log('🗑️ DELETE request for lead:', leadId, 'by user:', userId);
        
        const lead = await Lead.findOneAndDelete({ _id: leadId, userId });
        if (!lead) {
            console.warn('⚠️ Lead not found:', leadId);
            return res.status(404).json({ error: 'Lead not found' });
        }
        
        console.log('✅ Lead deleted successfully:', leadId);
        res.json({ message: 'Lead deleted successfully', id: leadId });
    } catch (error) {
        console.error('❌ Delete error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Convert lead to client
app.post('/api/leads/:id/convert', async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        const client = new Client({
            name: lead.name,
            phone: lead.phone,
            service: lead.service,
            price: req.body.price,
            date: req.body.date || new Date(),
            notes: lead.notes
        });

        await client.save();
        await Lead.findByIdAndDelete(req.params.id);

        res.json({ message: 'Lead converted to client successfully', client });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== STATISTICS ROUTES ====================

// Get statistics
app.get('/api/stats', requireAuth, async (req, res) => {
    try {
        const userId = req.user._id;
        const clients = await Client.find({ userId });
        const leads = await Lead.find({ userId });

        const totalIncome = clients.reduce((sum, client) => sum + (client.price || 0), 0);
        const totalClients = clients.length;
        const totalLeads = leads.length;

        // Calculate monthly income
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlyClients = clients.filter(c => c.date >= startOfMonth);
        const monthlyIncome = monthlyClients.reduce((sum, c) => sum + (c.price || 0), 0);

        res.json({
            totalIncome,
            monthlyIncome,
            totalClients,
            totalLeads,
            monthlyClients: monthlyClients.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get monthly stats
app.get('/api/stats/monthly', requireAuth, async (req, res) => {
    try {
        const userId = req.user._id;
        const clients = await Client.find({ userId });
        
        const monthlyStats = {};
        clients.forEach(client => {
            const date = new Date(client.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyStats[key]) {
                monthlyStats[key] = { count: 0, income: 0 };
            }
            monthlyStats[key].count++;
            monthlyStats[key].income += client.price || 0;
        });

        res.json(monthlyStats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== MIGRATION ROUTE ====================

// Migration endpoint to import data
app.post('/api/migrate', async (req, res) => {
    try {
        const { clients, leads } = req.body;

        if (clients && Array.isArray(clients)) {
            await Client.insertMany(clients);
        }

        if (leads && Array.isArray(leads)) {
            await Lead.insertMany(leads);
        }

        res.json({ 
            message: 'Migration successful',
            clientsImported: clients ? clients.length : 0,
            leadsImported: leads ? leads.length : 0
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// ==================== MAINTENANCE ROUTES ====================

// Fix MongoDB indexes - drop the problematic id_1 index
app.post('/api/fix-indexes', async (req, res) => {
    try {
        // Drop the id_1 index if it exists
        await Client.collection.dropIndex('id_1').catch(() => {
            // Index might not exist, that's okay
        });
        res.json({ message: 'Indexes fixed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== GOALS ROUTES ====================

// Get current year goals
app.get('/api/goals', requireAuth, async (req, res) => {
    try {
        const userId = req.user._id;
        const currentYear = new Date().getFullYear();
        let query = { year: currentYear };
        
        // In fallback mode (default-user-id), query all data for backward compatibility
        if (userId !== 'default-user-id') {
            query = { 
                $or: [
                    { userId: userId },
                    { userId: userId.toString() }
                ],
                year: currentYear 
            };
        }
        
        let goals = await Goals.findOne(query);
        
        if (!goals) {
            // Create default goals if not exists
            goals = await Goals.create({
                userId,
                year: currentYear,
                income: 0,
                brides: 0
            });
        }
        
        res.json(goals);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update goals
app.put('/api/goals', requireAuth, async (req, res) => {
    try {
        const userId = req.user._id;
        const currentYear = new Date().getFullYear();
        const { income, brides } = req.body;
        
        let goals = await Goals.findOne({ userId, year: currentYear });
        
        if (goals) {
            goals.income = income;
            goals.brides = brides;
            goals.updatedAt = new Date();
            await goals.save();
        } else {
            goals = await Goals.create({
                userId,
                year: currentYear,
                income,
                brides
            });
        }
        
        res.json(goals);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== CONTRACT ENDPOINTS ====================

// Get contract template HTML from database
app.get('/api/contract-template-html', requireAuth, async (req, res) => {
    try {
        const userId = req.user._id;
        let template = await ContractTemplate.findOne({ userId });
        
        if (!template) {
            // Create default template if doesn't exist
            const defaultTemplate = `<div style="text-align: center; margin-bottom: 30px;">
    {{#if logoUrl}}
    <img src="{{logoUrl}}" alt="לוגו" style="max-width: 200px; margin-bottom: 20px;">
    {{/if}}
    <h1 style="font-size: 28px; margin-bottom: 10px;">חוזה מתן שירותי איפור ושיער</h1>
    <p>תאריך: {{date}}</p>
</div>

<div style="margin-bottom: 25px;">
    <h2 style="font-size: 18px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">פרטי הצדדים</h2>
    <p><strong>בין:</strong> {{businessName}} (להלן: "נותן השירות")</p>
    <p><strong>לבין:</strong> {{fullName}} (להלן: "הלקוח/ה")</p>
    <p><strong>טלפון:</strong> {{phone}}</p>
</div>

<div style="margin-bottom: 25px;">
    <h2 style="font-size: 18px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">פרטי האירוע</h2>
    <p><strong>סוג האירוע:</strong> {{service}}</p>
    <p><strong>תאריך האירוע:</strong> {{eventDate}}</p>
    <p><strong>מיקום ההתארגנות:</strong> {{location}}</p>
</div>

<div style="margin-bottom: 25px;">
    <h2 style="font-size: 18px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">פירוט השירותים והעלויות</h2>
    {{servicesTable}}
    
    <div style="background-color: #f9f9f9; padding: 20px; border: 2px solid #333; margin-top: 20px;">
        <p style="display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding: 8px 0;">
            <span>סה"כ עלות השירותים:</span>
            <strong>{{totalPrice}} ₪</strong>
        </p>
        <p style="display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding: 8px 0;">
            <span>מקדמה ששולמה:</span>
            <strong>{{deposit}} ₪</strong>
        </p>
        <p style="display: flex; justify-content: space-between; padding: 15px 0 0 0; font-size: 16px;">
            <span>יתרה לתשלום ביום האירוע:</span>
            <strong>{{balance}} ₪</strong>
        </p>
    </div>
</div>

<div style="margin-bottom: 25px;">
    <h2 style="font-size: 18px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">תנאי תשלום</h2>
    <ol>
        <li>המקדמה שולמה במלואה ואינה ניתנת להחזר.</li>
        <li>היתרה תשולם במזומן או בהעברה בנקאית ביום האירוע.</li>
        <li>תשלום היתרה יבוצע לפני תחילת מתן השירותים.</li>
    </ol>
</div>

<div style="margin-bottom: 25px;">
    <h2 style="font-size: 18px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">ביטול ושינויים</h2>
    <ol>
        <li>ביטול עד 30 יום לפני האירוע - זיכוי מלא בניכוי המקדמה.</li>
        <li>ביטול בין 30-14 יום לפני האירוע - זיכוי של 50% בלבד.</li>
        <li>ביטול פחות מ-14 יום לפני האירוע - ללא זיכוי.</li>
    </ol>
</div>

<div style="margin-top: 60px; display: flex; justify-content: space-between;">
    <div style="text-align: center; width: 40%;">
        <p>חתימת הלקוחה</p>
        <div style="margin-top: 40px; border-top: 1px solid #333; padding-top: 5px;">תאריך: ___________</div>
    </div>
    <div style="text-align: center; width: 40%;">
        <p>חתימת נותן השירות</p>
        <div style="margin-top: 40px; border-top: 1px solid #333; padding-top: 5px;">תאריך: ___________</div>
    </div>
</div>

<p style="margin-top: 40px; text-align: center; font-size: 12px; color: #666;">
    הערה: חוזה זה נערך בשתי העתקים, כשכל צד קיבל את העתקו.
</p>`;

            template = await ContractTemplate.create({
                userId,
                templateHTML: defaultTemplate,
                logoUrl: ''
            });
        }
        
        res.json(template);
    } catch (error) {
        console.error('Error fetching template:', error);
        res.status(500).json({ error: error.message });
    }
});

// Save contract template HTML
app.post('/api/contract-template-html', requireAuth, async (req, res) => {
    try {
        const userId = req.user._id;
        const { templateHTML } = req.body;
        
        let template = await ContractTemplate.findOne({ userId });
        
        if (template) {
            template.templateHTML = templateHTML;
            template.updatedAt = new Date();
            await template.save();
        } else {
            template = await ContractTemplate.create({
                userId,
                templateHTML,
                logoUrl: ''
            });
        }
        
        res.json({ success: true, template });
    } catch (error) {
        console.error('Error saving template:', error);
        res.status(500).json({ error: error.message });
    }
});

// Upload logo
app.post('/api/upload-logo', requireAuth, upload.single('logo'), async (req, res) => {
    try {
        const userId = req.user._id;
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const logoUrl = `/uploads/${req.file.filename}`;
        
        let template = await ContractTemplate.findOne({ userId });
        
        if (template) {
            template.logoUrl = logoUrl;
            template.updatedAt = new Date();
            await template.save();
        } else {
            template = await ContractTemplate.create({
                userId,
                templateHTML: '',
                logoUrl
            });
        }
        
        res.json({ success: true, logoUrl });
    } catch (error) {
        console.error('Error uploading logo:', error);
        res.status(500).json({ error: error.message });
    }
});

// Upload contract template
app.post('/api/contract-template', requireAuth, upload.single('template'), async (req, res) => {
    try {
        console.log('📄 Contract template upload request received');
        console.log('File:', req.file);
        
        if (!req.file) {
            console.error('❌ No file in request');
            return res.status(400).json({ error: 'לא נבחר קובץ. יש לבחור קובץ .docx' });
        }
        
        console.log('✅ Template uploaded successfully:', req.file.filename);
        res.json({ 
            success: true, 
            message: 'תבנית החוזה הועלתה בהצלחה! ✅',
            filename: req.file.filename 
        });
    } catch (error) {
        console.error('❌ Error uploading template:', error);
        res.status(500).json({ error: 'שגיאה בהעלאת התבנית: ' + error.message });
    }
});

// Preview contract HTML (for debugging) - GET endpoint
app.get('/api/preview-contract/:leadId', async (req, res) => {
    try {
        console.log('👁️ Previewing contract HTML for lead:', req.params.leadId);
        
        const lead = await Lead.findById(req.params.leadId);
        if (!lead) {
            return res.status(404).send('<h1 style="color:red;text-align:center;margin-top:50px;">ליד לא נמצא</h1>');
        }

        // Prepare data (same as PDF generation)
        const fullName = `${lead.name} ${lead.lastName || ''}`.trim();
        const price = lead.proposedPrice || 0;
        const deposit = lead.proposedDeposit || 0;
        
        console.log('💵 Contract View - Lead data:', {
            leadId: lead._id,
            proposedPrice: lead.proposedPrice,
            proposedDeposit: lead.proposedDeposit,
            price: price,
            deposit: deposit
        });
        
        let totalPrice = price;
        
        if (lead.escortType && lead.escortType !== 'none' && lead.escortPrice) {
            totalPrice += lead.escortPrice;
        }
        
        if (lead.bridesmaids && lead.bridesmaids.length > 0) {
            const bridesmaidsTotal = lead.bridesmaids.reduce((sum, b) => sum + (b.price || 0), 0);
            totalPrice += bridesmaidsTotal;
        }
        
        const balance = totalPrice - deposit;
        
        console.log('💰 Contract View - Calculated values:', {
            totalPrice: totalPrice,
            deposit: deposit,
            balance: balance
        });
        
        const escortTypeHebrew = {
            'none': 'ללא ליווי',
            'short': 'ליווי קצר',
            'long': 'ליווי ארוך'
        };
        
        // Build bridesmaids rows HTML
        let bridesmaidsRowsHtml = '';
        if (lead.bridesmaids && lead.bridesmaids.length > 0) {
            bridesmaidsRowsHtml = lead.bridesmaids.map((bridesmaid, i) => `
                        <tr>
                            <td>מלווה ${i + 1}</td>
                            <td>${bridesmaid.service || 'שירות מלווה'}</td>
                            <td>${(bridesmaid.price || 0).toLocaleString('he-IL')}</td>
                        </tr>`).join('');
        }
        
        // Load custom template from database
        let customTemplate = await ContractTemplate.findOne({ userId: 'default' });
        
        // Build services table HTML (same as in generate-contract)
        const servicesTableHTML = `
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                    <tr style="background-color: #f5f5f5;">
                        <th style="border: 1px solid #333; padding: 12px; text-align: center; font-weight: bold;">תיאור השירות</th>
                        <th style="border: 1px solid #333; padding: 12px; text-align: center; font-weight: bold;">פרטים</th>
                        <th style="border: 1px solid #333; padding: 12px; text-align: center; font-weight: bold;">מחיר (₪)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="border: 1px solid #333; padding: 10px; text-align: right;">${lead.service || 'שירות עיקרי'}</td>
                        <td style="border: 1px solid #333; padding: 10px; text-align: center;">שירות עיקרי</td>
                        <td style="border: 1px solid #333; padding: 10px; text-align: center;">${price.toLocaleString('he-IL')}</td>
                    </tr>
                    ${lead.escortType && lead.escortType !== 'none' ? `
                    <tr>
                        <td style="border: 1px solid #333; padding: 10px; text-align: right;">ליווי לאירוע</td>
                        <td style="border: 1px solid #333; padding: 10px; text-align: center;">${escortTypeHebrew[lead.escortType]}</td>
                        <td style="border: 1px solid #333; padding: 10px; text-align: center;">${(lead.escortPrice || 0).toLocaleString('he-IL')}</td>
                    </tr>
                    ` : ''}
                    ${bridesmaidsRowsHtml}
                </tbody>
            </table>
        `;
        
        // Use custom template or default
        let htmlContent = customTemplate?.templateHTML || '';
        
        // Apply variable replacements
        const replacements = {
            '{{fullName}}': fullName,
            '{{phone}}': lead.phone || 'לא הוזן',
            '{{service}}': lead.service || 'לא הוזן',
            '{{eventDate}}': lead.eventDate || 'לא הוזן',
            '{{location}}': lead.location || 'לא הוזן',
            '{{proposedPrice}}': (lead.proposedPrice || 0).toLocaleString('he-IL'),
            '{{totalPrice}}': totalPrice.toLocaleString('he-IL'),
            '{{price}}': price.toLocaleString('he-IL'),
            '{{deposit}}': deposit.toLocaleString('he-IL'),
            '{{balance}}': balance.toLocaleString('he-IL'),
            '{{date}}': getIsraelDate(),
            '{{servicesTable}}': servicesTableHTML,
            '{{logoUrl}}': customTemplate?.logoUrl || ''
        };
        
        for (const [key, value] of Object.entries(replacements)) {
            const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            htmlContent = htmlContent.replace(regex, value || '');
        }
        
        // Handle conditional logo
        if (customTemplate?.logoUrl) {
            htmlContent = htmlContent.replace(/\{\{#if logoUrl\}\}/g, '');
            htmlContent = htmlContent.replace(/\{\{\/if\}\}/g, '');
        } else {
            htmlContent = htmlContent.replace(/\{\{#if logoUrl\}\}[\s\S]*?\{\{\/if\}\}/g, '');
        }

        // Build final HTML with preview notice and debug info
        const finalHTML = `
        <!DOCTYPE html>
        <html dir="rtl" lang="he">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>תצוגה מקדימה - חוזה</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    direction: rtl; 
                    padding: 40px;
                    line-height: 1.8;
                    font-size: 14px;
                    max-width: 800px;
                    margin: 0 auto;
                }
                .preview-notice {
                    background: #fff3cd;
                    border: 2px solid #ffc107;
                    padding: 15px;
                    margin-bottom: 30px;
                    border-radius: 5px;
                    text-align: center;
                    font-weight: bold;
                }
                .debug-info {
                    background: #e3f2fd;
                    border: 1px solid #2196f3;
                    padding: 15px;
                    margin-top: 30px;
                    border-radius: 5px;
                    font-size: 12px;
                }
                .debug-info h3 {
                    margin-top: 0;
                    color: #1976d2;
                }
            </style>
        </head>
        <body>
            <div class="preview-notice">
                🔍 תצוגה מקדימה - זה לא ה-PDF הסופי, רק בדיקת נתונים
            </div>
            
            ${htmlContent}
            
            <div class="debug-info">
                <h3>🔧 מידע לבדיקה (לא יופיע ב-PDF)</h3>
                <div><strong>Lead ID:</strong> ${lead._id}</div>
                <div><strong>שם:</strong> ${lead.name}</div>
                <div><strong>שם משפחה:</strong> ${lead.lastName || 'לא הוזן'}</div>
                <div><strong>סוג ליווי:</strong> ${lead.escortType || 'none'}</div>
                <div><strong>מחיר ליווי:</strong> ${lead.escortPrice || 0} ₪</div>
                <div><strong>מספר מלוות:</strong> ${lead.bridesmaids?.length || 0}</div>
                <div><strong>מחיר עיקרי:</strong> ${price} ₪</div>
                <div><strong>מקדמה:</strong> ${deposit} ₪</div>
                <div><strong>סה"כ כולל הכל:</strong> ${totalPrice} ₪</div>
                <div><strong>יתרה:</strong> ${balance} ₪</div>
            </div>
        </body>
        </html>
        `;

        res.send(finalHTML);
    } catch (error) {
        console.error('❌ Error previewing contract:', error);
        res.status(500).send(`<h1 style="color:red;text-align:center;margin-top:50px;">שגיאה בתצוגה מקדימה</h1><pre style="direction:ltr;text-align:left;padding:20px;background:#f5f5f5;">${error.stack}</pre>`);
    }
});

// ==================== CONTRACT SIGNING ====================
// Get contract for signing (returns HTML)
app.get('/api/contract-view/:leadId', async (req, res) => {
    try {
        console.log('👁️ Loading contract for signing:', req.params.leadId);
        
        const lead = await Lead.findById(req.params.leadId);
        if (!lead) {
            return res.status(404).json({ error: 'ליד לא נמצא' });
        }

        // Load custom template using the lead's userId
        const customTemplate = await ContractTemplate.findOne({ userId: lead.userId });
        if (!customTemplate) {
            return res.status(404).json({ error: 'לא נמצאה תבנית חוזה' });
        }

        // Prepare contract data (same as preview)
        const fullName = `${lead.name} ${lead.lastName || ''}`.trim();
        const price = lead.proposedPrice || 0;
        const deposit = lead.proposedDeposit || 0;
        
        let totalPrice = price;
        if (lead.escortType && lead.escortType !== 'none' && lead.escortPrice) {
            totalPrice += lead.escortPrice;
        }
        if (lead.bridesmaids && lead.bridesmaids.length > 0) {
            const bridesmaidsTotal = lead.bridesmaids.reduce((sum, b) => sum + (b.price || 0), 0);
            totalPrice += bridesmaidsTotal;
        }
        
        const balance = totalPrice - deposit;
        
        const escortTypeHebrew = {
            'none': 'ללא ליווי',
            'short': 'ליווי קצר',
            'long': 'ליווי ארוך'
        };

        // Build services table
        let bridesmaidsRowsHtml = '';
        if (lead.bridesmaids && lead.bridesmaids.length > 0) {
            bridesmaidsRowsHtml = lead.bridesmaids.map((bridesmaid, i) => `
                <tr>
                    <td style="border: 1px solid #333; padding: 10px; text-align: right;">מלווה ${i + 1}</td>
                    <td style="border: 1px solid #333; padding: 10px; text-align: center;">${bridesmaid.service || 'שירות מלווה'}</td>
                    <td style="border: 1px solid #333; padding: 10px; text-align: center;">${(bridesmaid.price || 0).toLocaleString('he-IL')}</td>
                </tr>`).join('');
        }

        const servicesTableHTML = `
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                    <tr style="background-color: #f5f5f5;">
                        <th style="border: 1px solid #333; padding: 12px; text-align: center; font-weight: bold;">תיאור השירות</th>
                        <th style="border: 1px solid #333; padding: 12px; text-align: center; font-weight: bold;">פרטים</th>
                        <th style="border: 1px solid #333; padding: 12px; text-align: center; font-weight: bold;">מחיר (₪)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="border: 1px solid #333; padding: 10px; text-align: right;">${lead.service || 'שירות עיקרי'}</td>
                        <td style="border: 1px solid #333; padding: 10px; text-align: center;">שירות עיקרי</td>
                        <td style="border: 1px solid #333; padding: 10px; text-align: center;">${price.toLocaleString('he-IL')}</td>
                    </tr>
                    ${lead.escortType && lead.escortType !== 'none' ? `
                    <tr>
                        <td style="border: 1px solid #333; padding: 10px; text-align: right;">ליווי לאירוע</td>
                        <td style="border: 1px solid #333; padding: 10px; text-align: center;">${escortTypeHebrew[lead.escortType]}</td>
                        <td style="border: 1px solid #333; padding: 10px; text-align: center;">${(lead.escortPrice || 0).toLocaleString('he-IL')}</td>
                    </tr>
                    ` : ''}
                    ${bridesmaidsRowsHtml}
                </tbody>
            </table>
        `;

        // Replace variables in template
        let htmlContent = customTemplate.templateHTML || '';
        
        const replacements = {
            '{{fullName}}': fullName,
            '{{phone}}': lead.phone || 'לא הוזן',
            '{{service}}': lead.service || 'לא הוזן',
            '{{eventDate}}': lead.eventDate || 'לא הוזן',
            '{{location}}': lead.location || 'לא הוזן',
            '{{proposedPrice}}': (lead.proposedPrice || 0).toLocaleString('he-IL'),
            '{{totalPrice}}': totalPrice.toLocaleString('he-IL'),
            '{{price}}': price.toLocaleString('he-IL'),
            '{{deposit}}': deposit.toLocaleString('he-IL'),
            '{{balance}}': balance.toLocaleString('he-IL'),
            '{{date}}': getIsraelDate(),
            '{{servicesTable}}': servicesTableHTML,
            '{{logoUrl}}': customTemplate?.logoUrl || ''
        };
        
        for (const [key, value] of Object.entries(replacements)) {
            const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            htmlContent = htmlContent.replace(regex, value || '');
        }
        
        // Handle conditional logo
        if (customTemplate?.logoUrl) {
            htmlContent = htmlContent.replace(/\{\{#if logoUrl\}\}/g, '');
            htmlContent = htmlContent.replace(/\{\{\/if\}\}/g, '');
        } else {
            htmlContent = htmlContent.replace(/\{\{#if logoUrl\}\}[\s\S]*?\{\{\/if\}\}/g, '');
        }

        res.json({
            success: true,
            htmlContent: htmlContent,
            lead: {
                name: fullName,
                phone: lead.phone
            }
        });
    } catch (error) {
        console.error('❌ Error loading contract for signing:', error);
        res.status(500).json({ error: error.message });
    }
});

// Save signature and generate signed PDF
app.post('/api/sign-contract/:leadId', async (req, res) => {
    try {
        console.log('✍️ Saving signature for lead:', req.params.leadId);
        
        const { signature } = req.body;
        
        if (!signature) {
            return res.status(400).json({ error: 'חתימה לא התקבלה' });
        }

        const lead = await Lead.findById(req.params.leadId);
        if (!lead) {
            return res.status(404).json({ error: 'ליד לא נמצא' });
        }

        // Save signature to lead
        lead.customerSignature = signature;
        lead.customerSignedAt = new Date();
        lead.contractStatus = 'signed';

        console.log('📄 Generating signed PDF with signature...');

        // Load custom template
        const customTemplate = await ContractTemplate.findOne({ userId: 'default' });
        if (!customTemplate) {
            return res.status(404).json({ error: 'לא נמצאה תבנית חוזה' });
        }

        // Prepare contract data
        const fullName = `${lead.name} ${lead.lastName || ''}`.trim();
        const price = lead.proposedPrice || 0;
        const deposit = lead.proposedDeposit || 0;
        
        let totalPrice = price;
        if (lead.escortType && lead.escortType !== 'none' && lead.escortPrice) {
            totalPrice += lead.escortPrice;
        }
        if (lead.bridesmaids && lead.bridesmaids.length > 0) {
            const bridesmaidsTotal = lead.bridesmaids.reduce((sum, b) => sum + (b.price || 0), 0);
            totalPrice += bridesmaidsTotal;
        }
        
        const balance = totalPrice - deposit;
        
        const escortTypeHebrew = {
            'none': 'ללא ליווי',
            'short': 'ליווי קצר',
            'long': 'ליווי ארוך'
        };

        // Build services table
        let bridesmaidsRowsHtml = '';
        if (lead.bridesmaids && lead.bridesmaids.length > 0) {
            bridesmaidsRowsHtml = lead.bridesmaids.map((bridesmaid, i) => `
                <tr>
                    <td style="border: 1px solid #333; padding: 10px; text-align: right;">מלווה ${i + 1}</td>
                    <td style="border: 1px solid #333; padding: 10px; text-align: center;">${bridesmaid.service || 'שירות מלווה'}</td>
                    <td style="border: 1px solid #333; padding: 10px; text-align: center;">${(bridesmaid.price || 0).toLocaleString('he-IL')}</td>
                </tr>`).join('');
        }

        const servicesTableHTML = `
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                    <tr style="background-color: #f5f5f5;">
                        <th style="border: 1px solid #333; padding: 12px; text-align: center; font-weight: bold;">תיאור השירות</th>
                        <th style="border: 1px solid #333; padding: 12px; text-align: center; font-weight: bold;">פרטים</th>
                        <th style="border: 1px solid #333; padding: 12px; text-align: center; font-weight: bold;">מחיר (₪)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="border: 1px solid #333; padding: 10px; text-align: right;">${lead.service || 'שירות עיקרי'}</td>
                        <td style="border: 1px solid #333; padding: 10px; text-align: center;">שירות עיקרי</td>
                        <td style="border: 1px solid #333; padding: 10px; text-align: center;">${price.toLocaleString('he-IL')}</td>
                    </tr>
                    ${lead.escortType && lead.escortType !== 'none' ? `
                    <tr>
                        <td style="border: 1px solid #333; padding: 10px; text-align: right;">ליווי לאירוע</td>
                        <td style="border: 1px solid #333; padding: 10px; text-align: center;">${escortTypeHebrew[lead.escortType]}</td>
                        <td style="border: 1px solid #333; padding: 10px; text-align: center;">${(lead.escortPrice || 0).toLocaleString('he-IL')}</td>
                    </tr>
                    ` : ''}
                    ${bridesmaidsRowsHtml}
                </tbody>
            </table>
        `;

        // Replace variables in template
        let htmlContent = customTemplate.templateHTML || '';
        
        const replacements = {
            '{{fullName}}': fullName,
            '{{phone}}': lead.phone || 'לא הוזן',
            '{{service}}': lead.service || 'לא הוזן',
            '{{eventDate}}': lead.eventDate || 'לא הוזן',
            '{{location}}': lead.location || 'לא הוזן',
            '{{proposedPrice}}': (lead.proposedPrice || 0).toLocaleString('he-IL'),
            '{{totalPrice}}': totalPrice.toLocaleString('he-IL'),
            '{{price}}': price.toLocaleString('he-IL'),
            '{{deposit}}': deposit.toLocaleString('he-IL'),
            '{{balance}}': balance.toLocaleString('he-IL'),
            '{{date}}': getIsraelDate(),
            '{{servicesTable}}': servicesTableHTML,
            '{{logoUrl}}': customTemplate?.logoUrl || ''
        };
        
        for (const [key, value] of Object.entries(replacements)) {
            const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            htmlContent = htmlContent.replace(regex, value || '');
        }
        
        // Handle conditional logo
        if (customTemplate?.logoUrl) {
            htmlContent = htmlContent.replace(/\{\{#if logoUrl\}\}/g, '');
            htmlContent = htmlContent.replace(/\{\{\/if\}\}/g, '');
        } else {
            htmlContent = htmlContent.replace(/\{\{#if logoUrl\}\}[\s\S]*?\{\{\/if\}\}/g, '');
        }

        // Add signature section to HTML
        const signatureSection = `
            <div style="margin-top: 50px; page-break-inside: avoid;">
                <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 20px;">חתימות:</h3>
                <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                    <div style="text-align: center;">
                        <img src="${signature}" style="max-width: 200px; max-height: 80px; border-bottom: 2px solid #333; padding-bottom: 5px;" />
                        <p style="margin-top: 10px; font-size: 12px;">חתימת הלקוחה</p>
                        <p style="font-size: 11px; color: #666;">תאריך: ${new Date(lead.customerSignedAt).toLocaleDateString('he-IL')}</p>
                    </div>
                    <div style="text-align: center;">
                        <p style="font-family: 'Brush Script MT', cursive; font-size: 32px; margin: 0; padding: 20px 0;">_____________</p>
                        <p style="margin-top: 10px; font-size: 12px;">חתימת נותן השירות</p>
                        <p style="font-size: 11px; color: #666;">תאריך: ${getIsraelDate()}</p>
                    </div>
                </div>
            </div>
        `;
        
        htmlContent += signatureSection;

        // Wrap in full HTML document
        const fullHTML = `
        <!DOCTYPE html>
        <html dir="rtl" lang="he">
        <head>
            <meta charset="UTF-8">
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    direction: rtl; 
                    padding: 40px;
                    line-height: 1.8;
                    font-size: 14px;
                }
            </style>
        </head>
        <body>
            ${htmlContent}
        </body>
        </html>
        `;

        // Generate signed PDF
        const contractsDir = path.join(__dirname, 'contracts');
        await fs.mkdir(contractsDir, { recursive: true });
        
        const signedFilename = `signed-contract-${lead._id}.pdf`;
        const signedPath = path.join(contractsDir, signedFilename);

        let browser;
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--disable-software-rasterizer',
                    '--disable-extensions'
                ],
                timeout: 30000
            });
            
            const page = await browser.newPage();
            await page.setContent(fullHTML);
            await page.pdf({
                path: signedPath,
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20mm',
                    bottom: '20mm',
                    left: '20mm',
                    right: '20mm'
                }
            });
            
            await browser.close();
            console.log('✅ Signed PDF generated successfully');
        } catch (puppeteerError) {
            console.error('❌ Puppeteer failed for signed PDF:', puppeteerError.message);
            
            if (browser) {
                try { await browser.close(); } catch (e) {}
            }
            
            // Check if running on Railway (PROD) - if yes, throw error instead of fallback
            const isProduction = process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production';
            
            if (isProduction) {
                console.error('❌ PRODUCTION: Puppeteer must work for signed contracts - no fallback');
                throw puppeteerError; // Re-throw to be caught by outer try-catch
            }
            
            // DEV FALLBACK ONLY: Save as HTML
            console.log('💡 DEV MODE: Saving signed HTML preview instead...');
            const signedHtmlFilename = `signed-contract-${lead._id}.html`;
            const signedHtmlPath = path.join(contractsDir, signedHtmlFilename);
            await fs.writeFile(signedHtmlPath, fullHTML);
            
            lead.signedContractUrl = `/contracts/${signedHtmlFilename}`;
            lead.signatureSVG = signatureSVG;
            lead.signedAt = new Date().toISOString();
            lead.contractStatus = 'signed';
            await lead.save();
            
            return res.json({
                success: true,
                signedPdfUrl: `/contracts/${signedHtmlFilename}`,
                message: 'החוזה נחתם בהצלחה (תצוגת HTML - סביבת פיתוח)',
                isHtmlFallback: true,
                isDev: true
            });
        }

        // Update lead with signed contract URL
        lead.signedContractUrl = `/contracts/${signedFilename}`;
        lead.signatureSVG = signatureSVG;
        lead.signedAt = new Date().toISOString();
        lead.contractStatus = 'signed';
        await lead.save();

        res.json({
            success: true,
            message: 'החתימה נשמרה והחוזה החתום נוצר בהצלחה',
            signedAt: lead.signedAt,
            signedContractUrl: lead.signedContractUrl
        });
    } catch (error) {
        console.error('❌ Error saving signature:', error);
        res.status(500).json({ error: error.message });
    }
});

// Generate contract from lead data
app.post('/api/generate-contract/:leadId', requireAuth, async (req, res) => {
    try {
        const userId = req.user._id;
        console.log('📄 Generating contract for lead:', req.params.leadId);
        
        const lead = await Lead.findOne({ _id: req.params.leadId, userId });
        if (!lead) {
            console.error('❌ Lead not found:', req.params.leadId);
            return res.status(404).json({ error: 'ליד לא נמצא' });
        }

        console.log('✅ Lead found:', {
            name: lead.name,
            lastName: lead.lastName,
            escortType: lead.escortType,
            bridesmaids: lead.bridesmaids?.length || 0
        });

        // Try to read the contract template (optional - we can fallback to HTML)
        const templatePath = path.join(__dirname, 'uploads', 'contract-template.docx');
        let doc = null;
        let templateExists = false;
        
        try {
            await fs.access(templatePath);
            const content = await fs.readFile(templatePath, 'binary');
            const zip = new PizZip(content);
            doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
            });
            templateExists = true;
            console.log('📋 Template loaded, preparing data...');
        } catch (templateError) {
            console.log('⚠️ No template file found, will generate PDF directly from HTML');
            templateExists = false;
        }

        // Prepare data for template
        const fullName = `${lead.name} ${lead.lastName || ''}`.trim();
        const price = lead.proposedPrice || 0;
        const deposit = lead.proposedDeposit || 0;
        
        // Calculate total including escort and bridesmaids
        let totalPrice = price;
        
        // Add escort price if not 'none'
        if (lead.escortType && lead.escortType !== 'none' && lead.escortPrice) {
            totalPrice += lead.escortPrice;
        }
        
        // Add bridesmaids prices
        if (lead.bridesmaids && lead.bridesmaids.length > 0) {
            const bridesmaidsTotal = lead.bridesmaids.reduce((sum, b) => sum + (b.price || 0), 0);
            totalPrice += bridesmaidsTotal;
        }
        
        const balance = totalPrice - deposit;
        
        // Translate escort type to Hebrew
        const escortTypeHebrew = {
            'none': 'ללא ליווי',
            'short': 'ליווי קצר',
            'long': 'ליווי ארוך'
        };
        
        // Build services array for table loop in Word
        const services = [];
        
        // Main service
        services.push({
            description: lead.service || 'שירות עיקרי',
            details: 'שירות עיקרי',
            price: price
        });
        
        // Escort service
        if (lead.escortType && lead.escortType !== 'none') {
            services.push({
                description: 'ליווי לאירוע',
                details: escortTypeHebrew[lead.escortType],
                price: lead.escortPrice || 0
            });
        }
        
        // Bridesmaids services
        if (lead.bridesmaids && lead.bridesmaids.length > 0) {
            lead.bridesmaids.forEach((bridesmaid, index) => {
                services.push({
                    description: `מלווה ${index + 1}`,
                    details: bridesmaid.service || 'שירות מלווה',
                    price: bridesmaid.price || 0
                });
            });
        }
        
        // Build services text as a single string (simpler than loop)
        let servicesText = '';
        services.forEach(service => {
            servicesText += `• ${service.description} - ${service.details}: ${service.price} ₪\n`;
        });
        
        // Build complete pricing section (no logic in template!)
        const pricingSection = `
פירוט השירותים והעלויות:
השירותים שסוכמו בין הצדדים כוללים:

${servicesText}
סיכום פיננסי:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
סה"כ עלות כל השירותים: ${totalPrice.toLocaleString('he-IL')} ₪
מקדמה ששולמה (עם חתימת החוזה): ${deposit.toLocaleString('he-IL')} ₪
יתרה לתשלום ביום האירוע: ${balance.toLocaleString('he-IL')} ₪
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `.trim();
        
        const templateData = {
            name: lead.name || '',
            lastName: lead.lastName || '',
            fullName: fullName,
            phone: lead.phone || '',
            service: lead.service || '',
            eventDate: lead.eventDate || '',
            location: lead.location || '',
            proposedPrice: (lead.proposedPrice || 0).toLocaleString('he-IL'),
            price: price,
            deposit: deposit,
            balance: balance,
            totalPrice: totalPrice,
            subtotal: totalPrice, // Alias for totalPrice
            services: services, // Array for table loop
            servicesText: servicesText, // Pre-formatted text (simpler!)
            pricingSection: pricingSection, // Complete pricing block - USE THIS!
            escortType: lead.escortType || 'none',
            escortTypeHebrew: escortTypeHebrew[lead.escortType || 'none'],
            escortPrice: lead.escortPrice || 0,
            bridesmaids: lead.bridesmaids || [],
            bridesmaidsCount: lead.bridesmaids?.length || 0,
            date: getIsraelDate(),
        };

        console.log('📊 Template data prepared:', JSON.stringify(templateData, null, 2));

        // Try to use Word template, fallback to HTML if template fails
        let useWordTemplate = false;
        let buf = null;
        
        if (templateExists && doc) {
            try {
                console.log('🔄 Rendering Word template...');
                doc.render(templateData);
                console.log('✅ Word template rendered successfully');
                buf = doc.getZip().generate({ type: 'nodebuffer' });
                useWordTemplate = true;
            } catch (renderError) {
                console.error('❌ Word template rendering failed:', renderError);
                console.error('Error properties:', renderError.properties);
                console.log('🔄 Falling back to direct PDF generation (HTML-based)...');
                useWordTemplate = false;
            }
        } else {
            console.log('📄 Generating PDF directly from HTML (no Word template)');
        }

        // Save the filled Word document (if template worked)
        const contractsDir = path.join(__dirname, 'contracts');
        await fs.mkdir(contractsDir, { recursive: true });
        
        const wordFilename = `contract-${lead._id}.docx`;
        const wordPath = path.join(contractsDir, wordFilename);
        
        if (useWordTemplate && buf) {
            await fs.writeFile(wordPath, buf);
            console.log('💾 Word contract saved');
        }

        // Convert to PDF using Puppeteer
        const pdfFilename = `contract-${lead._id}.pdf`;
        const pdfPath = path.join(contractsDir, pdfFilename);

        // Load custom template from database
        console.log('📋 Loading custom contract template from database...');
        let customTemplate = await ContractTemplate.findOne({ userId });
        
        if (!customTemplate || !customTemplate.templateHTML) {
            console.log('⚠️ No custom template found, using default hardcoded template');
            customTemplate = { templateHTML: '', logoUrl: '' };
        } else {
            console.log('✅ Custom template loaded');
        }

        // Build bridesmaids rows HTML
        let bridesmaidsRowsHtml = '';
        if (lead.bridesmaids && lead.bridesmaids.length > 0) {
            bridesmaidsRowsHtml = lead.bridesmaids.map((bridesmaid, i) => `
                        <tr>
                            <td>מלווה ${i + 1}</td>
                            <td>${bridesmaid.service || 'שירות מלווה'}</td>
                            <td>${(bridesmaid.price || 0).toLocaleString('he-IL')}</td>
                        </tr>`).join('');
        }
        
        // Build services table HTML
        const servicesTableHTML = `
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                    <tr style="background-color: #f5f5f5;">
                        <th style="border: 1px solid #333; padding: 12px; text-align: center; font-weight: bold;">תיאור השירות</th>
                        <th style="border: 1px solid #333; padding: 12px; text-align: center; font-weight: bold;">פרטים</th>
                        <th style="border: 1px solid #333; padding: 12px; text-align: center; font-weight: bold;">מחיר (₪)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="border: 1px solid #333; padding: 10px; text-align: right;">${lead.service || 'שירות עיקרי'}</td>
                        <td style="border: 1px solid #333; padding: 10px; text-align: center;">שירות עיקרי</td>
                        <td style="border: 1px solid #333; padding: 10px; text-align: center;">${price.toLocaleString('he-IL')}</td>
                    </tr>
                    ${lead.escortType && lead.escortType !== 'none' ? `
                    <tr>
                        <td style="border: 1px solid #333; padding: 10px; text-align: right;">ליווי לאירוע</td>
                        <td style="border: 1px solid #333; padding: 10px; text-align: center;">${escortTypeHebrew[lead.escortType]}</td>
                        <td style="border: 1px solid #333; padding: 10px; text-align: center;">${(lead.escortPrice || 0).toLocaleString('he-IL')}</td>
                    </tr>
                    ` : ''}
                    ${bridesmaidsRowsHtml}
                </tbody>
            </table>
        `;

        // Replace variables in custom template
        let htmlContent = customTemplate.templateHTML || '';
        
        console.log('📝 Applying variable replacements to template...');
        
        // Create replacement map
        const replacements = {
            '{{fullName}}': fullName,
            '{{phone}}': templateData.phone,
            '{{service}}': templateData.service,
            '{{eventDate}}': templateData.eventDate,
            '{{location}}': templateData.location,
            '{{totalPrice}}': totalPrice.toLocaleString('he-IL'),
            '{{price}}': price.toLocaleString('he-IL'),
            '{{deposit}}': deposit.toLocaleString('he-IL'),
            '{{balance}}': balance.toLocaleString('he-IL'),
            '{{date}}': templateData.date,
            '{{servicesTable}}': servicesTableHTML,
            '{{logoUrl}}': customTemplate.logoUrl || ''
        };
        
        // Apply all replacements
        for (const [key, value] of Object.entries(replacements)) {
            const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            htmlContent = htmlContent.replace(regex, value || '');
        }
        
        // Handle conditional logo
        if (customTemplate.logoUrl) {
            htmlContent = htmlContent.replace(/\{\{#if logoUrl\}\}/g, '');
            htmlContent = htmlContent.replace(/\{\{\/if\}\}/g, '');
        } else {
            htmlContent = htmlContent.replace(/\{\{#if logoUrl\}\}[\s\S]*?\{\{\/if\}\}/g, '');
        }
        
        // Wrap in HTML document if not already wrapped
        if (!htmlContent.includes('<!DOCTYPE html>')) {
            console.log('Wrapping template in HTML document structure...');
            htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="he">
        <head>
            <meta charset="UTF-8">
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    direction: rtl; 
                    padding: 40px;
                    line-height: 1.8;
                    font-size: 14px;
                }
            </style>
        </head>
        <body>
            ${htmlContent}
        </body>
        </html>
            `;
        }
        
        console.log('✅ HTML content ready for PDF generation');

        // Launch puppeteer and generate PDF
        console.log('🚀 Launching Puppeteer...');
        
        // Find Chromium executable
        let chromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH;
        
        // If not found in env, try to find it
        if (!chromiumPath || !require('fs').existsSync(chromiumPath)) {
            console.log('⚠️ Custom chromium path not found, using puppeteer default');
            chromiumPath = undefined; // Let puppeteer use its default
        } else {
            console.log('✅ Using chromium from:', chromiumPath);
        }
        
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--disable-software-rasterizer',
                    '--disable-extensions'
                ],
                executablePath: chromiumPath,
                timeout: 30000 // 30 seconds timeout
            });
            console.log('✅ Browser launched');
            
            const page = await browser.newPage();
            console.log('📄 Setting content...');
            await page.setContent(htmlContent);
            console.log('📝 Generating PDF...');
            await page.pdf({
                path: pdfPath,
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20mm',
                    bottom: '20mm',
                    left: '20mm',
                    right: '20mm'
                }
            });
            console.log('✅ PDF generated successfully');
            await browser.close();
            console.log('🔒 Browser closed');
        } catch (puppeteerError) {
            console.error('❌ Puppeteer failed:', puppeteerError.message);
            
            // Close browser if it was opened
            if (browser) {
                try { await browser.close(); } catch (e) {}
            }
            
            // Check if running on Railway (PROD) - if yes, throw error instead of fallback
            const isProduction = process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production';
            
            if (isProduction) {
                console.error('❌ PRODUCTION: Puppeteer must work - no fallback');
                throw puppeteerError; // Re-throw to be caught by outer try-catch
            }
            
            // DEV FALLBACK ONLY: Save as HTML file for preview
            console.log('💡 DEV MODE: Saving HTML preview instead of PDF...');
            const htmlFilename = `contract-${lead._id}.html`;
            const htmlPath = path.join(contractsDir, htmlFilename);
            await fs.writeFile(htmlPath, htmlContent);
            console.log('✅ HTML preview saved:', htmlFilename);
            
            // Update lead with HTML URL
            lead.contractFileUrl = `/contracts/${htmlFilename}`;
            lead.contractStatus = 'sent';
            await lead.save();
            
            return res.json({
                success: true,
                pdfUrl: `/contracts/${htmlFilename}`,
                wordUrl: `/contracts/${wordFilename}`,
                message: 'החוזה נוצר (תצוגת HTML - Puppeteer לא זמין בסביבת פיתוח)',
                isHtmlFallback: true,
                isDev: true,
                puppeteerError: puppeteerError.message
            });
        }

        // Update lead with contract URL
        lead.contractFileUrl = `/contracts/${pdfFilename}`;
        lead.contractStatus = 'sent';
        await lead.save();
        console.log('💾 Lead updated with contract URL');

        res.json({
            success: true,
            pdfUrl: `/contracts/${pdfFilename}`,
            wordUrl: `/contracts/${wordFilename}`,
            message: 'החוזה נוצר בהצלחה'
        });
    } catch (error) {
        console.error('❌ Error generating contract:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        // Return more detailed error
        const errorResponse = {
            error: error.message || 'שגיאה ביצירת החוזה',
            errorType: error.name || 'Error',
            errorDetails: error.stack
        };
        
        // If it's a Puppeteer error, add specific message
        if (error.message && error.message.includes('browserless')) {
            errorResponse.error = 'Puppeteer לא זמין. נסי שוב בעוד דקה.';
            errorResponse.hint = 'Railway מאתחל את Chromium';
        }
        
        res.status(500).json(errorResponse);
    }
});

// Check if contract template exists
app.get('/api/contract-template/status', async (req, res) => {
    try {
        const templatePath = path.join(__dirname, 'uploads', 'contract-template.docx');
        try {
            await fs.access(templatePath);
            res.json({ exists: true });
        } catch {
            res.json({ exists: false });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==============================================
// AI / GEMINI ENDPOINT FOR SOCIAL PLANNING
// ==============================================

// AI Content Planning endpoint
app.post('/api/ai/generate-content-plan', async (req, res) => {
    try {
        const { prompt, preferences } = req.body;
        
        console.log('🤖 Generating AI content plan with Gemini...');
        console.log('Preferences:', preferences);

        // Check if Gemini API key exists
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        
        if (!GEMINI_API_KEY) {
            console.warn('⚠️  GEMINI_API_KEY not found - using mock data');
            // Return mock data for development
            const mockPlan = generateMockPlan(preferences.frequency);
            return res.json({ success: true, plan: mockPlan });
        }

        // Call Gemini API
        const fetch = (await import('node-fetch')).default;
        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            }
        );

        if (!geminiResponse.ok) {
            throw new Error(`Gemini API error: ${geminiResponse.statusText}`);
        }

        const geminiData = await geminiResponse.json();
        const generatedText = geminiData.candidates[0].content.parts[0].text;
        
        // Extract JSON from response
        const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error('No valid JSON found in Gemini response');
        }

        const plan = JSON.parse(jsonMatch[0]);
        
        console.log('✅ Generated plan:', plan.length, 'cards');
        res.json({ success: true, plan });

    } catch (error) {
        console.error('❌ Error generating AI plan:', error);
        // Return mock data as fallback
        const mockPlan = generateMockPlan(req.body.preferences.frequency || 3);
        res.json({ success: true, plan: mockPlan });
    }
});

// Mock plan generator (for development without API key)
function generateMockPlan(frequency) {
    const contentTypes = [
        'תמונת לפני ואחרי',
        'טיפ מקצועי',
        'סרטון הדרכה',
        'תמונה של עבודה',
        'סיפור הצלחה',
        'מבט מאחורי הקלעים',
        'המלצת מוצר'
    ];
    
    const formats = ['תמונה בודדת', 'קרוסלה', 'Reel', 'Story', 'Video'];
    const platforms = ['Instagram', 'Facebook', 'TikTok'];
    const goals = ['אירוסין', 'מכירה', 'מודעות', 'קהילה'];
    
    const ideas = [
        'הצגת עבודת איפור דרמטית - טרנספורמציה מדהימה',
        'טיפ לעמידות האיפור במשך כל האירוע',
        'תהליך איפור מהיר ל-30 דקות',
        'עבודת איפור מיוחדת עם פרטים זהב',
        'סיפור של כלה שהתרגשה מהתוצאה',
        'כך אני בוחרת את גוון הבסיס המושלם',
        'המוצרים האהובים עלי לאיפור כלות'
    ];

    const plan = [];
    const numCards = parseInt(frequency) || 3;
    const usedDays = new Set();

    for (let i = 0; i < numCards; i++) {
        // Distribute evenly across the week
        let day;
        do {
            day = Math.floor((i / numCards) * 7);
        } while (usedDays.has(day) && usedDays.size < 7);
        usedDays.add(day);

        const hour = 18 + Math.floor(Math.random() * 3); // 18:00-20:00
        const minutes = Math.random() > 0.5 ? '00' : '30';

        plan.push({
            day: day,
            time: `${hour}:${minutes}`,
            platform: platforms[Math.floor(Math.random() * platforms.length)],
            contentType: contentTypes[i % contentTypes.length],
            format: formats[Math.floor(Math.random() * formats.length)],
            idea: ideas[i % ideas.length],
            goal: goals[Math.floor(Math.random() * goals.length)]
        });
    }

    return plan;
}

// ==================== START SERVER ====================

async function startServer() {
    try {
        await connectDB();
        
        // Drop the old 'id' index if it exists (after models are loaded)
        try {
            await Lead.collection.dropIndex('id_1');
            console.log('🗑️  Dropped old id_1 index from leads collection');
        } catch (dropError) {
            // Index doesn't exist, that's fine
            if (dropError.code !== 27) { // 27 = IndexNotFound
                console.log('ℹ️  No id_1 index to drop (already clean)');
            }
        }
        
        app.listen(PORT, () => {
            console.log('');
            console.log('========================================');
            console.log('ג¨  CRM Server Started Successfully!  ג¨');
            console.log('========================================');
            console.log(`נ  Server: http://localhost:${PORT}`);
            console.log(`נ“  API: http://localhost:${PORT}/api`);
            console.log(`נ’  Health Check: http://localhost:${PORT}/api/health`);
            console.log('========================================');
            console.log('');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nנ‘‹ Shutting down server...');
    await mongoose.connection.close();
    process.exit(0);
});
