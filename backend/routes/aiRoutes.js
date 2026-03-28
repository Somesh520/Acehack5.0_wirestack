/**
 * AI Routes — thin router that delegates to focused controllers.
 * 
 * Previously a 1952-line god file, now a clean ~60-line router.
 * All business logic lives in controllers/*.
 * 
 * @module routes/aiRoutes
 */

const express = require('express');
const router = express.Router();
const requireAuth = require('../utils/requireAuth');

// Controllers
const { handleChat } = require('../controllers/chatController');
const {
    generatePlan,
    generateFile,
    enqueueProject,
    getJobStatus,
    fetchProject,
    saveProject,
    downloadProject,
    deployHtmlTest,
} = require('../controllers/generationController');
const { analyzeStack, analyzeFolder, analyzeRepo } = require('../controllers/analysisController');
const { deploySandboxHandler, getSandboxStatusHandler, stopSandboxHandler } = require('../controllers/sandboxController');

// ─── AI Chat ─────────────────────────────────────────────────
router.post('/chat', requireAuth, handleChat);

// ─── HTML Sandbox Test ───────────────────────────────────────
router.post('/deploy-html-test', requireAuth, deployHtmlTest);

// ─── Sequential Code Generation Pipeline ─────────────────────
router.post('/generate-plan', requireAuth, generatePlan);
router.post('/generate-file', requireAuth, generateFile);

// ─── Project Enqueue & Status ────────────────────────────────
router.post('/enqueue-project', requireAuth, enqueueProject);
router.get('/job-status/:id', requireAuth, getJobStatus);

// ─── S3 Project Persistence ──────────────────────────────────
router.get('/fetch-project/:jobId', requireAuth, fetchProject);
router.post('/save-project/:jobId', requireAuth, saveProject);

// ─── Project Download ────────────────────────────────────────
router.post('/download', requireAuth, downloadProject);

// ─── Analysis Endpoints ──────────────────────────────────────
router.post('/analyze-stack', requireAuth, analyzeStack);
router.post('/analyze-folder', requireAuth, analyzeFolder);
router.post('/analyze-repo', requireAuth, analyzeRepo);

// ─── Sandbox Management ──────────────────────────────────────
router.post('/deploy-sandbox', requireAuth, deploySandboxHandler);
router.get('/sandbox-status/:jobId', requireAuth, getSandboxStatusHandler);
router.delete('/sandbox/:jobId', requireAuth, stopSandboxHandler);

module.exports = router;
