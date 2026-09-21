/**
 * IP Whitelist Middleware
 * Restricts admin access to designated campus IP ranges or local development.
 */
function ipWhitelist(req, res, next) {
  // In development, allow localhost loopbacks
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '';

  const configuredIps = (process.env.ALLOWED_IPS || '127.0.0.1,::1')
    .split(',')
    .map(ip => ip.trim())
    .filter(Boolean);

  // Normalize IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1 -> 127.0.0.1)
  const normalizedIp = clientIp.replace(/^.*:/, '');

  const isAllowed = configuredIps.some(allowed => {
    if (allowed === clientIp || allowed === normalizedIp) return true;
    if (allowed.startsWith('127.') && (normalizedIp.startsWith('127.') || clientIp.includes('127.0.0.1'))) return true;
    if (allowed === '::1' && (clientIp === '::1' || normalizedIp === '1')) return true;
    // Basic prefix matching for subnet notation like 192.168.1.0/24 -> 192.168.1.
    if (allowed.includes('/')) {
      const prefix = allowed.split('/')[0].split('.').slice(0, 3).join('.');
      return normalizedIp.startsWith(prefix);
    }
    return false;
  });

  if (!isAllowed && process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: 'Access denied: Admin panel can only be accessed from the authorized campus network.',
      clientIp
    });
  }

  req.clientIp = clientIp;
  next();
}

module.exports = ipWhitelist;
