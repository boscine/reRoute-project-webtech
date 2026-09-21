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
    // Support CIDR masks (/8, /16, /24)
    if (allowed.includes('/')) {
      const [subnetIp, mask] = allowed.split('/');
      const octetCount = mask === '8' ? 1 : mask === '16' ? 2 : 3;
      const prefix = subnetIp.split('.').slice(0, octetCount).join('.') + '.';
      return normalizedIp.startsWith(prefix);
    }
    return false;
  });

  // In development, automatically allow standard private home/campus subnets
  const isPrivateNetwork =
    normalizedIp.startsWith('192.168.') ||
    normalizedIp.startsWith('10.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(normalizedIp);

  if (process.env.NODE_ENV !== 'production' && isPrivateNetwork) {
    req.clientIp = normalizedIp;
    return next();
  }

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
