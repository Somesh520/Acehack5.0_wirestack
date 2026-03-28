const mongoose = require('mongoose');

/**
 * Module schema — represents a single learning module/challenge in the skill tree.
 * 
 * Architecture:
 * - Modules are grouped by `stack` (e.g., all React modules)
 * - Ordered by `order` field (1, 2, 3...) for sequential unlocking
 * - Each module has a coding challenge + starter code
 * - User must pass a "Vibe Check" (code + explain) to unlock the next one
 * 
 * Frontend connects:
 * - GET /api/v1/modules?stack=React → renders the module list / skill tree
 * - Each module card shows title, concept, difficulty, locked/unlocked state
 * - When user clicks an unlocked module → shows challenge + code editor
 */
const moduleSchema = new mongoose.Schema({
    /** Which tech stack this module belongs to */
    stack: {
        type: String,
        required: true,
        enum: ['MERN', 'React', 'Node.js', 'Python', 'Vue', 'Angular', 'Next.js', 'Express'],
        index: true
    },

    /** Sequential order within the stack (Module 1, Module 2, ...) */
    order: {
        type: Number,
        required: true
    },

    /** Display title (e.g., "Mastering useState") */
    title: {
        type: String,
        required: true,
        trim: true
    },

    /** Short description shown on the module card */
    description: {
        type: String,
        required: true
    },

    /**
     * The core concept this module teaches.
     * Used by the AI Vibe Check to generate targeted questions.
     * e.g., "React useState hook", "Express middleware chain"
     */
    concept: {
        type: String,
        required: true
    },

    /**
     * The coding challenge description.
     * Shown to the user when they open the module.
     * e.g., "Build a counter component that increments, decrements, and resets."
     */
    challenge: {
        type: String,
        required: true
    },

    /**
     * Starter/boilerplate code given to the user.
     * Pre-filled in the code editor so they have a starting point.
     */
    starterCode: {
        type: String,
        default: '// Write your code here\n'
    },

    /**
     * IDs of modules that must be completed before this one unlocks.
     * Module 1 has no dependencies. Module 2 depends on Module 1, etc.
     */
    dependencies: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Module'
    }],

    /** Difficulty level — used for the AI to calibrate its review */
    difficulty: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'beginner'
    },

    /** Estimated completion time in minutes */
    estimatedMinutes: {
        type: Number,
        default: 15
    },

    /** XP reward for completing this module */
    xpReward: {
        type: Number,
        default: 100
    },

    /** Whether this module is currently active/published */
    isActive: {
        type: Boolean,
        default: true
    },

    created_at: {
        type: Date,
        default: Date.now
    }
});

/** Compound index for fast lookups: all modules for a stack, in order */
moduleSchema.index({ stack: 1, order: 1 }, { unique: true });

module.exports = mongoose.model('Module', moduleSchema);
