/**
 * Auth Middleware
 * Verifies that an authenticated admin session exists.
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.adminId) {
    return res.status(401).json({ error: 'Unauthorized: Admin session required. Please log in.' });
  }
  next();
}

/**
 * Role Check Middleware
 */
function requireSuperAdmin(req, res, next) {
  if (!req.session || req.session.adminRole !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden: Super Admin privileges required.' });
  }
  next();
}

module.exports = {
  requireAuth,
  requireSuperAdmin
};
