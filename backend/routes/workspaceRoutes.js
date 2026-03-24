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
        const { nodes, edges, chat_history, name, last_job_id } = req.body;
        const workspace = await Workspace.findOneAndUpdate(
            { _id: req.params.id, user_id: req.user._id },
            { nodes, edges, chat_history, name, last_job_id, updated_at: Date.now() },
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

// DELETE /api/workspace/:id - Delete workspace
router.delete('/:id', async (req, res) => {
    console.log('🗑️ DELETE request received for ID:', req.params.id, 'User:', req.user ? req.user.email : 'None');
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        console.log('🔎 [BACKEND] Searching for workspace to delete:', req.params.id, 'for user:', req.user._id);
        const workspace = await Workspace.findOneAndDelete({
            _id: req.params.id,
            user_id: req.user._id
        });

        if (!workspace) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        console.log('🗑️ Workspace deleted:', workspace.name);
        res.json({ message: 'Workspace deleted successfully' });
    } catch (err) {
        console.error('❌ Error deleting workspace:', err);
        res.status(500).json({ error: 'Failed to delete workspace' });
    }
});

module.exports = router;
