require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');

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
        console.log('ג… Connected to MongoDB Atlas successfully!');
    } catch (error) {
        console.error('ג MongoDB connection error:', error);
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
    phone: { type: String, required: true },
    service: { type: String, required: true },
    status: { type: String, default: '׳׳׳×׳™׳' },
    contactDate: { type: Date, default: Date.now },
    notes: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

const Client = mongoose.model('Client', clientSchema);
const Lead = mongoose.model('Lead', leadSchema);

// ==================== STATIC FILES ====================
// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

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

// ==================== START SERVER ====================

async function startServer() {
    try {
        await connectDB();
        
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
