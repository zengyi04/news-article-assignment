const { auth } = require('../firebase-admin');

// Middleware to verify Firebase ID token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'No token provided' 
      });
    }

    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    
    let message = 'Invalid authentication token';
    let statusCode = 401;
    
    switch (error.code) {
      case 'auth/argument-error':
        message = 'Invalid token format';
        break;
      case 'auth/id-token-expired':
        message = 'Token expired';
        break;
      case 'auth/id-token-revoked':
        message = 'Token revoked';
        break;
      case 'auth/invalid-id-token':
        message = 'Invalid ID token';
        break;
    }
    
    res.status(statusCode).json({ 
      error: message, 
      code: error.code 
    });
  }
};

// Middleware to check if user has admin role
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.admin || !req.user.customClaims?.admin) {
    return res.status(403).json({ 
      error: 'Admin access required',
      message: 'You do not have permission to perform this action' 
    });
  }

  next();
};

// Middleware to check if user owns the resource
const checkResourceOwnership = (resourceField = 'createdBy') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const userId = req.user.uid;

      if (!resourceId) {
        return res.status(400).json({ error: 'Resource ID required' });
      }

      // This would need to be implemented based on your specific resource structure
      // For now, we'll allow the request to proceed
      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(500).json({ error: 'Failed to verify resource ownership' });
    }
  };
};

module.exports = {
  verifyToken,
  requireAdmin,
  checkResourceOwnership
};
