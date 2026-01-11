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
app.use(express.static(path.join(__dirname)));

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
        console.log('נ” Testing connection with URI:', MONGODB_URI.replace(/:[^:@]+@/, ':****@'));
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 30000, // 30 seconds timeout
            socketTimeoutMS: 45000,
        });
        console.log('ג… Connected to MongoDB Atlas successfully!');
        console.log(`נ“¦ Database: ${mongoose.connection.name}`);
    } catch (err) {
        console.error('ג MongoDB connection error:');
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        console.error('Full error:', err);
        console.error('\nנ’¡ Check:');
        console.error('   1. MongoDB URI is correct in .env');
        console.error('   2. IP address is whitelisted (0.0.0.0/0 for all)');
        console.error('   3. Database user has correct permissions');
        console.error('   4. Password is correct (no special characters need encoding)');
        setTimeout(() => process.exit(1), 1000); // Wait for logs to print
    }
}

// Define Schemas
const clientSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: String, required: true },
    service: String,
    paymentMethod: String,
    isBride: { type: Boolean, default: false },
    month: String,
    createdAt: { type: Date, default: Date.now }
});

const leadSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    source: String,
    service: String,
    eventDate: String,
    location: String,
    isBride: { type: Boolean, default: false },
    status: { type: String, default: 'new' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Client = mongoose.model('Client', clientSchema);
const Lead = mongoose.model('Lead', leadSchema);

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

// Get clients by month
app.get('/api/clients/month/:month', async (req, res) => {
    try {
        const { month } = req.params;
        const query = month === 'ALL' ? {} : { month };
        const clients = await Client.find(query).sort({ date: -1 });
        res.json(clients);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add new client/income
app.post('/api/clients', async (req, res) => {
    try {
        const clientData = {
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
        
        res.json({
            success: true,
            id: client.id,
            message: 'Client added successfully'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update client
app.put('/api/clients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Client.updateOne(
            { id: parseInt(id) },
            {
                name: req.body.name,
                amount: req.body.amount,
                date: req.body.date,
                service: req.body.service || null,
                isBride: Boolean(req.body.isBride),
                month: req.body.month
            }
        );
        res.json({ success: true, message: 'Client updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete client
app.delete('/api/clients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Client.deleteOne({ id: parseInt(id) });
        res.json({ success: true, message: 'Client deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bulk delete clients
app.post('/api/clients/bulk-delete', async (req, res) => {
    try {
        const { ids } = req.body;
        await Client.deleteMany({ id: { $in: ids } });
        res.json({ success: true, message: `${ids.length} clients deleted successfully` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== LEADS ROUTES ====================

// Get all leads
app.get('/api/leads', async (req, res) => {
    try {
        const leads = await Lead.find().sort({ createdAt: -1 });
        res.json(leads);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get leads by status
app.get('/api/leads/status/:status', async (req, res) => {
    try {
        const { status } = req.params;
        const leads = await Lead.find({ status }).sort({ createdAt: -1 });
        res.json(leads);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add new lead
app.post('/api/leads', async (req, res) => {
    try {
        const leadData = {
            id: req.body.id,
            name: req.body.name,
            phone: req.body.phone,
            source: req.body.source || null,
            service: req.body.service || null,
            eventDate: req.body.eventDate || null,
            location: req.body.location || null,
            isBride: Boolean(req.body.isBride),
            status: req.body.status || 'new'
        };
        
        const lead = new Lead(leadData);
        await lead.save();
        
        res.json({
            success: true,
            id: lead.id,
            message: 'Lead added successfully'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update lead status
app.patch('/api/leads/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        await Lead.updateOne(
            { id: parseInt(id) },
            { status, updatedAt: new Date() }
        );
        
        res.json({ success: true, message: 'Lead status updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update lead
app.put('/api/leads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Lead.updateOne(
            { id: parseInt(id) },
            {
                name: req.body.name,
                phone: req.body.phone,
                source: req.body.source || null,
                service: req.body.service || null,
                eventDate: req.body.eventDate || null,
                location: req.body.location || null,
                isBride: Boolean(req.body.isBride),
                status: req.body.status || 'new',
                updatedAt: new Date()
            }
        );
        res.json({ success: true, message: 'Lead updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete lead
app.delete('/api/leads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Lead.deleteOne({ id: parseInt(id) });
        res.json({ success: true, message: 'Lead deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== STATISTICS ROUTES ====================

// Get statistics summary
app.get('/api/stats/summary', async (req, res) => {
    try {
        const { month } = req.query;
        const query = month && month !== 'ALL' ? { month } : {};
        
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

// Get monthly breakdown
app.get('/api/stats/monthly', async (req, res) => {
    try {
        const monthlyData = await Client.aggregate([
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

// ==================== MIGRATION ROUTE ====================
app.post('/api/migrate', async (req, res) => {
    try {
        const { clients, leads } = req.body;
        
        // Clear existing data
        await Client.deleteMany({});
        await Lead.deleteMany({});
        
        // Insert clients
        if (clients && clients.length > 0) {
            await Client.insertMany(clients.map(c => ({
                id: c.id,
                name: c.name,
                amount: c.amount,
                date: c.date,
                service: c.service || null,
                paymentMethod: c.paymentMethod || '׳׳–׳•׳׳',
                isBride: Boolean(c.isBride),
                month: c.month
            })));
        }
        
        // Insert leads
        if (leads && leads.length > 0) {
            await Lead.insertMany(leads.map(l => ({
                id: l.id,
                name: l.name,
                phone: l.phone,
                source: l.source || null,
                service: l.service || null,
                eventDate: l.eventDate || null,
                location: l.location || null,
                isBride: Boolean(l.isBride),
                status: l.status || 'new'
            })));
        }
        
        res.json({
            success: true,
            message: `Migrated ${clients?.length || 0} clients and ${leads?.length || 0} leads successfully`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start Server - only after DB connection
async function startServer() {
    await connectDB(); // Wait for DB connection first
    
    app.listen(PORT, () => {
        console.log('');
        console.log('נ€ ========================================');
        console.log(`   CRM Server is running in CLOUD MODE!`);
        console.log('נ€ ========================================');
        console.log(`נ“ Server: http://localhost:${PORT}`);
        console.log(`נ“ Database: MongoDB Atlas (Cloud)`);
        console.log(`ג¨ API: http://localhost:${PORT}/api`);
        console.log(`נ Open: http://localhost:${PORT}/index_new.html`);
        console.log('========================================');
        console.log('');
    });
}

// Start the server
startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nשולג Shutting down server...');
    await mongoose.connection.close();
    process.exit(0);
});

// Initialize Express App
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

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
        console.log('נ” Testing connection with URI:', MONGODB_URI.replace(/:[^:@]+@/, ':****@'));
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 30000, // 30 seconds timeout
            socketTimeoutMS: 45000,
        });
        console.log('ג… Connected to MongoDB Atlas successfully!');
        console.log(`נ“¦ Database: ${mongoose.connection.name}`);
    } catch (err) {
        console.error('ג MongoDB connection error:');
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        console.error('Full error:', err);
        console.error('\nנ’¡ Check:');
        console.error('   1. MongoDB URI is correct in .env');
        console.error('   2. IP address is whitelisted (0.0.0.0/0 for all)');
        console.error('   3. Database user has correct permissions');
        console.error('   4. Password is correct (no special characters need encoding)');
        setTimeout(() => process.exit(1), 1000); // Wait for logs to print
    }
}

// Define Schemas
const clientSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: String, required: true },
    service: String,
    paymentMethod: String,
    isBride: { type: Boolean, default: false },
    month: String,
    createdAt: { type: Date, default: Date.now }
});

const leadSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    source: String,
    service: String,
    eventDate: String,
    location: String,
    isBride: { type: Boolean, default: false },
    status: { type: String, default: 'new' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Client = mongoose.model('Client', clientSchema);
const Lead = mongoose.model('Lead', leadSchema);

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

// Get clients by month
app.get('/api/clients/month/:month', async (req, res) => {
    try {
        const { month } = req.params;
        const query = month === 'ALL' ? {} : { month };
        const clients = await Client.find(query).sort({ date: -1 });
        res.json(clients);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add new client/income
app.post('/api/clients', async (req, res) => {
    try {
        const clientData = {
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
        
        res.json({
            success: true,
            id: client.id,
            message: 'Client added successfully'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update client
app.put('/api/clients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Client.updateOne(
            { id: parseInt(id) },
            {
                name: req.body.name,
                amount: req.body.amount,
                date: req.body.date,
                service: req.body.service || null,
                isBride: Boolean(req.body.isBride),
                month: req.body.month
            }
        );
        res.json({ success: true, message: 'Client updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete client
app.delete('/api/clients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Client.deleteOne({ id: parseInt(id) });
        res.json({ success: true, message: 'Client deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bulk delete clients
app.post('/api/clients/bulk-delete', async (req, res) => {
    try {
        const { ids } = req.body;
        await Client.deleteMany({ id: { $in: ids } });
        res.json({ success: true, message: `${ids.length} clients deleted successfully` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== LEADS ROUTES ====================

// Get all leads
app.get('/api/leads', async (req, res) => {
    try {
        const leads = await Lead.find().sort({ createdAt: -1 });
        res.json(leads);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get leads by status
app.get('/api/leads/status/:status', async (req, res) => {
    try {
        const { status } = req.params;
        const leads = await Lead.find({ status }).sort({ createdAt: -1 });
        res.json(leads);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add new lead
app.post('/api/leads', async (req, res) => {
    try {
        const leadData = {
            id: req.body.id,
            name: req.body.name,
            phone: req.body.phone,
            source: req.body.source || null,
            service: req.body.service || null,
            eventDate: req.body.eventDate || null,
            location: req.body.location || null,
            isBride: Boolean(req.body.isBride),
            status: req.body.status || 'new'
        };
        
        const lead = new Lead(leadData);
        await lead.save();
        
        res.json({
            success: true,
            id: lead.id,
            message: 'Lead added successfully'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update lead status
app.patch('/api/leads/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        await Lead.updateOne(
            { id: parseInt(id) },
            { status, updatedAt: new Date() }
        );
        
        res.json({ success: true, message: 'Lead status updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update lead
app.put('/api/leads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Lead.updateOne(
            { id: parseInt(id) },
            {
                name: req.body.name,
                phone: req.body.phone,
                source: req.body.source || null,
                service: req.body.service || null,
                eventDate: req.body.eventDate || null,
                location: req.body.location || null,
                isBride: Boolean(req.body.isBride),
                status: req.body.status || 'new',
                updatedAt: new Date()
            }
        );
        res.json({ success: true, message: 'Lead updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete lead
app.delete('/api/leads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Lead.deleteOne({ id: parseInt(id) });
        res.json({ success: true, message: 'Lead deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== STATISTICS ROUTES ====================

// Get statistics summary
app.get('/api/stats/summary', async (req, res) => {
    try {
        const { month } = req.query;
        const query = month && month !== 'ALL' ? { month } : {};
        
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

// Get monthly breakdown
app.get('/api/stats/monthly', async (req, res) => {
    try {
        const monthlyData = await Client.aggregate([
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

// ==================== MIGRATION ROUTE ====================
app.post('/api/migrate', async (req, res) => {
    try {
        const { clients, leads } = req.body;
        
        // Clear existing data
        await Client.deleteMany({});
        await Lead.deleteMany({});
        
        // Insert clients
        if (clients && clients.length > 0) {
            await Client.insertMany(clients.map(c => ({
                id: c.id,
                name: c.name,
                amount: c.amount,
                date: c.date,
                service: c.service || null,
                paymentMethod: c.paymentMethod || '׳׳–׳•׳׳',
                isBride: Boolean(c.isBride),
                month: c.month
            })));
        }
        
        // Insert leads
        if (leads && leads.length > 0) {
            await Lead.insertMany(leads.map(l => ({
                id: l.id,
                name: l.name,
                phone: l.phone,
                source: l.source || null,
                service: l.service || null,
                eventDate: l.eventDate || null,
                location: l.location || null,
                isBride: Boolean(l.isBride),
                status: l.status || 'new'
            })));
        }
        
        res.json({
            success: true,
            message: `Migrated ${clients?.length || 0} clients and ${leads?.length || 0} leads successfully`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start Server - only after DB connection
async function startServer() {
    await connectDB(); // Wait for DB connection first
    
    app.listen(PORT, () => {
        console.log('');
        console.log('נ€ ========================================');
        console.log(`   CRM Server is running in CLOUD MODE!`);
        console.log('נ€ ========================================');
        console.log(`נ“ Server: http://localhost:${PORT}`);
        console.log(`נ“ Database: MongoDB Atlas (Cloud)`);
        console.log(`ג¨ API: http://localhost:${PORT}/api`);
        console.log(`נ Open: http://localhost:${PORT}/index_new.html`);
        console.log('========================================');
        console.log('');
    });
}

// Start the server
startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nנ‘‹ Shutting down server...');
    await mongoose.connection.close();
    process.exit(0);
});

