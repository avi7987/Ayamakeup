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

// Initialize Express App
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
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
const clientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: false },
    service: { type: String, required: true },
    price: { type: Number, required: true },
    date: { type: Date, required: true },
    notes: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

const leadSchema = new mongoose.Schema({
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
    userId: { type: String, default: 'default' }, // For future multi-user support
    year: { type: Number, required: true },
    income: { type: Number, default: 0 },
    brides: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now }
});

// Contract Template Schema - stores the custom HTML template
const contractTemplateSchema = new mongoose.Schema({
    userId: { type: String, default: 'default' },
    templateHTML: { type: String, required: true },
    logoUrl: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

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

// ==================== STATIC FILES ====================
// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));
// Serve generated contracts
app.use('/contracts', express.static(path.join(__dirname, 'contracts')));

// Serve index.html for root path with no-cache headers
app.get('/', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve contract signing page
app.get('/contract-sign/:leadId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contract-sign.html'));
});

// ==================== API ROUTES ====================

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
app.get('/api/clients', async (req, res) => {
    try {
        const clients = await Client.find().sort({ date: -1 });
        res.json(clients);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single client
app.get('/api/clients/:id', async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);
        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }
        res.json(client);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new client
app.post('/api/clients', async (req, res) => {
    try {
        const client = new Client(req.body);
        await client.save();
        res.status(201).json(client);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update client
app.put('/api/clients/:id', async (req, res) => {
    try {
        const client = await Client.findByIdAndUpdate(
            req.params.id,
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

// Delete client
app.delete('/api/clients/:id', async (req, res) => {
    try {
        const client = await Client.findByIdAndDelete(req.params.id);
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
app.get('/api/leads', async (req, res) => {
    try {
        const leads = await Lead.find().sort({ contactDate: -1 });
        res.json(leads);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single lead
app.get('/api/leads/:id', async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        res.json(lead);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new lead
app.post('/api/leads', async (req, res) => {
    try {
        const lead = new Lead(req.body);
        await lead.save();
        res.status(201).json(lead);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update lead
app.put('/api/leads/:id', async (req, res) => {
    try {
        const lead = await Lead.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        res.json(lead);
    } catch (error) {
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
app.delete('/api/leads/:id', async (req, res) => {
    try {
        const lead = await Lead.findByIdAndDelete(req.params.id);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        res.json({ message: 'Lead deleted successfully' });
    } catch (error) {
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
app.get('/api/stats', async (req, res) => {
    try {
        const clients = await Client.find();
        const leads = await Lead.find();

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
app.get('/api/stats/monthly', async (req, res) => {
    try {
        const clients = await Client.find();
        
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
app.get('/api/goals', async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        let goals = await Goals.findOne({ userId: 'default', year: currentYear });
        
        if (!goals) {
            // Create default goals if not exists
            goals = await Goals.create({
                userId: 'default',
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
app.put('/api/goals', async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const { income, brides } = req.body;
        
        let goals = await Goals.findOne({ userId: 'default', year: currentYear });
        
        if (goals) {
            goals.income = income;
            goals.brides = brides;
            goals.updatedAt = new Date();
            await goals.save();
        } else {
            goals = await Goals.create({
                userId: 'default',
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
app.get('/api/contract-template-html', async (req, res) => {
    try {
        let template = await ContractTemplate.findOne({ userId: 'default' });
        
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
                userId: 'default',
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
app.post('/api/contract-template-html', async (req, res) => {
    try {
        const { templateHTML } = req.body;
        
        let template = await ContractTemplate.findOne({ userId: 'default' });
        
        if (template) {
            template.templateHTML = templateHTML;
            template.updatedAt = new Date();
            await template.save();
        } else {
            template = await ContractTemplate.create({
                userId: 'default',
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
app.post('/api/upload-logo', upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const logoUrl = `/uploads/${req.file.filename}`;
        
        let template = await ContractTemplate.findOne({ userId: 'default' });
        
        if (template) {
            template.logoUrl = logoUrl;
            template.updatedAt = new Date();
            await template.save();
        } else {
            template = await ContractTemplate.create({
                userId: 'default',
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
app.post('/api/contract-template', upload.single('template'), async (req, res) => {
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

        // Load custom template
        const customTemplate = await ContractTemplate.findOne({ userId: 'default' });
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

        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--disable-extensions'
            ]
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

        // Update lead with signed contract URL
        lead.signedContractUrl = `/contracts/${signedFilename}`;
        await lead.save();

        res.json({
            success: true,
            message: 'החתימה נשמרה והחוזה החתום נוצר בהצלחה',
            signedAt: lead.customerSignedAt,
            signedContractUrl: lead.signedContractUrl
        });
    } catch (error) {
        console.error('❌ Error saving signature:', error);
        res.status(500).json({ error: error.message });
    }
});

// Generate contract from lead data
app.post('/api/generate-contract/:leadId', async (req, res) => {
    try {
        console.log('📄 Generating contract for lead:', req.params.leadId);
        
        const lead = await Lead.findById(req.params.leadId);
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
        let customTemplate = await ContractTemplate.findOne({ userId: 'default' });
        
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
        
        const browser = await puppeteer.launch({
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
            executablePath: chromiumPath
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
