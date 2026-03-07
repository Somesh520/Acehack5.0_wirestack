const express = require('express');
const passport = require('passport');
const User = require('../models/User');
const router = express.Router();

// GET /api/auth/google
// Initiate Google login
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// GET /api/auth/google/callback
// Google OAuth callback URL after successful/failed login
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        console.log(`📡 Redirecting to Frontend: ${frontendUrl}/canvas (Source: ${process.env.FRONTEND_URL ? 'ENV' : 'DEFAULT'})`);
        res.redirect(`${frontendUrl}/canvas`);
    }
);

// GET /api/auth/me
// Check if user is currently authenticated
router.get('/me', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ authenticated: true, user: req.user });
    } else {
        res.status(401).json({ authenticated: false, message: 'Not authenticated' });
    }
});

// GET /api/auth/logout
// Log out current user session
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) return res.status(500).json({ error: 'Logout failed' });
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        console.log(`🔌 Logging out. Redirecting to: ${frontendUrl}`);
        res.redirect(frontendUrl);
    });
});

// POST /api/auth/update-type
// Update the user's role (developer/non-developer)
router.post('/update-type', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { userType } = req.body;
    if (!['developer', 'non-developer'].includes(userType)) {
        return res.status(400).json({ error: 'Invalid user type' });
    }

    try {
        const user = await User.findById(req.user._id);
        user.user_type = userType;
        await user.save();
        res.json({ message: 'User type updated successfully', user });
    } catch (err) {
        console.error('❌ Error updating user type:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
