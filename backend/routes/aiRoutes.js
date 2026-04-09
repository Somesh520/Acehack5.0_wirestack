

const express = require('express');
const router = express.Router();
const requireAuth = require('../utils/requireAuth');

// Controllers


const { analyzeStack, analyzeFolder, analyzeRepo, codeqlSemanticQuery, fetchGithubCodeqlAlerts } = require('../controllers/analysisController');


// ─── AI Chat ─────────────────────────────────────────────────

// ─── Project Download ────────────────────────────────────────


// ─── Analysis Endpoints ──────────────────────────────────────
router.post('/analyze-stack', requireAuth, analyzeStack);
router.post('/analyze-folder', requireAuth, analyzeFolder);
router.post('/analyze-repo', requireAuth, analyzeRepo);
router.post('/codeql-semantic-query', requireAuth, codeqlSemanticQuery);
router.post('/github-codeql-alerts', requireAuth, fetchGithubCodeqlAlerts);

// ─── Sandbox Management ──────────────────────────────────────




module.exports = router;
