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

// Connect to MongoDB
async function connectDB() {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB Atlas successfully!');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

// MongoDB Schemas
const clientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
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
    price: { type: Number, default: 0 },
    deposit: { type: Number, default: 0 },
    contractStatus: { type: String, default: 'pending' }, // pending, sent, signed
    // Contract-related fields
    escortType: { type: String, default: 'none' }, // none, short, long
    escortPrice: { type: Number, default: 0 },
    bridesmaids: [{ 
        service: String,
        price: Number
    }],
    contractFileUrl: { type: String, default: '' },
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

const Client = mongoose.model('Client', clientSchema);
const Lead = mongoose.model('Lead', leadSchema);
const Goals = mongoose.model('Goals', goalsSchema);

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

        // Read the contract template
        const templatePath = path.join(__dirname, 'uploads', 'contract-template.docx');
        
        try {
            await fs.access(templatePath);
        } catch {
            return res.status(404).json({ error: 'תבנית חוזה לא נמצאה. יש להעלות תבנית קודם.' });
        }

        const content = await fs.readFile(templatePath, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        // Prepare data for template
        const fullName = `${lead.name} ${lead.lastName || ''}`.trim();
        const price = lead.price || 0;
        const deposit = lead.deposit || 0;
        
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
        
        const templateData = {
            name: lead.name || '',
            lastName: lead.lastName || '',
            fullName: fullName,
            phone: lead.phone || '',
            service: lead.service || '',
            eventDate: lead.eventDate || '',
            location: lead.location || '',
            price: price,
            deposit: deposit,
            balance: balance,
            totalPrice: totalPrice,
            escortType: lead.escortType || 'none',
            escortTypeHebrew: escortTypeHebrew[lead.escortType || 'none'],
            escortPrice: lead.escortPrice || 0,
            bridesmaids: lead.bridesmaids || [],
            bridesmaidsCount: lead.bridesmaids?.length || 0,
            date: new Date().toLocaleDateString('he-IL'),
        };

        // Render the document
        doc.render(templateData);

        // Get the filled document as buffer
        const buf = doc.getZip().generate({ type: 'nodebuffer' });

        // Save the filled Word document
        const contractsDir = path.join(__dirname, 'contracts');
        await fs.mkdir(contractsDir, { recursive: true });
        
        const wordFilename = `contract-${lead._id}.docx`;
        const wordPath = path.join(contractsDir, wordFilename);
        await fs.writeFile(wordPath, buf);

        // Convert to PDF using Puppeteer
        const pdfFilename = `contract-${lead._id}.pdf`;
        const pdfPath = path.join(contractsDir, pdfFilename);

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

        // Create HTML from Word content for PDF conversion
        const htmlContent = `
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
                .contract-header {
                    text-align: center;
                    margin-bottom: 40px;
                    border-bottom: 2px solid #333;
                    padding-bottom: 20px;
                }
                .contract-title {
                    font-size: 28px;
                    font-weight: bold;
                    margin-bottom: 10px;
                }
                .contract-section {
                    margin-bottom: 25px;
                }
                .section-title {
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 15px;
                    color: #333;
                    border-bottom: 1px solid #ccc;
                    padding-bottom: 5px;
                }
                .field-label {
                    font-weight: bold;
                    display: inline-block;
                    width: 150px;
                }
                .services-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }
                .services-table th {
                    background-color: #f5f5f5;
                    border: 1px solid #333;
                    padding: 12px;
                    text-align: center;
                    font-weight: bold;
                }
                .services-table td {
                    border: 1px solid #333;
                    padding: 10px;
                    text-align: center;
                }
                .services-table td:first-child {
                    text-align: right;
                }
                .financial-summary {
                    background-color: #f9f9f9;
                    padding: 20px;
                    border: 2px solid #333;
                    border-radius: 5px;
                    margin-top: 20px;
                }
                .financial-summary .summary-line {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #ddd;
                }
                .financial-summary .summary-line:last-child {
                    border-bottom: none;
                    font-weight: bold;
                    font-size: 16px;
                    padding-top: 15px;
                }
                .signature-section {
                    margin-top: 60px;
                    display: flex;
                    justify-content: space-between;
                }
                .signature-box {
                    text-align: center;
                    width: 40%;
                }
                .signature-line {
                    margin-top: 40px;
                    border-top: 1px solid #333;
                    padding-top: 5px;
                }
            </style>
        </head>
        <body>
            <div class="contract-header">
                <div class="contract-title">חוזה מתן שירותים</div>
                <div>תאריך: ${templateData.date}</div>
            </div>
            
            <div class="contract-section">
                <div class="section-title">פרטי הלקוח/ה</div>
                <div><span class="field-label">שם מלא:</span> ${fullName}</div>
                <div><span class="field-label">טלפון:</span> ${templateData.phone}</div>
            </div>
            
            <div class="contract-section">
                <div class="section-title">פרטי האירוע</div>
                <div><span class="field-label">סוג האירוע:</span> ${templateData.service}</div>
                <div><span class="field-label">תאריך האירוע:</span> ${templateData.eventDate}</div>
                <div><span class="field-label">מיקום האירוע:</span> ${templateData.location}</div>
            </div>
            
            <div class="contract-section">
                <div class="section-title">פירוט השירותים והעלויות</div>
                <table class="services-table">
                    <thead>
                        <tr>
                            <th>תיאור השירות</th>
                            <th>פרטים</th>
                            <th>מחיר (₪)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${templateData.service}</td>
                            <td>שירות עיקרי</td>
                            <td>${templateData.price.toLocaleString('he-IL')}</td>
                        </tr>
                        ${lead.escortType && lead.escortType !== 'none' ? `
                        <tr>
                            <td>ליווי לאירוע</td>
                            <td>${templateData.escortTypeHebrew}</td>
                            <td>${templateData.escortPrice.toLocaleString('he-IL')}</td>
                        </tr>
                        ` : ''}
                        ${bridesmaidsRowsHtml}
                    </tbody>
                </table>
                
                <div class="financial-summary">
                    <div class="summary-line">
                        <span>סה"כ עלות השירותים:</span>
                        <span><strong>${templateData.totalPrice.toLocaleString('he-IL')} ₪</strong></span>
                    </div>
                    <div class="summary-line">
                        <span>מקדמה ששולמה:</span>
                        <span><strong>${templateData.deposit.toLocaleString('he-IL')} ₪</strong></span>
                    </div>
                    <div class="summary-line">
                        <span>יתרה לתשלום ביום האירוע:</span>
                        <span><strong>${templateData.balance.toLocaleString('he-IL')} ₪</strong></span>
                    </div>
                </div>
            </div>
            
            <div class="signature-section">
                <div class="signature-box">
                    <div>חתימת הלקוח/ה</div>
                    <div class="signature-line">תאריך: ___________</div>
                </div>
                <div class="signature-box">
                    <div>חתימת נותן השירות</div>
                    <div class="signature-line">תאריך: ___________</div>
                </div>
            </div>
        </body>
        </html>
        `;

        // Launch puppeteer and generate PDF
        console.log('🚀 Launching Puppeteer...');
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath()
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
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
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
