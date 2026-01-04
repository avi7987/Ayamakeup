/**
 * Script to assign all existing data to the first user who logs in
 * Run this ONCE after the first Google login
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ ERROR: MONGODB_URI not found in environment variables');
    process.exit(1);
}

// Schemas
const userSchema = new mongoose.Schema({
    googleId: String,
    email: String,
    name: String,
    picture: String,
    accessToken: String,
    refreshToken: String,
    tokenExpiry: Date,
    createdAt: Date,
    lastLogin: Date
});

const clientSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.Mixed,
    name: String,
    phone: String,
    service: String,
    price: Number,
    date: Date,
    notes: String,
    createdAt: Date
});

const leadSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.Mixed,
    name: String,
    lastName: String,
    phone: String,
    eventDate: Date,
    status: String,
    source: String,
    notes: String,
    price: Number,
    deposit: Number,
    proposedPrice: Number,
    isBride: Boolean,
    contractStatus: String,
    reminders: Array,
    stageHistory: Array,
    calendarEventId: String,
    createdAt: Date
});

const User = mongoose.model('User', userSchema);
const Client = mongoose.model('Client', clientSchema);
const Lead = mongoose.model('Lead', leadSchema);

async function assignDataToFirstUser() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find the first user (the one who logged in)
        const firstUser = await User.findOne().sort({ createdAt: 1 });
        
        if (!firstUser) {
            console.log('⚠️  No users found. Please log in first via Google OAuth.');
            process.exit(1);
        }

        console.log(`\n👤 First user found: ${firstUser.email} (${firstUser.name})`);
        console.log(`   User ID: ${firstUser._id}`);

        // Find all clients without userId
        const clientsWithoutUser = await Client.find({
            $or: [
                { userId: { $exists: false } },
                { userId: null },
                { userId: '' }
            ]
        });

        // Find all leads without userId
        const leadsWithoutUser = await Lead.find({
            $or: [
                { userId: { $exists: false } },
                { userId: null },
                { userId: '' }
            ]
        });

        console.log(`\n📊 Found data without user:`);
        console.log(`   Clients: ${clientsWithoutUser.length}`);
        console.log(`   Leads: ${leadsWithoutUser.length}`);

        if (clientsWithoutUser.length === 0 && leadsWithoutUser.length === 0) {
            console.log('\n✅ All data is already assigned to users!');
            process.exit(0);
        }

        // Update clients
        if (clientsWithoutUser.length > 0) {
            const clientResult = await Client.updateMany(
                {
                    $or: [
                        { userId: { $exists: false } },
                        { userId: null },
                        { userId: '' }
                    ]
                },
                { $set: { userId: firstUser._id } }
            );
            console.log(`\n✅ Updated ${clientResult.modifiedCount} clients with userId`);
        }

        // Update leads
        if (leadsWithoutUser.length > 0) {
            const leadResult = await Lead.updateMany(
                {
                    $or: [
                        { userId: { $exists: false } },
                        { userId: null },
                        { userId: '' }
                    ]
                },
                { $set: { userId: firstUser._id } }
            );
            console.log(`✅ Updated ${leadResult.modifiedCount} leads with userId`);
        }

        // Verify the update
        const totalClients = await Client.countDocuments({ userId: firstUser._id });
        const totalLeads = await Lead.countDocuments({ userId: firstUser._id });

        console.log(`\n🎉 Success! Data assigned to ${firstUser.email}:`);
        console.log(`   Total clients: ${totalClients}`);
        console.log(`   Total leads: ${totalLeads}`);
        console.log('\n✅ You can now log in and see all your data!');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the script
assignDataToFirstUser();
