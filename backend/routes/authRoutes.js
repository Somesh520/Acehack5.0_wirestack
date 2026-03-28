const express = require('express');
const passport = require('passport');
const crypto = require('crypto');
const User = require('../models/User');
const requireAuth = require('../utils/requireAuth');
const router = express.Router();

function frontendBase() {
    return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function githubHeaders(token) {
    return {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Wirestack-App'
    };
}

// GET /api/auth/google
// Initiate Google login
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// GET /api/auth/google/callback
// Google OAuth callback URL after successful/failed login
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
        console.log(`📡 Redirecting to Frontend: ${frontendUrl}/learn (Source: ${process.env.FRONTEND_URL ? 'ENV' : 'DEFAULT'})`);
        res.redirect(`${frontendUrl}/learn`);
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
        const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
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

// GET /api/auth/github/connect
// Start GitHub OAuth linking flow
router.get('/github/connect', requireAuth, async (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
        return res.status(500).json({ error: 'Missing GITHUB_CLIENT_ID in environment' });
    }

    const state = crypto.randomBytes(24).toString('hex');
    req.session.githubOAuthState = state;
    req.session.githubLinkUserId = req.user._id.toString();

    const callbackUrl = `${process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`}/api/auth/github/callback`;
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: callbackUrl,
        scope: 'repo read:user',
        state,
    });

    return res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

// GET /api/auth/github/callback
// Finish GitHub OAuth and store token
router.get('/github/callback', async (req, res) => {
    const redirectBase = frontendBase();
    const { code, state } = req.query;

    if (!code || !state) {
        return res.redirect(`${redirectBase}/learn?github=error_missing_params`);
    }

    if (!req.session.githubOAuthState || state !== req.session.githubOAuthState) {
        return res.redirect(`${redirectBase}/learn?github=error_state_mismatch`);
    }

    const linkUserId = req.session.githubLinkUserId;
    if (!linkUserId) {
        return res.redirect(`${redirectBase}/learn?github=error_missing_user`);
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        return res.redirect(`${redirectBase}/learn?github=error_missing_env`);
    }

    try {
        const callbackUrl = `${process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`}/api/auth/github/callback`;

        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                code: String(code),
                redirect_uri: callbackUrl,
            }),
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok || tokenData.error || !tokenData.access_token) {
            return res.redirect(`${redirectBase}/learn?github=error_token_exchange`);
        }

        const userRes = await fetch('https://api.github.com/user', {
            headers: githubHeaders(tokenData.access_token),
        });

        const githubUser = await userRes.json();
        if (!userRes.ok || !githubUser?.login) {
            return res.redirect(`${redirectBase}/learn?github=error_profile_fetch`);
        }

        const dbUser = await User.findById(linkUserId);
        if (!dbUser) {
            return res.redirect(`${redirectBase}/learn?github=error_user_not_found`);
        }

        dbUser.github = {
            connected: true,
            username: githubUser.login,
            profileUrl: githubUser.html_url || '',
            accessToken: tokenData.access_token,
            scopes: (tokenData.scope || '').split(',').map((s) => s.trim()).filter(Boolean),
            connectedAt: new Date(),
        };
        await dbUser.save();

        req.session.githubOAuthState = null;
        req.session.githubLinkUserId = null;

        return res.redirect(`${redirectBase}/learn?phase=analyzer&github=connected`);
    } catch (err) {
        console.error('❌ GitHub callback error:', err.message);
        return res.redirect(`${redirectBase}/learn?github=error_callback`);
    }
});

// GET /api/auth/github/status
// Return current GitHub link status
router.get('/github/status', requireAuth, async (req, res) => {
    const dbUser = await User.findById(req.user._id);
    const github = dbUser?.github || {};

    res.json({
        connected: Boolean(github.connected && github.accessToken),
        username: github.username || '',
        profileUrl: github.profileUrl || '',
        scopes: Array.isArray(github.scopes) ? github.scopes : [],
        connectedAt: github.connectedAt || null,
    });
});

// GET /api/auth/github/repos
// List user repositories after connection
router.get('/github/repos', requireAuth, async (req, res) => {
    try {
        const dbUser = await User.findById(req.user._id);
        const token = dbUser?.github?.accessToken;
        if (!token) {
            return res.status(400).json({ error: 'GitHub not connected' });
        }

        const ghRes = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member', {
            headers: githubHeaders(token),
        });

        const data = await ghRes.json();
        if (!ghRes.ok) {
            return res.status(ghRes.status).json({ error: data?.message || 'Failed to fetch repositories' });
        }

        const repos = (data || []).map((repo) => ({
            id: repo.id,
            full_name: repo.full_name,
            name: repo.name,
            private: Boolean(repo.private),
            default_branch: repo.default_branch,
            updated_at: repo.updated_at,
            html_url: repo.html_url,
        }));

        return res.json({ repos });
    } catch (err) {
        console.error('❌ GitHub repos error:', err.message);
        return res.status(500).json({ error: 'Failed to list repositories' });
    }
});

// GET /api/auth/github/repo-files?repoFullName=owner/repo&branch=main
// Return repository file paths for selected repo
router.get('/github/repo-files', requireAuth, async (req, res) => {
    try {
        const repoFullName = String(req.query.repoFullName || '').trim();
        const branch = String(req.query.branch || '').trim();

        if (!repoFullName || !repoFullName.includes('/')) {
            return res.status(400).json({ error: 'repoFullName is required (owner/repo)' });
        }

        const [owner, repo] = repoFullName.split('/');
        const dbUser = await User.findById(req.user._id);
        const token = dbUser?.github?.accessToken;
        if (!token) {
            return res.status(400).json({ error: 'GitHub not connected' });
        }

        const refQuery = branch ? `?recursive=1&ref=${encodeURIComponent(branch)}` : '?recursive=1';
        const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD${refQuery}`, {
            headers: githubHeaders(token),
        });

        const treeData = await treeRes.json();
        if (!treeRes.ok) {
            return res.status(treeRes.status).json({ error: treeData?.message || 'Failed to fetch repo tree' });
        }

        const files = (treeData?.tree || [])
            .filter((node) => node.type === 'blob')
            .map((node) => ({ path: node.path, size: node.size || 0, sha: node.sha }))
            .slice(0, 2000);

        return res.json({ files, totalFiles: files.length });
    } catch (err) {
        console.error('❌ GitHub repo-files error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch repository files' });
    }
});

// POST /api/auth/github/disconnect
// Remove linked GitHub token from profile
router.post('/github/disconnect', requireAuth, async (req, res) => {
    try {
        const dbUser = await User.findById(req.user._id);
        if (!dbUser) return res.status(404).json({ error: 'User not found' });

        dbUser.github = {
            connected: false,
            username: '',
            profileUrl: '',
            accessToken: '',
            scopes: [],
            connectedAt: null,
        };

        await dbUser.save();
        return res.json({ ok: true });
    } catch (err) {
        console.error('❌ GitHub disconnect error:', err.message);
        return res.status(500).json({ error: 'Failed to disconnect GitHub' });
    }
});

module.exports = router;
