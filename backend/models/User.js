const mongoose = require('mongoose');

/**
 * Module progress sub-schema — tracks each module's completion state per user.
 * Frontend connects: reads this to render the progress map / skill tree.
 */
const moduleProgressSchema = new mongoose.Schema({
    moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true },
    status: {
        type: String,
        enum: ['locked', 'unlocked', 'in_progress', 'completed'],
        default: 'locked'
    },
    vibeCheckScore: { type: Number, default: 0 },
    vibeCheckAttempts: { type: Number, default: 0 },
    codeSubmitted: { type: String, default: '' },
    unlockedAt: Date,
    completedAt: Date,
}, { _id: false });

const dynamicModuleSchema = new mongoose.Schema({
    moduleId: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    title: String,
    description: String,
    challenge: String,
    concept: String,
    theory: { type: String, default: '' },
    mustUse: { type: [String], default: [] },
    acceptanceCriteria: { type: [String], default: [] },
    demoTitle: { type: String, default: '' },
    demoScenario: { type: String, default: '' },
    demoSteps: { type: [String], default: [] },
    demoSnippet: { type: String, default: '' },
    coachQuestions: { type: [String], default: [] },
    vibeQuestion: { type: String, default: '' },
    starterCode: { type: String, default: '// Ready to deploy mission...' },
    solution: { type: String, default: '' },
    xpReward: { type: Number, default: 250 },
    estimatedMinutes: { type: Number, default: 45 },
    order: Number,
    status: {
        type: String,
        enum: ['locked', 'unlocked', 'in_progress', 'completed'],
        default: 'locked'
    },
    vibeCheckScore: { type: Number, default: 0 },
    vibeCheckAttempts: { type: Number, default: 0 },
    codeSubmitted: { type: String, default: '' },
    unlockedAt: Date,
    completedAt: Date,
    docs_url: String,
});

const userSchema = new mongoose.Schema({
    // ─── Existing Google Auth Fields (untouched) ─────────────
    google_id: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    first_name: String,
    last_name: String,
    profile_picture: String,
    user_type: {
        type: String,
        enum: ['developer', 'non-developer', null],
        default: null
    },

    // ─── GitHub Integration Fields ──────────────────────────
    github: {
        connected: { type: Boolean, default: false },
        username: { type: String, default: '' },
        profileUrl: { type: String, default: '' },
        accessToken: { type: String, default: '' },
        scopes: { type: [String], default: [] },
        connectedAt: { type: Date, default: null },
    },

    // ─── Learning Engine Fields (new) ────────────────────────
    /**
     * Selected tech stack — set when user picks their learning path.
     * Frontend connects: POST /api/v1/diagnostic/generate sends this.
     */
    selectedStack: {
        type: String,
        default: null
    },

    /**
     * Diagnostic level — determined after the AI diagnostic test.
     * Frontend connects: Used to seed appropriate Module difficulty.
     */
    diagnosticLevel: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced', null],
        default: null
    },

    /** Diagnostic test results for reference */
    diagnosticResults: {
        score: { type: Number, default: 0 },         // e.g. 2/3 correct
        totalQuestions: { type: Number, default: 0 },
        completedAt: Date,
    },

    /**
     * Per-module progress tracking.
     * Frontend connects: renders the module map / skill tree + lock/unlock states.
     */
    moduleProgress: [moduleProgressSchema],

    /** Overall learning stats */
    totalModulesCompleted: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },         // days in a row
    lastActiveAt: Date,

    /**
     * AI-Generated Dynamic Roadmap.
     * Stores the custom modules created specifically for this user's IQ Check.
     */
    activeRoadmap: [dynamicModuleSchema],

    /**
     * History of missions (past learning paths).
     * Allows user to have multiple "stacks" and keeps all activity records.
     */
    missions: [{
        stack: String,
        level: String,
        score: Number,
        totalQuestions: Number,
        moduleProgress: [moduleProgressSchema],
        startedAt: { type: Date, default: Date.now },
        completedAt: Date,
        status: { type: String, enum: ['active', 'archived', 'completed'], default: 'archived' }
    }],

    created_at: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);
