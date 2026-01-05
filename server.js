const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

// Initialize Express App
const app = express();
const PORT = process.env.PORT || 3000;

// Database Setup (Lowdb - JSON file database)
const adapter = new FileSync('db.json');
const db = low(adapter);

// Set default database structure
db.defaults({ clients: [], leads: [], goals: {} }).write();

console.log('✅ Connected to JSON database (db.json)');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// ==================== AUTHENTICATION (FALLBACK MODE) ====================

// User endpoint - fallback mode for local development (returns authenticated)
app.get('/api/user', (req, res) => {
    res.json({
        isFallbackMode: true,
        isAuthenticated: true, // Changed to true so data loads
        user: {
            id: 'fallback-user',
            email: 'local@user.com',
            name: 'Local User',
            picture: ''
        }
    });
});

// ==================== API ROUTES ====================

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'CRM API is running', database: 'LowDB (JSON)' });
});

// ==================== CLIENTS/INCOME ROUTES ====================

// Get all clients
app.get('/api/clients', (req, res) => {
    try {
        const clients = db.get('clients').sortBy('date').reverse().value();
        res.json(clients);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get clients by month
app.get('/api/clients/month/:month', (req, res) => {
    try {
        const { month } = req.params;
        const clients = month === 'ALL'
            ? db.get('clients').sortBy('date').reverse().value()
            : db.get('clients').filter({ month }).sortBy('date').reverse().value();
        res.json(clients);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add new client/income
app.post('/api/clients', (req, res) => {
    try {
        const { id, name, amount, date, service, paymentMethod, isBride, month } = req.body;
        
        const newClient = {
            id,
            name,
            amount,
            date,
            service: service || null,
            paymentMethod,
            isBride: Boolean(isBride),
            month,
            createdAt: new Date().toISOString()
        };
        
        db.get('clients').push(newClient).write();
        
        res.json({
            success: true,
            id: id,
            message: 'Client added successfully'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update client
app.put('/api/clients/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { name, amount, date, service, isBride, month } = req.body;
        
        db.get('clients')
            .find({ id: parseInt(id) })
            .assign({
                name,
                amount,
                date,
                service: service || null,
                isBride: Boolean(isBride),
                month
            })
            .write();
        
        res.json({ success: true, message: 'Client updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bulk delete clients (must be before the :id route)
app.post('/api/clients/bulk-delete', (req, res) => {
    try {
        const { ids } = req.body;
        ids.forEach(id => {
            db.get('clients').remove({ id }).write();
        });
        res.json({ success: true, message: `${ids.length} clients deleted successfully` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete client
app.delete('/api/clients/:id', (req, res) => {
    try {
        const { id } = req.params;
        db.get('clients').remove({ id: parseInt(id) }).write();
        res.json({ success: true, message: 'Client deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== LEADS ROUTES ====================

// Get all leads
app.get('/api/leads', (req, res) => {
    try {
        const leads = db.get('leads').sortBy('createdAt').reverse().value();
        res.json(leads);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get leads by status
app.get('/api/leads/status/:status', (req, res) => {
    try {
        const { status } = req.params;
        const leads = db.get('leads').filter({ status }).sortBy('createdAt').reverse().value();
        res.json(leads);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add new lead
app.post('/api/leads', (req, res) => {
    try {
        const { id, name, phone, source, service, eventDate, location, isBride, status } = req.body;
        
        const newLead = {
            id,
            name,
            phone,
            source: source || null,
            service: service || null,
            eventDate: eventDate || null,
            location: location || null,
            isBride: Boolean(isBride),
            status: status || 'new',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        db.get('leads').push(newLead).write();
        
        res.json({
            success: true,
            id: id,
            message: 'Lead added successfully'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update lead status (for drag & drop)
app.patch('/api/leads/:id/status', (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        db.get('leads')
            .find({ id: parseInt(id) })
            .assign({
                status,
                updatedAt: new Date().toISOString()
            })
            .write();
        
        res.json({ success: true, message: 'Lead status updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update lead
app.put('/api/leads/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, source, service, eventDate, location, isBride, status } = req.body;
        
        db.get('leads')
            .find({ id: parseInt(id) })
            .assign({
                name,
                phone,
                source: source || null,
                service: service || null,
                eventDate: eventDate || null,
                location: location || null,
                isBride: Boolean(isBride),
                status: status || 'new',
                updatedAt: new Date().toISOString()
            })
            .write();
        
        res.json({ success: true, message: 'Lead updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete lead
app.delete('/api/leads/:id', (req, res) => {
    try {
        const { id } = req.params;
        db.get('leads').remove({ id: parseInt(id) }).write();
        res.json({ success: true, message: 'Lead deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== STATISTICS ROUTES ====================

// Get statistics summary
app.get('/api/stats/summary', (req, res) => {
    try {
        const { month } = req.query;
        
        const clients = month && month !== 'ALL'
            ? db.get('clients').filter({ month }).value()
            : db.get('clients').value();
        
        const totalIncome = clients.reduce((sum, client) => sum + client.amount, 0);
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
app.get('/api/stats/monthly', (req, res) => {
    try {
        const clients = db.get('clients').value();
        const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
        
        const monthlyData = months.map(month => {
            const monthClients = clients.filter(c => c.month === month);
            return {
                month,
                total: monthClients.reduce((sum, c) => sum + c.amount, 0),
                count: monthClients.length
            };
        }).filter(m => m.count > 0);
        
        res.json(monthlyData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== MIGRATION ROUTE ====================
// Import data from localStorage/Google Sheets backup
app.post('/api/migrate', (req, res) => {
    try {
        const { clients, leads } = req.body;
        
        // Clear existing data and set new data
        db.set('clients', clients || []).write();
        db.set('leads', leads || []).write();
        
        res.json({
            success: true,
            message: `Migrated ${clients?.length || 0} clients and ${leads?.length || 0} leads successfully`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== GOALS ROUTES ====================

// Get user goals
app.get('/api/goals/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        
        // Initialize goals structure if not exists
        if (!db.has('goals').value()) {
            db.set('goals', {}).write();
        }
        
        const userGoals = db.get('goals').get(userId).value() || [];
        res.json(userGoals);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Save user goals
app.post('/api/goals/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const goals = req.body;
        
        // Initialize goals structure if not exists
        if (!db.has('goals').value()) {
            db.set('goals', {}).write();
        }
        
        // Save goals for this user
        db.get('goals').set(userId, goals).write();
        
        res.json({
            success: true,
            message: 'Goals saved successfully',
            goalsCount: goals.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log('');
    console.log('🚀 ========================================');
    console.log(`   CRM Server is running!`);
    console.log('🚀 ========================================');
    console.log(`📍 Server: http://localhost:${PORT}`);
    console.log(`📊 Database: db.json (LowDB)`);
    console.log(`✨ API: http://localhost:${PORT}/api`);
    console.log(`🌐 Open: http://localhost:${PORT}/index_new.html`);
    console.log('========================================');
    console.log('');
    console.log('💡 Press CTRL+C to stop the server');
    console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down server...');
    process.exit(0);
});
