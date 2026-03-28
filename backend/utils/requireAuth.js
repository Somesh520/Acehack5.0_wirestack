/**
 * Authentication middleware — replaces the repeated
 * `if (!req.isAuthenticated())` check across all route handlers.
 * @module utils/requireAuth
 */

/**
 * Express middleware that ensures the request is authenticated.
 * Returns 401 JSON if not.
 */
function requireAuth(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
}

module.exports = requireAuth;
