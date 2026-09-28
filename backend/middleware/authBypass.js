/**
 * Temporary local-development auth bypass.
 *
 * When AUTH_BYPASS=true, every request is treated as the seeded super admin so
 * the dashboard can be browsed without logging in. It is hard-disabled whenever
 * NODE_ENV=production, and it is off unless explicitly switched on.
 *
 * To turn it off again: set AUTH_BYPASS=false in backend/.env and restart the
 * backend. Nothing else needs to change.
 */
const Admin = require('../models/Admin');

/** The admin created by the seed script (backend/db.js). */
const BYPASS_ADMIN_EMAIL = 'admin@campus.edu';

let cachedAdmin = null;
let hasWarned = false;

/**
 * @returns {boolean} true only when the bypass is on AND we are not in production.
 */
function isAuthBypassEnabled() {
  if (process.env.NODE_ENV === 'production') return false;
  return process.env.AUTH_BYPASS === 'true';
}

/**
 * Picks the account to impersonate: the seeded admin if present, otherwise
 * whatever super admin exists, otherwise any admin at all.
 *
 * @returns {Promise<{id:string,name:string,email:string,role:string}|null>}
 */
async function resolveBypassAdmin() {
  if (cachedAdmin) return cachedAdmin;

  const admin =
    (await Admin.findOne({ email: BYPASS_ADMIN_EMAIL })) ||
    (await Admin.findOne({ role: 'super_admin' })) ||
    (await Admin.findOne({}));

  if (!admin) return null;

  cachedAdmin = {
    id: admin._id.toString(),
    name: admin.name,
    email: admin.email,
    // Forced so every page and action is reachable, including super-admin only
    // ones, while browsing.
    role: 'super_admin',
  };
  return cachedAdmin;
}

/**
 * Fills `req.session` with the impersonated admin so that downstream code which
 * reads `req.session.adminId` (e.g. the "cannot delete your own account" guard
 * in routes/admins.js) keeps working normally.
 *
 * @returns {Promise<boolean>} true when the request may proceed as the demo admin.
 */
async function applyBypassSession(req) {
  if (!isAuthBypassEnabled()) return false;
  if (req.session && req.session.adminId) return true;

  const admin = await resolveBypassAdmin();
  if (!admin) {
    if (!hasWarned) {
      console.warn('⚠️ AUTH_BYPASS is on but there are no admins in the database.');
      console.warn('   Run `npm run seed` to create the demo super admin.');
      hasWarned = true;
    }
    return false;
  }

  if (req.session) {
    req.session.adminId = admin.id;
    req.session.adminRole = admin.role;
    req.session.adminName = admin.name;
    req.session.adminEmail = admin.email;
  }
  return true;
}

module.exports = {
  isAuthBypassEnabled,
  applyBypassSession,
};
