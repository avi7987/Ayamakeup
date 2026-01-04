const https = require('https');
const fs = require('fs');

const RAILWAY_API = 'lunabusiness.up.railway.app';

console.log('🚀 מעלה נתונים ל-Railway...');

// Read local db.json
const dbData = JSON.parse(fs.readFileSync('db.json', 'utf8'));
console.log(`📊 נמצאו ${dbData.clients.length} הכנסות ו-${dbData.leads.length} לידים`);

function postData(path, data) {
    return new Promise((resolve, reject) => {
        const jsonData = JSON.stringify(data);
        
        const options = {
            hostname: RAILWAY_API,
            path: `/api/${path}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': jsonData.length
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(responseData);
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.write(jsonData);
        req.end();
    });
}

async function uploadData() {
    try {
        console.log('\n📤 מעלה הכנסות...');
        let uploadedClients = 0;
        for (const client of dbData.clients) {
            try {
                await postData('clients', client);
                uploadedClients++;
                process.stdout.write(`\r   ✅ הועלו ${uploadedClients}/${dbData.clients.length} הכנסות`);
            } catch (err) {
                console.error(`\n   ⚠️  שגיאה בהעלאת הכנסה ${client.id}:`, err.message);
            }
        }
        console.log('\n✅ כל ההכנסות הועלו!');

        console.log('\n📤 מעלה לידים...');
        let uploadedLeads = 0;
        for (const lead of dbData.leads) {
            try {
                await postData('leads', lead);
                uploadedLeads++;
                process.stdout.write(`\r   ✅ הועלו ${uploadedLeads}/${dbData.leads.length} לידים`);
            } catch (err) {
                console.error(`\n   ⚠️  שגיאה בהעלאת ליד ${lead._id || lead.id}:`, err.message);
            }
        }
        console.log('\n✅ כל הלידים הועלו!');

        console.log('\n🎉 ההעלאה ל-Railway הושלמה בהצלחה!');
        console.log(`   📊 ${uploadedClients} הכנסות`);
        console.log(`   👥 ${uploadedLeads} לידים`);
        console.log('\n🌐 גש ל: https://lunabusiness.up.railway.app');

    } catch (error) {
        console.error('❌ שגיאה כללית:', error.message);
        process.exit(1);
    }
}

uploadData();
