const twilio = require('twilio');
const fs = require('fs');
const path = require('path');

// Read existing .env.local to get credentials
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvValue = (key) => {
    const match = envContent.match(new RegExp(`${key}= ?(.*)`));
    return match ? match[1].trim() : null;
};

const accountSid = getEnvValue('TWILIO_SID') || getEnvValue('TWILIO_ACCOUNT_SID');
const authToken = getEnvValue('TWILIO_AUTH') || getEnvValue('TWILIO_AUTH_TOKEN');

if (!accountSid || !authToken) {
    console.error('Error: TWILIO_SID and TWILIO_AUTH must be in .env.local');
    process.exit(1);
}

const client = twilio(accountSid, authToken);

async function setup() {
    try {
        console.log('Generating API Key and Secret...');
        const newKey = await client.newKeys.create({ friendlyName: 'Dialer App Key' });

        console.log('Creating/Finding TwiML App...');
        // We'll create a new one to be safe
        const app = await client.applications.create({
            friendlyName: 'Dialer App',
            voiceUrl: 'http://example.com/api/voice', // PLACEHOLDER for validation.
        });

        console.log('\n--- NEW CONFIGURATION ---');
        console.log(`TWILIO_ACCOUNT_SID=${accountSid}`);
        console.log(`TWILIO_AUTH_TOKEN=${authToken}`);
        console.log(`TWILIO_API_KEY=${newKey.sid}`);
        console.log(`TWILIO_API_SECRET=${newKey.secret}`);
        console.log(`TWILIO_TWIML_APP_SID=${app.sid}`);
        console.log(`TWILIO_CALLER_ID=${getEnvValue('TWILIO_NUMBER')}`);
        console.log(`GOOGLE_CLIENT_EMAIL=${getEnvValue('GOOGLE_CLIENT_EMAIL')}`);
        // Private Key is complex to log due to newlines, better to leave it separate or read it carefully
        console.log('-------------------------');

    } catch (error) {
        console.error('Error configuring Twilio:', error);
    }
}

setup();
