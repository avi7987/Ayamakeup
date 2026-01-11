/**
 * Cleanup Script - מחיקת נתונים ישנים ללא userId
 * 
 * סקריפט זה מוחק את כל הנתונים שלא משוייכים למשתמש מסוים.
 * הרץ רק פעם אחת לאחר שהמערכת עברה לעבוד עם authentication.
 * 
 * שימוש: node cleanup-old-data.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ ERROR: MONGODB_URI is not defined in .env file');
    process.exit(1);
}

// Connect to MongoDB
async function connectDB() {
    try {
        console.log('🔄 Connecting to MongoDB Atlas...');
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ Connected successfully!\n');
    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    }
}

// Define Schemas (matching server-auth.js)
const clientSchema = new mongoose.Schema({
    userId: String,
    userEmail: String,
    id: Number,
    name: String,
    amount: Number,
    date: String,
    service: String,
    paymentMethod: String,
    isBride: Boolean,
    month: String,
    createdAt: Date
});

const leadSchema = new mongoose.Schema({
    userId: String,
    userEmail: String,
    id: Number,
    name: String,
    phone: String,
    lastName: String,
    source: String,
    service: String,
    eventDate: String,
    location: String,
    isBride: Boolean,
    status: String,
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
    depositIncomeRecorded: Boolean,
    eventPaymentIncomeRecorded: Boolean,
    contractFileUrl: String,
    createdAt: Date,
    updatedAt: Date
});

const Client = mongoose.model('Client', clientSchema);
const Lead = mongoose.model('Lead', leadSchema);

// Main cleanup function
async function cleanupOldData() {
    try {
        console.log('='.repeat(50));
        console.log('🧹 CLEANUP OLD DATA - מחיקת נתונים ישנים');
        console.log('='.repeat(50));
        console.log();
        
        // Count documents without userId
        const clientsWithoutUser = await Client.countDocuments({ 
            $or: [
                { userId: { $exists: false } },
                { userId: null },
                { userId: '' }
            ]
        });
        
        const leadsWithoutUser = await Lead.countDocuments({ 
            $or: [
                { userId: { $exists: false } },
                { userId: null },
                { userId: '' }
            ]
        });
        
        console.log(`📊 נמצאו ${clientsWithoutUser} לקוחות/הכנסות ללא משתמש`);
        console.log(`📊 נמצאו ${leadsWithoutUser} לידים ללא משתמש`);
        console.log();
        
        if (clientsWithoutUser === 0 && leadsWithoutUser === 0) {
            console.log('✅ אין נתונים למחיקה. המערכת נקייה!');
            return;
        }
        
        // Ask for confirmation
        console.log('⚠️  פעולה זו תמחק את כל הנתונים שלא משוייכים למשתמש!');
        console.log('⚠️  זו פעולה בלתי הפיכה!');
        console.log();
        console.log('💡 אם אתה רוצה לשמר נתונים אלה, בטל עכשיו והרץ את המערכת');
        console.log('   עם fallback mode כדי לשייך אותם למשתמש מסוים.');
        console.log();
        
        // In production, you'd want to add readline confirmation here
        // For now, we'll add a simple timeout
        console.log('🔄 ממשיך במחיקה בעוד 10 שניות...');
        console.log('   (לחץ Ctrl+C כדי לבטל)');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        console.log();
        console.log('🗑️  מוחק נתונים...');
        console.log();
        
        // Delete clients without userId
        const clientsResult = await Client.deleteMany({ 
            $or: [
                { userId: { $exists: false } },
                { userId: null },
                { userId: '' }
            ]
        });
        
        // Delete leads without userId
        const leadsResult = await Lead.deleteMany({ 
            $or: [
                { userId: { $exists: false } },
                { userId: null },
                { userId: '' }
            ]
        });
        
        console.log('✅ מחיקה הושלמה!');
        console.log(`   🗑️  נמחקו ${clientsResult.deletedCount} לקוחות/הכנסות`);
        console.log(`   🗑️  נמחקו ${leadsResult.deletedCount} לידים`);
        console.log();
        console.log('='.repeat(50));
        console.log('✅ המערכת מוכנה לעבודה עם authentication מלא!');
        console.log('='.repeat(50));
        
    } catch (error) {
        console.error('❌ שגיאה במחיקת נתונים:', error.message);
        throw error;
    }
}

// Run the script
async function main() {
    await connectDB();
    await cleanupOldData();
    await mongoose.connection.close();
    console.log('\n👋 סגירת חיבור למסד הנתונים');
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Script failed:', err);
    process.exit(1);
});
