/**
 * Sandbox controller — deploy, status, and stop sandbox endpoints.
 * @module controllers/sandboxController
 */

const { deploySandbox, getSandboxStatus, stopSandbox } = require('../utils/deployUtils');

/** POST /api/ai/deploy-sandbox */
async function deploySandboxHandler(req, res) {
    const { jobId } = req.body;
    if (!jobId) {
        return res.status(400).json({ error: 'jobId is required' });
    }

    try {
        console.log(`🚀 [SANDBOX] Deploy requested for job: ${jobId}`);
        const result = await deploySandbox(jobId);
        res.json(result);
    } catch (err) {
        console.error('❌ Sandbox deploy error:', err.message);
        res.status(500).json({ error: 'Failed to deploy sandbox', details: err.message });
    }
}

/** GET /api/ai/sandbox-status/:jobId */
async function getSandboxStatusHandler(req, res) {
    try {
        const status = await getSandboxStatus(req.params.jobId);
        res.json(status);
    } catch (err) {
        console.error('❌ Sandbox status error:', err.message);
        res.status(500).json({ error: 'Failed to check sandbox status', details: err.message });
    }
}

/** DELETE /api/ai/sandbox/:jobId */
async function stopSandboxHandler(req, res) {
    try {
        const result = await stopSandbox(req.params.jobId);
        res.json(result);
    } catch (err) {
        console.error('❌ Sandbox stop error:', err.message);
        res.status(500).json({ error: 'Failed to stop sandbox', details: err.message });
    }
}

module.exports = { deploySandboxHandler, getSandboxStatusHandler, stopSandboxHandler };
