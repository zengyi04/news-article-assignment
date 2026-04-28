const express = require('express');
const { auth } = require('../firebase-admin');

const router = express.Router();

// POST /api/auth/verify - Verify Firebase ID token
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'No token provided' });
    }

    const decodedToken = await auth.verifyIdToken(token);
    
    // Get additional user info from Firebase Auth
    const userRecord = await auth.getUser(decodedToken.uid);

    res.json({
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      displayName: decodedToken.name || userRecord.displayName,
      photoURL: decodedToken.picture || userRecord.photoURL,
      createdAt: userRecord.metadata.creationTime,
      lastSignInTime: userRecord.metadata.lastSignInTime,
      customClaims: decodedToken.customClaims || {}
    });
  } catch (error) {
    console.error('Token verification error:', error);
    
    let message = 'Invalid token';
    if (error.code === 'auth/argument-error') {
      message = 'Invalid token format';
    } else if (error.code === 'auth/id-token-expired') {
      message = 'Token expired';
    } else if (error.code === 'auth/id-token-revoked') {
      message = 'Token revoked';
    }
    
    res.status(401).json({ error: message, code: error.code });
  }
});

// POST /api/auth/refresh - Refresh token (get new token)
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'No refresh token provided' });
    }

    // Note: Firebase Admin SDK doesn't directly support refresh tokens
    // This endpoint would need to be implemented differently or use client-side refresh
    res.status(501).json({ 
      error: 'Not implemented', 
      message: 'Token refresh should be handled client-side with Firebase SDK' 
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// GET /api/auth/user/:uid - Get user by UID (admin only)
router.get('/user/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    if (!uid) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const userRecord = await auth.getUser(uid);

    res.json({
      uid: userRecord.uid,
      email: userRecord.email,
      emailVerified: userRecord.emailVerified,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
      disabled: userRecord.disabled,
      metadata: {
        creationTime: userRecord.metadata.creationTime,
        lastSignInTime: userRecord.metadata.lastSignInTime,
        lastRefreshTime: userRecord.metadata.lastRefreshTime
      },
      providerData: userRecord.providerData,
      customClaims: userRecord.customClaims || {}
    });
  } catch (error) {
    console.error('Get user error:', error);
    
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(500).json({ error: 'Failed to get user information' });
  }
});

// POST /api/auth/set-custom-claims - Set custom claims (admin only)
router.post('/set-custom-claims', async (req, res) => {
  try {
    const { uid, claims } = req.body;

    if (!uid || !claims) {
      return res.status(400).json({ error: 'User ID and claims required' });
    }

    await auth.setCustomUserClaims(uid, claims);
    
    res.json({
      message: 'Custom claims set successfully',
      uid,
      claims
    });
  } catch (error) {
    console.error('Set custom claims error:', error);
    res.status(500).json({ error: 'Failed to set custom claims' });
  }
});

// DELETE /api/auth/user/:uid - Delete user (admin only)
router.delete('/user/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    if (!uid) {
      return res.status(400).json({ error: 'User ID required' });
    }

    await auth.deleteUser(uid);
    
    res.json({
      message: 'User deleted successfully',
      uid
    });
  } catch (error) {
    console.error('Delete user error:', error);
    
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
