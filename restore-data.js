const https = require('https');
const fs = require('fs');

const RAILWAY_API = 'lunabusiness.up.railway.app';

console.log('🔄 מושך נתונים מ-Railway...');

function fetchData(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: RAILWAY_API,
            path: `/api/${path}`,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        https.get(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error('Failed to parse response'));
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function restoreData() {
    try {
        console.log('📥 מושך הכנסות (clients)...');
        const clients = await fetchData('clients');
        console.log(`✅ נמצאו ${clients.length} הכנסות`);

        console.log('📥 מושך לידים (leads)...');
        const leads = await fetchData('leads');
        console.log(`✅ נמצאו ${leads.length} לידים`);

        const dbData = {
            clients: clients,
            leads: leads
        };

        console.log('💾 שומר ל-db.json...');
        fs.writeFileSync('db.json', JSON.stringify(dbData, null, 2));

        console.log('\n✅ ההנתונים שוחזרו בהצלחה!');
        console.log(`   📊 סה"כ ${clients.length} הכנסות`);
        console.log(`   👥 סה"כ ${leads.length} לידים`);
        console.log('\n🚀 עכשיו אפשר להריץ: node server.js');

    } catch (error) {
        console.error('❌ שגיאה:', error.message);
        console.error('\n💡 ייתכן שהנתונים לא נמצאו ב-Railway.');
        console.error('   נסה לגשת ל: https://lunabusiness.up.railway.app');
        process.exit(1);
    }
}

restoreData();
