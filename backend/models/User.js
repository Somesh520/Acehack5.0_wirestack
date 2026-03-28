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
    vibeCheckScore: { type: Number, default: 0 },       // 0-100 score from AI grading
    vibeCheckAttempts: { type: Number, default: 0 },     // How many times they tried the vibe check
    codeSubmitted: { type: String, default: '' },        // Last submitted code snapshot
    unlockedAt: Date,
    completedAt: Date,
}, { _id: false });

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

    // ─── Learning Engine Fields (new) ────────────────────────
    /**
     * Selected tech stack — set when user picks their learning path.
     * Frontend connects: POST /api/v1/diagnostic/generate sends this.
     */
    selectedStack: {
        type: String,
        enum: ['MERN', 'React', 'Node.js', 'Python', 'Vue', 'Angular', 'Next.js', 'Express', null],
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
