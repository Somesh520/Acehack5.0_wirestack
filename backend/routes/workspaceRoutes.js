const express = require('express');
const Workspace = require('../models/Workspace');
const router = express.Router();

// POST /api/workspace - Create new workspace
router.post('/', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const { name } = req.body;
        const workspace = new Workspace({
            name: name || 'Untitled Workspace',
            user_id: req.user._id
        });
        await workspace.save();
        console.log('✨ New workspace created:', workspace.name);
        res.json(workspace);
    } catch (err) {
        console.error('❌ Error creating workspace:', err);
        res.status(500).json({ error: 'Failed to create workspace' });
    }
});

// GET /api/workspace - List user's workspaces (recent first)
router.get('/', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const workspaces = await Workspace.find({ user_id: req.user._id })
            .sort({ updated_at: -1 })
            .limit(10);
        res.json(workspaces);
    } catch (err) {
        console.error('❌ Error fetching workspaces:', err);
        res.status(500).json({ error: 'Failed to fetch workspaces' });
    }
});

// PUT /api/workspace/:id - Update workspace (save nodes/edges/chat)
router.put('/:id', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const { nodes, edges, chat_history, name } = req.body;
        const workspace = await Workspace.findOneAndUpdate(
            { _id: req.params.id, user_id: req.user._id },
            { nodes, edges, chat_history, name, updated_at: Date.now() },
            { new: true }
        );
        if (!workspace) {
            return res.status(404).json({ error: 'Workspace not found' });
        }
        res.json(workspace);
    } catch (err) {
        console.error('❌ Error updating workspace:', err);
        res.status(500).json({ error: 'Failed to update workspace' });
    }
});

module.exports = router;
