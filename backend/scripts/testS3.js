const { S3Client, ListBucketsCommand } = require("@aws-sdk/client-s3");
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        sessionToken: process.env.AWS_SESSION_TOKEN || undefined,
    },
});

async function testConnection() {
    console.log('--- S3 CONNECTION TEST ---');
    console.log('Region:', process.env.AWS_REGION);
    console.log('Access Key ID:', process.env.AWS_ACCESS_KEY_ID ? '***' + process.env.AWS_ACCESS_KEY_ID.slice(-4) : 'MISSING');

    try {
        const data = await s3Client.send(new ListBucketsCommand({}));
        console.log('✅ Connection Successful!');
        console.log('Buckets found:');
        data.Buckets.forEach(b => console.log(` - ${b.Name}`));

        if (data.Buckets.length === 0) {
            console.warn('⚠️ No buckets found. Please create one in the AWS Console.');
        } else {
            console.log('--- TEST PASSED ---');
        }
    } catch (err) {
        console.error('❌ Connection Failed!');
        console.error('Error:', err.message);
        if (err.message.includes('Token')) {
            console.error('Hint: Your Session Token might be expired or invalid.');
        }
    }
}

testConnection();
