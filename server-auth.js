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

// User Settings Schema - stores all user preferences
const userSettingsSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true, index: true },
    userEmail: { type: String, required: true },
    businessName: { type: String, default: 'Luna Makeup' },
    
    // Goals (legacy - for simple 3 goals)
    goals: {
        monthlyIncome: { type: Number, default: 20000 },
        monthlyLeads: { type: Number, default: 30 },
        monthlyDeals: { type: Number, default: 15 }
    },
    
    // Custom Goals - user can define any goals they want
    customGoals: { 
        type: Array, 
        default: [
            { goalType: 'monthly-income', target: 20000, label: '💰 הכנסה חודשית' },
            { goalType: 'monthly-leads', target: 30, label: '📊 לידים חדשים' },
            { goalType: 'monthly-deals', target: 15, label: '✅ עסקאות שנסגרו' }
        ]
    },
    
    // Message Settings
    messageSettings: {
        templates: { type: Array, default: [] },
        autoReply: { type: Boolean, default: false },
        signature: { type: String, default: '' }
    },
    
    // Timer Settings
    timerSettings: {
        workMinutes: { type: Number, default: 25 },
        breakMinutes: { type: Number, default: 5 },
        autoStart: { type: Boolean, default: false }
    },
    
    // Follow-up Timers
    followupTimers: { type: Array, default: [] },
    
    // UI Preferences
    darkMode: { type: Boolean, default: false },
    
    // Social Strategy
    socialStrategy: {
        platforms: { type: Array, default: [] },
        schedule: { type: Object, default: {} },
        contentIdeas: { type: Array, default: [] }
    },
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Contract Template Schema - stores user's contract template
const contractTemplateSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true, index: true },
    userEmail: { type: String, required: true },
    templateHTML: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Client = mongoose.model('Client', clientSchema);
const Lead = mongoose.model('Lead', leadSchema);
const UserSettings = mongoose.model('UserSettings', userSettingsSchema);
const ContractTemplate = mongoose.model('ContractTemplate', contractTemplateSchema);

// Trust proxy - required for Railway/Heroku
app.set('trust proxy', 1);

// ==================== SESSION & PASSPORT CONFIGURATION ====================

// Session middleware (using memory store for Railway compatibility)
// Note: Sessions will reset on server restart
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true, // Trust proxy
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
        secure: true, // Always use secure in production
        sameSite: 'lax' // Allow OAuth redirects
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
app.get('/auth/google', (req, res, next) => {
    console.log('🔐 /auth/google called');
    console.log('   GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID ? 'Set' : 'Missing');
    console.log('   GOOGLE_CLIENT_SECRET:', GOOGLE_CLIENT_SECRET ? 'Set' : 'Missing');
    console.log('   Callback URL:', process.env.GOOGLE_CALLBACK_URL || `${BASE_URL}/auth/google/callback`);
    next();
}, passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google OAuth callback
app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login.html' }),
    (req, res) => {
        console.log('✅ Authentication successful!');
        console.log('   User:', req.user);
        // Successful authentication
        res.redirect('/');
    }
);

// Logout (support both /auth/logout and /api/logout)
app.get('/auth/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('❌ Logout error:', err);
            return res.redirect('/');
        }
        req.session.destroy((err) => {
            if (err) {
                console.error('❌ Session destroy error:', err);
            }
            console.log('👋 User logged out successfully');
            res.redirect('/');
        });
    });
});

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

// ==================== USER SETTINGS ROUTES ====================

