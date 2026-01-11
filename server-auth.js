require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Initialize Express App
const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET || 'ayamakeup-crm-secret-key-change-in-production';

// Determine BASE_URL - try multiple sources
let BASE_URL = process.env.BASE_URL;
if (!BASE_URL && process.env.GOOGLE_CALLBACK_URL) {
    // Extract from GOOGLE_CALLBACK_URL if BASE_URL not available
    BASE_URL = process.env.GOOGLE_CALLBACK_URL.replace('/auth/google/callback', '');
}
if (!BASE_URL) {
    BASE_URL = `http://localhost:${PORT}`;
}

// Debug environment variables
console.log('🔍 Environment Check:');
console.log('   PORT:', PORT);
console.log('   BASE_URL from env:', process.env.BASE_URL);
console.log('   BASE_URL final:', BASE_URL);
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   GOOGLE_CALLBACK_URL:', process.env.GOOGLE_CALLBACK_URL);

if (!MONGODB_URI) {
    console.error('❌ ERROR: MONGODB_URI is not defined in .env file');
    process.exit(1);
}

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error('❌ ERROR: Google OAuth credentials not defined in .env file');
    console.error('   Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
    process.exit(1);
}

console.log('🔄 Connecting to MongoDB Atlas...');

// Connect to MongoDB
async function connectDB() {
    try {
        console.log('🔍 Testing connection with URI:', MONGODB_URI.replace(/:[^:@]+@/, ':****@'));
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ Connected to MongoDB Atlas successfully!');
        console.log(`📦 Database: ${mongoose.connection.name}`);
    } catch (err) {
        console.error('❌ MongoDB connection error:');
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        console.error('Full error:', err);
        console.error('\n💡 Check:');
        console.error('   1. MongoDB URI is correct in .env');
        console.error('   2. IP address is whitelisted (0.0.0.0/0 for all)');
        console.error('   3. Database user has correct permissions');
        console.error('   4. Password is correct (no special characters need encoding)');
        setTimeout(() => process.exit(1), 1000);
    }
}

// ==================== SCHEMAS WITH USER ISOLATION ====================

const clientSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true }, // Google User ID
    userEmail: { type: String, required: true }, // For easy identification
    id: { type: Number, required: true },
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: String, required: true },
    service: String,
    paymentMethod: String,
    isBride: { type: Boolean, default: false },
    month: String,
    createdAt: { type: Date, default: Date.now }
});

// Compound index: unique ID per user
clientSchema.index({ userId: 1, id: 1 }, { unique: true });

const leadSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true }, // Google User ID
    userEmail: { type: String, required: true }, // For easy identification
    id: { type: Number, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    lastName: String,
    source: String,
    service: String,
    eventDate: String,
    location: String,
    isBride: { type: Boolean, default: false },
    status: { type: String, default: 'new' },
    proposedPrice: Number,
    finalPrice: Number,
    deposit: Number,
    depositDate: String,
    balance: Number,
    balanceDate: String,
    notes: String,
    bridesmaids: Array,
    escortType: String,
    escortPrice: Number,
    stageHistory: Array,
    depositIncomeRecorded: { type: Boolean, default: false },
    eventPaymentIncomeRecorded: { type: Boolean, default: false },
    contractFileUrl: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Compound index: unique ID per user
leadSchema.index({ userId: 1, id: 1 }, { unique: true });

const Client = mongoose.model('Client', clientSchema);
const Lead = mongoose.model('Lead', leadSchema);

// ==================== SESSION & PASSPORT CONFIGURATION ====================

// Session middleware (using memory store for Railway compatibility)
// Note: Sessions will reset on server restart
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' // HTTPS only in production
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Serialize user into session
passport.serializeUser((user, done) => {
    done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user, done) => {
    done(null, user);
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || `${BASE_URL}/auth/google/callback`
},
(accessToken, refreshToken, profile, done) => {
    // User object to store in session
    const user = {
        id: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        picture: profile.photos[0]?.value || ''
    };
    return done(null, user);
}));

// ==================== MIDDLEWARE ====================

