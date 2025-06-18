const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const auth = (roles = []) => {
  return async (req, res, next) => {
    try {
      // Extract token from cookies
      const token = req.cookies.token;
      if (!token) {
        console.log('No token provided in cookies');
        return res.status(401).json({ error: 'No token provided' });
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded.id || !decoded.role) {
        console.log('Invalid token payload:', decoded);
        return res.status(401).json({ error: 'Invalid token payload' });
      }

      // Fetch user from database
      const user = await mongoose.connection.db.collection('users').findOne({
        _id: new mongoose.Types.ObjectId(decoded.id),
      });
      if (!user) {
        console.log('User not found for ID:', decoded.id);
        return res.status(401).json({ error: 'User not found' });
      }

      // Ensure role is lowercase and attach user data to request
      const userRole = decoded.role ? decoded.role.toLowerCase() : '';
      req.user = { id: decoded.id, role: userRole, email: user.email || '' };
      console.log('Authenticated user:', req.user);

      // Normalize roles for comparison
      const normalizedRoles = roles.map(role => role.toLowerCase());
      if (roles.length && !normalizedRoles.includes(req.user.role)) {
        console.log(`Access denied for role ${req.user.role}. Required roles: ${normalizedRoles}`);
        return res.status(403).json({ error: 'Access denied' });
      }

      next();
    } catch (err) {
      console.error('Auth error:', err.message);
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
};

module.exports = auth;