// Get user settings (creates default if not exists)
app.get('/api/user/settings', isAuthenticated, async (req, res) => {
    try {
        let settings = await UserSettings.findOne({ userId: req.user.id });
        
        // Create default settings if user doesn't have any
        if (!settings) {
            settings = new UserSettings({
                userId: req.user.id,
                userEmail: req.user.email,
                goals: {
                    monthlyIncome: 20000,
                    monthlyLeads: 30,
                    monthlyDeals: 15
                }
            });
            await settings.save();
            console.log('✨ Created default settings for user:', req.user.email);
        }
        
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update user settings
app.put('/api/user/settings', isAuthenticated, async (req, res) => {
    try {
        console.log('📝 Updating settings for user:', req.user.email);
        console.log('📊 Settings data:', JSON.stringify(req.body, null, 2));
        
        const settings = await UserSettings.findOneAndUpdate(
            { userId: req.user.id },
            { 
                ...req.body,
                userId: req.user.id, // Ensure userId doesn't change
                userEmail: req.user.email,
                updatedAt: new Date()
            },
            { new: true, upsert: true } // Create if doesn't exist
        );
        
        console.log('✅ Settings updated. customGoals count:', settings.customGoals?.length || 0);
        
        res.json(settings);
    } catch (error) {
        console.error('❌ Error updating settings:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update specific setting field
app.patch('/api/user/settings/:field', isAuthenticated, async (req, res) => {
    try {
        const { field } = req.params;
        const updateData = {};
        updateData[field] = req.body[field];
        updateData.updatedAt = new Date();
        
        const settings = await UserSettings.findOneAndUpdate(
            { userId: req.user.id },
            updateData,
            { new: true, upsert: true }
        );
        
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== CLIENTS ROUTES ====================// ==================== API ROUTES ====================

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
        // Get the highest id for this user
        const lastClient = await Client.findOne({ userId: req.user.id })
            .sort({ id: -1 })
            .select('id');
        
        const nextId = lastClient ? lastClient.id + 1 : 1;
        
        const clientData = {
            userId: req.user.id,
            userEmail: req.user.email,
            id: nextId, // Auto-generate id
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
        
        // Check for duplicates
        const leadIds = leads.map(l => l._id.toString());
        const uniqueIds = new Set(leadIds);
        if (leadIds.length !== uniqueIds.size) {
            console.error('🔴 DUPLICATE LEADS IN DB for user:', req.user.email);
            console.error('   Total:', leadIds.length, 'Unique:', uniqueIds.size);
            
            // Find duplicate IDs
            const duplicates = leadIds.filter((id, index) => leadIds.indexOf(id) !== index);
            console.error('   Duplicate _ids:', duplicates);
            
            // Return only unique leads (first occurrence)
            const seenIds = new Set();
            const uniqueLeads = leads.filter(lead => {
                const idStr = lead._id.toString();
                if (seenIds.has(idStr)) return false;
                seenIds.add(idStr);
                return true;
            });
            
            console.log('✅ Returning', uniqueLeads.length, 'unique leads');
            return res.json(uniqueLeads);
        }
        
        console.log('📊 Returning', leads.length, 'leads for user:', req.user.email);
        res.json(leads);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single lead
app.get('/api/leads/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        // Support both MongoDB _id and numeric id
        const lead = await Lead.findOne({ 
            userId: req.user.id,
            $or: [
                { _id: id },
                { id: parseInt(id) }
            ]
        });
        
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
        // Get the highest id for this user
        const lastLead = await Lead.findOne({ userId: req.user.id })
            .sort({ id: -1 })
            .select('id');
        
        const nextId = lastLead ? lastLead.id + 1 : 1;
        
        const leadData = {
            userId: req.user.id,
            userEmail: req.user.email,
            id: nextId, // Auto-generate id
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
            { 
                userId: req.user.id,
                $or: [
                    { _id: id },
                    { id: parseInt(id) }
                ]
            },
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
            { 
                userId: req.user.id,
                $or: [
                    { _id: id },
                    { id: parseInt(id) }
                ]
            },
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
        const result = await Lead.deleteOne({ 
            userId: req.user.id,
            $or: [
                { _id: id },
                { id: parseInt(id) }
            ]
        });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'ליד לא נמצא' });
        }
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== STATISTICS ROUTES ====================

// Contract preview route - Generate HTML preview of contract
app.get('/api/preview-contract/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('📄 Generating contract preview for lead:', id);
        
        // Find lead by MongoDB _id OR custom id
        let lead = await Lead.findOne({ 
            userId: req.user.id,
            $or: [
                { _id: id },
                { id: parseInt(id) }
            ]
        });
        
        if (!lead) {
            return res.status(404).send(`
                <html dir="rtl">
                <head><meta charset="UTF-8"><title>שגיאה</title></head>
                <body style="font-family: Arial; padding: 40px; text-align: center;">
                    <h1 style="color: red;">❌ ליד לא נמצא</h1>
                    <p>לא נמצא ליד עם מזהה: ${id}</p>
                    <button onclick="window.close()">סגור חלון</button>
                </body>
                </html>
            `);
        }
        
        // Generate contract HTML
        const contractHTML = generateContractHTML(lead);
        res.send(contractHTML);
        
    } catch (error) {
        console.error('❌ Error generating contract preview:', error);
        res.status(500).send(`
            <html dir="rtl">
            <head><meta charset="UTF-8"><title>שגיאה</title></head>
            <body style="font-family: Arial; padding: 40px; text-align: center;">
                <h1 style="color: red;">❌ שגיאה</h1>
                <p>${error.message}</p>
                <button onclick="window.close()">סגור חלון</button>
            </body>
            </html>
        `);
    }
});

// Helper function to generate contract HTML
function generateContractHTML(lead) {
    const today = new Date().toLocaleDateString('he-IL');
    const eventDate = lead.eventDate ? new Date(lead.eventDate).toLocaleDateString('he-IL') : '___________';
    
    // Calculate total price
    let totalPrice = (lead.totalPrice || 0);
    const escortPrice = lead.escortPrice || 0;
    const bridesmaidsPrice = lead.bridesmaids ? lead.bridesmaids.reduce((sum, b) => sum + (b.price || 0), 0) : 0;
    
    const depositAmount = lead.depositAmount || 0;
    const remainingBalance = totalPrice - depositAmount;
    
    return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>חוזה - ${lead.name} ${lead.lastName || ''}</title>
    <style>
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.8;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            background: #f5f5f5;
        }
        .contract-container {
            background: white;
            padding: 60px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        h1 {
            text-align: center;
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 20px;
            margin-bottom: 40px;
        }
        .section {
            margin-bottom: 30px;
        }
        .section-title {
            font-weight: bold;
            font-size: 1.1em;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .field {
            margin: 10px 0;
            padding: 8px;
            background: #f8f9fa;
            border-right: 4px solid #3498db;
        }
        .field strong {
            color: #2c3e50;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        table, th, td {
            border: 1px solid #ddd;
        }
        th {
            background: #3498db;
            color: white;
            padding: 12px;
            text-align: right;
        }
        td {
            padding: 10px;
            text-align: right;
        }
        .total-row {
            background: #e8f4f8;
            font-weight: bold;
        }
        .signature-section {
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
        }
        .signature-box {
            width: 45%;
            border-top: 2px solid #333;
            padding-top: 10px;
            text-align: center;
        }
        .print-button {
            background: #3498db;
            color: white;
            border: none;
            padding: 15px 30px;
            font-size: 16px;
            border-radius: 5px;
            cursor: pointer;
            margin: 20px auto;
            display: block;
        }
        .print-button:hover {
            background: #2980b9;
        }
    </style>
</head>
<body>
    <div class="contract-container">
        <h1>📋 חוזה לאיפור כלה</h1>
        
        <div class="section">
            <div class="section-title">🗓️ פרטי האירוע</div>
            <div class="field"><strong>תאריך החוזה:</strong> ${today}</div>
            <div class="field"><strong>תאריך האירוע:</strong> ${eventDate}</div>
        </div>
        
        <div class="section">
            <div class="section-title">👰 פרטי הכלה</div>
            <div class="field"><strong>שם:</strong> ${lead.name} ${lead.lastName || ''}</div>
            <div class="field"><strong>טלפון:</strong> ${lead.phone || ''}</div>
            <div class="field"><strong>כתובת:</strong> ${lead.address || 'לא צוין'}</div>
        </div>
        
        <div class="section">
            <div class="section-title">💰 פירוט מחירים</div>
            <table>
                <thead>
                    <tr>
                        <th>תיאור</th>
                        <th style="width: 150px;">מחיר</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>איפור כלה</td>
                        <td>${lead.totalPrice || 0} ₪</td>
                    </tr>
                    ${escortPrice > 0 ? `
                    <tr>
                        <td>ליווי (${lead.escortType || 'סוג ליווי'})</td>
                        <td>${escortPrice} ₪</td>
                    </tr>
                    ` : ''}
                    ${lead.bridesmaids && lead.bridesmaids.length > 0 ? lead.bridesmaids.map(b => `
                    <tr>
                        <td>${b.service}</td>
                        <td>${b.price} ₪</td>
                    </tr>
                    `).join('') : ''}
                    <tr class="total-row">
                        <td><strong>סה"כ:</strong></td>
                        <td><strong>${totalPrice + escortPrice + bridesmaidsPrice} ₪</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div class="section">
            <div class="section-title">💳 תשלומים</div>
            <div class="field"><strong>מקדמה ששולמה:</strong> ${depositAmount} ₪</div>
            <div class="field"><strong>יתרת תשלום:</strong> ${remainingBalance} ₪</div>
        </div>
        
        <div class="section">
            <div class="section-title">📝 הערות נוספות</div>
            <div class="field">${lead.notes || 'אין הערות'}</div>
        </div>
        
        <div class="signature-section">
            <div class="signature-box">
                <div>חתימת הכלה</div>
                <div style="margin-top: 5px; color: #666;">_______________</div>
            </div>
            <div class="signature-box">
                <div>חתימת המאפרת</div>
                <div style="margin-top: 5px; color: #666;">_______________</div>
            </div>
        </div>
    </div>
    
    <button class="print-button no-print" onclick="window.print()">🖨️ הדפס חוזה</button>
</body>
</html>
    `;
}

// ==================== CONTRACT TEMPLATE ROUTES ====================

// Get user's contract template
app.get('/api/contract-template-html', isAuthenticated, async (req, res) => {
    try {
        let template = await ContractTemplate.findOne({ userId: req.user.id });
        
        if (!template) {
            // Create default template from file
            const fs = require('fs');
            const path = require('path');
            const defaultTemplatePath = path.join(__dirname, 'contract-template-example.txt');
            
            let defaultTemplate = '';
            try {
                defaultTemplate = fs.readFileSync(defaultTemplatePath, 'utf8');
            } catch (err) {
                console.log('Could not load default template file, using hardcoded template');
                defaultTemplate = `חוזה מתן שירותים

הסכם זה נערך ונחתם ביום {{date}}

בין: {{businessName}} (להלן: "נותן השירות")
לבין: {{fullName}} (להלן: "הלקוח/ה")
טלפון: {{phone}}

פרטי האירוע:
תאריך האירוע: {{eventDate}}
מקום ההתארגנות: {{location}}

פירוט שירותים ומחירים:
{{servicesTable}}

סיכום עלויות:
סך כל השירותים: ₪{{totalPrice}}
מקדמה ששולמה: ₪{{deposit}}
יתרה לתשלום: ₪{{balance}}

הערה: חוזה זה נערך בשתי העתקים, כשכל צד קיבל את העתקו.`;
            }
            
            template = new ContractTemplate({
                userId: req.user.id,
                userEmail: req.user.email,
                templateHTML: defaultTemplate,
                logoUrl: ''
            });
            await template.save();
        }
        
        res.json({
            templateHTML: template.templateHTML,
            logoUrl: template.logoUrl
        });
    } catch (error) {
        console.error('Error loading contract template:', error);
        res.status(500).json({ error: error.message });
    }
});

// Save user's contract template
app.post('/api/contract-template-html', isAuthenticated, async (req, res) => {
    try {
        const { templateHTML, logoUrl } = req.body;
        
        let template = await ContractTemplate.findOneAndUpdate(
            { userId: req.user.id },
            {
                userId: req.user.id,
                userEmail: req.user.email,
                templateHTML: templateHTML || '',
                logoUrl: logoUrl || '',
                updatedAt: new Date()
            },
            { new: true, upsert: true }
        );
        
        res.json({
            success: true,
            templateHTML: template.templateHTML,
            logoUrl: template.logoUrl
        });
    } catch (error) {
        console.error('Error saving contract template:', error);
        res.status(500).json({ error: error.message });
    }
});

// Generate contract from template - fill in lead data
app.post('/api/generate-contract/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('📄 Generating contract for lead:', id);
        
        // Find lead
        let lead = await Lead.findOne({ 
            userId: req.user.id,
            $or: [
                { _id: id },
                { id: parseInt(id) }
            ]
        });
        
        if (!lead) {
            return res.status(404).json({ error: 'ליד לא נמצא' });
        }
        
        // Get user's contract template
        let template = await ContractTemplate.findOne({ userId: req.user.id });
        
        if (!template || !template.templateHTML) {
            return res.status(400).json({ error: 'לא נמצאה תבנית חוזה. אנא צרי תבנית בעורך החוזים' });
        }
        
        // Get user settings for business name
        const userSettings = await UserSettings.findOne({ userId: req.user.id });
        
        // Prepare contract data
        const contractData = await prepareContractData(lead, req.user.email);
        
        // Fill template with data
        let contractHTML = fillTemplate(template.templateHTML, contractData);
        
        // Save contract to lead
        lead.contract = {
            html: contractHTML,
            createdAt: new Date(),
            status: 'pending' // pending, signed, cancelled
        };
        lead.contractStatus = 'generated';
        
        // Save with strong write concern to ensure it's committed to majority of nodes
        await lead.save({ 
            wtimeout: 10000,
            w: 'majority'
        });
        
        // Wait significantly longer to ensure MongoDB replication is complete
        console.log('⏳ Waiting for MongoDB to complete write and replication...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Verify by re-fetching multiple times
        let verifyLead = null;
        let verifyAttempts = 3;
        
        for (let i = 0; i < verifyAttempts; i++) {
            verifyLead = await Lead.findById(lead._id).read('primary').lean();
            if (verifyLead?.contract?.html) {
                console.log(`✅ Verification successful on attempt ${i + 1}`);
                break;
            }
            if (i < verifyAttempts - 1) {
                console.log(`⚠️ Verification attempt ${i + 1} failed, retrying...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log('✅ Contract saved to lead. Contract HTML length:', contractHTML.length);
        console.log('✅ Lead contract status:', lead.contractStatus);
        console.log('✅ Lead has contract.html:', !!lead.contract?.html);
        console.log('✅ Verified contract HTML length:', verifyLead?.contract?.html?.length || 0);
        
        if (!verifyLead?.contract?.html) {
            console.warn('⚠️ WARNING: Contract not immediately readable from MongoDB, but it was saved.');
            console.warn('⚠️ The retry logic in contract-view will handle this.');
        }
        
        // Return success regardless of immediate verification
        // The contract-view endpoint with retries will read it when ready
        res.json({
            success: true,
            contractHTML: contractHTML,
            leadId: lead._id
        });
        
    } catch (error) {
        console.error('❌ Error generating contract:', error);
        res.status(500).json({ error: error.message });
    }
});

// Helper function to prepare contract data from lead
async function prepareContractData(lead, userEmail) {
    const today = new Date().toLocaleDateString('he-IL');
    const eventDate = lead.eventDate ? new Date(lead.eventDate).toLocaleDateString('he-IL') : 'לא נקבע';
    
    // Get business name from user settings
    const userSettings = await UserSettings.findOne({ userEmail });
    const businessName = userSettings?.businessName || 'Luna Makeup';
    
    const fullName = `${lead.name} ${lead.lastName || ''}`.trim();
    const phone = lead.phone || '';
    const address = lead.address || 'לא צוין';
    const location = lead.location || address;
    
    // Calculate prices
    const basePrice = lead.proposedPrice || lead.totalPrice || lead.price || 0;
    const escortPrice = lead.escortPrice || 0;
    const bridesmaidsPrice = lead.bridesmaids ? lead.bridesmaids.reduce((sum, b) => sum + (b.price || 0), 0) : 0;
    const totalPrice = basePrice + escortPrice + bridesmaidsPrice;
    const depositAmount = lead.depositAmount || lead.deposit || 0;
    const balance = totalPrice - depositAmount;
    
    // Build services table HTML
    let servicesTableHTML = '<table border="1" style="width: 100%; border-collapse: collapse; margin: 20px 0;">';
    servicesTableHTML += '<thead><tr><th style="padding: 10px; text-align: right;">תיאור השירות</th><th style="padding: 10px; text-align: right; width: 150px;">מחיר</th></tr></thead>';
    servicesTableHTML += '<tbody>';
    
    // Base service
    servicesTableHTML += `<tr><td style="padding: 10px;">איפור כלה</td><td style="padding: 10px;">${basePrice} ₪</td></tr>`;
    
    // Escort
    if (escortPrice > 0) {
        const escortType = lead.escortType || 'ליווי';
        servicesTableHTML += `<tr><td style="padding: 10px;">${escortType}</td><td style="padding: 10px;">${escortPrice} ₪</td></tr>`;
    }
    
    // Bridesmaids
    if (lead.bridesmaids && lead.bridesmaids.length > 0) {
        lead.bridesmaids.forEach(b => {
            servicesTableHTML += `<tr><td style="padding: 10px;">${b.service}</td><td style="padding: 10px;">${b.price} ₪</td></tr>`;
        });
    }
    
    servicesTableHTML += `<tr style="background: #f0f0f0; font-weight: bold;"><td style="padding: 10px;">סה"כ</td><td style="padding: 10px;">${totalPrice} ₪</td></tr>`;
    servicesTableHTML += '</tbody></table>';
    
    return {
        date: today,
        businessName: businessName,
        fullName: fullName,
        phone: phone,
        address: address,
        location: location,
        eventDate: eventDate,
        servicesTable: servicesTableHTML,
        totalPrice: totalPrice,
        deposit: depositAmount,
        balance: balance,
        notes: lead.notes || ''
    };
}

// Helper function to fill template with data
function fillTemplate(template, data) {
    let filled = template;
    
    // Replace all {{variable}} with actual data
    Object.keys(data).forEach(key => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        filled = filled.replace(regex, data[key]);
    });
    
    return filled;
}

// Get contract for viewing/signing
app.get('/api/contract-view/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('📄 ========================================');
        console.log('📄 Contract View Request');
        console.log('📄 ID from URL:', id);
        console.log('📄 ID type:', typeof id);
        console.log('📄 ID length:', id.length);
        console.log('📄 Is valid ObjectId:', mongoose.Types.ObjectId.isValid(id));
        console.log('📄 ========================================');
        
        // Retry logic for timing issues - read from primary with longer delays
        let lead = null;
        let retries = 10; // Increased from 5 to 10
        
        console.log(`🔍 Attempting to load contract for lead: ${id}`);
        
        while (retries > 0) {
            // Try multiple query strategies
            let query;
            
            // If it's a valid MongoDB ObjectId, search by _id
            if (mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
                console.log(`🔍 Trying as MongoDB ObjectId: ${id}`);
                query = { _id: id };
            } 
            // If it's a number, search by numeric id
            else if (!isNaN(id)) {
                console.log(`🔍 Trying as numeric ID: ${parseInt(id)}`);
                query = { id: parseInt(id) };
            }
            // Try both
            else {
                console.log(`🔍 Trying both _id and numeric id`);
                query = {
                    $or: [
                        { _id: id },
                        { id: parseInt(id) || 0 }
                    ]
                };
            }
            
            lead = await Lead.findOne(query).read('primary');
            
            if (lead && lead.contract && lead.contract.html) {
                console.log(`✅ Contract found on attempt ${11 - retries}`);
                console.log(`✅ Lead _id: ${lead._id}`);
                console.log(`✅ Lead numeric id: ${lead.id}`);
                break; // Found it!
            }
            
            if (!lead) {
                console.log(`❌ Lead not found with query:`, query);
            } else if (!lead.contract) {
                console.log(`❌ Lead found but no contract object`);
            } else if (!lead.contract.html) {
                console.log(`❌ Lead found, has contract, but no HTML`);
            }
            
            if (retries > 1) {
                const waitTime = retries > 7 ? 2000 : 1500; // Longer wait for first attempts
                console.log(`⏳ Contract not ready yet, waiting ${waitTime}ms... (${retries - 1} retries left)`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
            retries--;
        }
        
        console.log('🔍 Lead found:', !!lead);
        console.log('🔍 Lead has contract:', !!lead?.contract);
        console.log('🔍 Lead has contract.html:', !!lead?.contract?.html);
        console.log('🔍 Contract HTML length:', lead?.contract?.html?.length || 0);
        
        if (!lead) {
            return res.status(404).json({ error: 'ליד לא נמצא' });
        }
        
        if (!lead.contract || !lead.contract.html) {
            return res.status(404).json({ error: 'חוזה לא נמצא. אנא צרי חוזה תחילה' });
        }
        
        res.json({
            htmlContent: lead.contract.html,
            status: lead.contract.status || 'pending'
        });
        
    } catch (error) {
        console.error('❌ Error loading contract:', error);
        res.status(500).json({ error: error.message });
    }
});

// Save digital signature
app.post('/api/sign-contract/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { signature } = req.body;
        
        console.log('✍️ Saving signature for lead:', id);
        
        if (!signature) {
            return res.status(400).json({ error: 'חתימה לא נמצאה' });
        }
        
        // Find lead
        let lead = await Lead.findOne({ 
            $or: [
                { _id: id },
                { id: parseInt(id) }
            ]
        });
        
        if (!lead) {
            return res.status(404).json({ error: 'ליד לא נמצא' });
        }
        
        if (!lead.contract || !lead.contract.html) {
            return res.status(404).json({ error: 'חוזה לא נמצא' });
        }
        
        // Add signature to contract HTML
        const signedHTML = addSignatureToContract(lead.contract.html, signature);
        
        // Update lead with signed contract
        lead.contract.html = signedHTML;
        lead.contract.status = 'signed';
        lead.contract.signedAt = new Date();
        lead.contract.signatureData = signature;
        lead.contractStatus = 'signed';
        
        await lead.save();
        
        console.log('✅ Contract signed successfully');
        
        res.json({
            success: true,
            message: 'החוזה נחתם בהצלחה',
            signedContractUrl: `/api/signed-contract/${lead._id}`
        });
        
    } catch (error) {
        console.error('❌ Error signing contract:', error);
        res.status(500).json({ error: error.message });
    }
});

// Helper function to add signature to contract HTML
function addSignatureToContract(html, signatureData) {
    // Remove any existing signature section first
    let cleanHTML = html.replace(/<div class="signature-section">[\s\S]*?<\/div>/g, '');
    
    // Add digital signature section at the end
    const signatureSection = `
<div class="signature-section" style="margin-top: 40px; padding: 30px; background: #f9fafb; border-radius: 12px;">
    <h3 style="font-weight: bold; margin-bottom: 20px; text-align: center;">✍️ חתימה דיגיטלית</h3>
    <div style="text-align: center;">
        <img src="${signatureData}" alt="חתימה דיגיטלית" style="max-width: 400px; border: 2px solid #ddd; border-radius: 8px; padding: 10px; background: white; display: inline-block;">
        <p style="margin-top: 15px; color: #666; font-size: 14px;">חתימה דיגיטלית - ${new Date().toLocaleDateString('he-IL')} ${new Date().toLocaleTimeString('he-IL')}</p>
    </div>
</div>
`;
    
    return cleanHTML + signatureSection;
}

// Get signed contract HTML
app.get('/api/signed-contract/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        let lead = await Lead.findOne({ 
            $or: [
                { _id: id },
                { id: parseInt(id) }
            ]
        });
        
        if (!lead || !lead.contract || !lead.contract.html) {
            return res.status(404).send('<h1>חוזה לא נמצא</h1>');
        }
        
        // Wrap in HTML document for viewing/printing
        const fullHTML = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>חוזה חתום</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.8;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            background: #f5f5f5;
        }
        @media print {
            body { background: white; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <button onclick="window.print()" class="no-print" style="background: #667eea; color: white; padding: 15px 30px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; margin-bottom: 20px; display: block; margin-left: auto; margin-right: auto;">🖨️ הדפס חוזה</button>
    <div style="background: white; padding: 60px; box-shadow: 0 0 20px rgba(0,0,0,0.1); border-radius: 12px;">
        ${lead.contract.html}
    </div>
</body>
</html>
        `;
        
        res.send(fullHTML);
        
    } catch (error) {
        console.error('Error loading signed contract:', error);
        res.status(500).send('<h1>שגיאה בטעינת החוזה</h1>');
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