app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL 
        : 'http://localhost:3000',
    credentials: true
}));
app.use(bodyParser.json());

// Serve static files from public directory
const publicPath = path.join(__dirname, 'public');
console.log('📁 Serving static files from:', publicPath);
app.use(express.static(publicPath));

// Root redirect to index.html
app.get('/', (req, res) => {
    const indexPath = path.join(publicPath, 'index.html');
    console.log('📄 Serving index.html from:', indexPath);
    res.sendFile(indexPath);
});

// Authentication middleware
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ 
        error: 'לא מחובר',
        message: 'יש להתחבר כדי לבצע פעולה זו',
        isAuthenticated: false
    });
}

// ==================== AUTHENTICATION ROUTES ====================

// Check authentication status
app.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({
            isAuthenticated: true,
            user: req.user
        });
    } else {
        res.json({
            isAuthenticated: false,
            user: null
        });
    }
});

// Google OAuth login
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth callback
app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login.html' }),
    (req, res) => {
        // Successful authentication
        res.redirect('/');
    }
);

// Logout
app.get('/api/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ error: 'שגיאה בהתנתקות' });
        }
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ error: 'שגיאה במחיקת Session' });
            }
            res.clearCookie('connect.sid');
            res.json({ success: true, message: 'התנתקת בהצלחה' });
        });
    });
});

// ==================== API ROUTES ====================

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'CRM API is running with Authentication', 
        database: 'MongoDB Atlas',
        connected: mongoose.connection.readyState === 1,
        authenticated: req.isAuthenticated()
    });
});

// ==================== CLIENTS/INCOME ROUTES ====================

