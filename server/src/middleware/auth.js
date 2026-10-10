import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'scm_spinners_kttm01_super_secret_jwt_key_2026';

export function authenticateToken(req, res, next) {
  // Allow TV kiosk token query bypass
  if (req.query?.token === 'shed2_live_display' || req.headers['x-tv-token'] === 'shed2_live_display') {
    req.user = { role: 'tv_display', username: 'kiosk_display', name: 'Shop Floor TV Display' };
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user?.role || 'None'}`
      });
    }
    next();
  };
}
