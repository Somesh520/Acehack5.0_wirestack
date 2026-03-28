/**
 * Learning Routes — Anti-Vibe-Coding Engine API.
 * 
 * All endpoints require authentication (Google login).
 * Mounts at /api/v1 in server.js.
 * 
 * Frontend Connection Map:
 *   POST /api/v1/diagnostic/generate     → User selects stack → get diagnostic test
 *   POST /api/v1/diagnostic/submit       → User completes test → get level + unlock first module
 *   POST /api/v1/challenge/vibe-check    → User submits code → get AI review + vibe question
 *   POST /api/v1/challenge/verify-explanation → User explains code → grade + unlock next
 *   GET  /api/v1/modules?stack=React     → Fetch module list with progress overlay
 *   GET  /api/v1/progress                → Fetch user's overall learning stats
 * 
 * @module routes/learningRoutes
 */

const express = require('express');
const router = express.Router();
const requireAuth = require('../utils/requireAuth');

const {
    generateDiagnostic,
    submitDiagnostic,
    vibeCheck,
    verifyExplanation,
    getModules,
    getProgress,
    resetMission,
    getMissionHistory,
    getPublicProfile,
} = require('../controllers/learningController');

// ─── Diagnostic Test ─────────────────────────────────────────
router.post('/diagnostic/generate', requireAuth, generateDiagnostic);
router.post('/diagnostic/submit', requireAuth, submitDiagnostic);

// ─── Vibe Check (Code Review + Explanation) ──────────────────
router.post('/challenge/vibe-check', requireAuth, vibeCheck);
router.post('/challenge/verify-explanation', requireAuth, verifyExplanation);

// ─── Module & Progress Queries ───────────────────────────────
router.get('/modules', requireAuth, getModules);
router.get('/progress', requireAuth, getProgress);

// ─── Mission Management ──────────────────────────────────────
router.post('/mission/reset', requireAuth, resetMission);
router.get('/mission/history', requireAuth, getMissionHistory);

// ─── Public Profile (No Auth Required) ────────────────────────
router.get('/public/profile/:username', getPublicProfile);

module.exports = router;