// Get all clients for current user
app.get('/api/clients', isAuthenticated, async (req, res) => {
    try {
        const clients = await Client.find({ userId: req.user.id }).sort({ date: -1 });
        res.json(clients);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get clients by month for current user
app.get('/api/clients/month/:month', isAuthenticated, async (req, res) => {
    try {
        const { month } = req.params;
        const query = { userId: req.user.id };
        if (month !== 'ALL') {
            query.month = month;
        }
        const clients = await Client.find(query).sort({ date: -1 });
        res.json(clients);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add new client/income
app.post('/api/clients', isAuthenticated, async (req, res) => {
    try {
        const clientData = {
            userId: req.user.id,
            userEmail: req.user.email,
            id: req.body.id,
            name: req.body.name,
            amount: req.body.amount,
            date: req.body.date,
            service: req.body.service || null,
            paymentMethod: req.body.paymentMethod,
            isBride: Boolean(req.body.isBride),
            month: req.body.month
        };
        
        const client = new Client(clientData);
        await client.save();
        
        res.json(client);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update client
app.put('/api/clients/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const client = await Client.findOneAndUpdate(
            { userId: req.user.id, id: parseInt(id) },
            {
                name: req.body.name,
                amount: req.body.amount,
                date: req.body.date,
                service: req.body.service || null,
                paymentMethod: req.body.paymentMethod,
                isBride: Boolean(req.body.isBride),
                month: req.body.month
            },
            { new: true }
        );
        
        if (!client) {
            return res.status(404).json({ error: 'לקוח לא נמצא' });
        }
        
        res.json(client);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete client
app.delete('/api/clients/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Client.deleteOne({ userId: req.user.id, id: parseInt(id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'לקוח לא נמצא' });
        }
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bulk delete clients
app.post('/api/clients/bulk-delete', isAuthenticated, async (req, res) => {
    try {
        const { ids } = req.body;
        const result = await Client.deleteMany({ 
            userId: req.user.id,
            id: { $in: ids }
        });
        res.json({ 
            success: true,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== LEADS ROUTES ====================

// Get all leads for current user
app.get('/api/leads', isAuthenticated, async (req, res) => {
    try {
        const leads = await Lead.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(leads);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single lead
app.get('/api/leads/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const lead = await Lead.findOne({ userId: req.user.id, id: parseInt(id) });
        
        if (!lead) {
            return res.status(404).json({ error: 'ליד לא נמצא' });
        }
        
        res.json(lead);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get leads by status for current user
app.get('/api/leads/status/:status', isAuthenticated, async (req, res) => {
    try {
        const { status } = req.params;
        const leads = await Lead.find({ 
            userId: req.user.id,
            status
        }).sort({ createdAt: -1 });
        res.json(leads);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add new lead
app.post('/api/leads', isAuthenticated, async (req, res) => {
    try {
        const leadData = {
            userId: req.user.id,
            userEmail: req.user.email,
            ...req.body
        };
        
        const lead = new Lead(leadData);
        await lead.save();
        
        res.json(lead);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update lead status
app.patch('/api/leads/:id/status', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const lead = await Lead.findOneAndUpdate(
            { userId: req.user.id, id: parseInt(id) },
            { status, updatedAt: new Date() },
            { new: true }
        );
        
        if (!lead) {
            return res.status(404).json({ error: 'ליד לא נמצא' });
        }
        
        res.json(lead);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update lead
app.put('/api/leads/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = {
            ...req.body,
            updatedAt: new Date()
        };
        
        // Don't allow changing userId
        delete updateData.userId;
        delete updateData.userEmail;
        
        const lead = await Lead.findOneAndUpdate(
            { userId: req.user.id, id: parseInt(id) },
            updateData,
            { new: true }
        );
        
        if (!lead) {
            return res.status(404).json({ error: 'ליד לא נמצא' });
        }
        
        res.json(lead);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete lead
app.delete('/api/leads/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Lead.deleteOne({ userId: req.user.id, id: parseInt(id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'ליד לא נמצא' });
        }
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== STATISTICS ROUTES ====================

// Get statistics summary for current user
app.get('/api/stats/summary', isAuthenticated, async (req, res) => {
    try {
        const { month } = req.query;
        const query = { userId: req.user.id };
        if (month && month !== 'ALL') {
            query.month = month;
        }
        
        const clients = await Client.find(query);
        
        const totalIncome = clients.reduce((sum, c) => sum + c.amount, 0);
        const bridesCount = clients.filter(c => c.isBride).length;
        const transactionsCount = clients.length;
        
        res.json({
            totalIncome,
            bridesCount,
            transactionsCount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get monthly breakdown for current user
app.get('/api/stats/monthly', isAuthenticated, async (req, res) => {
    try {
        const monthlyData = await Client.aggregate([
            { $match: { userId: req.user.id } },
            {
                $group: {
                    _id: '$month',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    month: '$_id',
                    total: 1,
                    count: 1
                }
            }
        ]);
        
        res.json(monthlyData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== MIGRATION/CLEANUP ROUTES ====================

// Delete all documents without userId (cleanup old data)
app.post('/api/cleanup-orphaned-data', isAuthenticated, async (req, res) => {
    try {
        // Only allow this if user is admin or in development
        if (process.env.NODE_ENV !== 'development') {
            return res.status(403).json({ error: 'פעולה זו מותרת רק בסביבת פיתוח' });
        }
        
        const clientsDeleted = await Client.deleteMany({ userId: { $exists: false } });
        const leadsDeleted = await Lead.deleteMany({ userId: { $exists: false } });
        
        res.json({
            success: true,
            message: `נמחקו ${clientsDeleted.deletedCount} לקוחות ו-${leadsDeleted.deletedCount} לידים ללא userId`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== SERVER START ====================

async function startServer() {
    await connectDB();
    
    app.listen(PORT, () => {
        console.log('');
        console.log('🔐 ========================================');
        console.log(`   CRM Server with AUTHENTICATION`);
        console.log('🔐 ========================================');
        console.log(`🌐 Server: ${BASE_URL}`);
        console.log(`📦 Database: MongoDB Atlas (Cloud)`);
        console.log(`🔑 Auth: Google OAuth 2.0`);
        console.log(`🚀 API: ${BASE_URL}/api`);
        console.log('========================================');
        console.log('');
    });
}

startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n👋 Shutting down server...');
    await mongoose.connection.close();
    process.exit(0);
});
