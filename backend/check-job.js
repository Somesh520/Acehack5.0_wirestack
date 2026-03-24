require('dotenv').config({ path: __dirname + '/.env' });
const { Queue } = require('bullmq');
const connection = { host: '127.0.0.1', port: 6379 };
const queue = new Queue('generation-queue', { connection });

async function check() {
    console.log("Checking job 36...");
    const job = await queue.getJob("36");
    if (!job) {
        console.log("Job 36 not found in Redis.");
    } else {
        const state = await job.getState();
        console.log("Job 36 state:", state);
        console.log("Job 36 progress:", job.progress);
    }
    process.exit(0);
}
check();
