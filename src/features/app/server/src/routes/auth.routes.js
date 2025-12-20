const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const { requireAuth, getClientIp, getUserAgent } = require('../middleware/auth.middleware');

/**
 * POST /api/auth/request-code
 * Request verification code for login/signup
 */
router.post('/request-code', async (req, res) => {
  try {
    const { email, type = 'login' } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const result = await authService.requestVerificationCode(email, type);
    
    res.json({
      success: true,
      userExists: result.userExists,
      message: 'Verification code sent to your email'
    });
  } catch (error) {
    console.error('Request code error:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

/**
 * POST /api/auth/verify-code
 * Verify code and check user status
 */
router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const result = await authService.verifyCode(
      email, 
      code,
      getClientIp(req),
      getUserAgent(req)
    );

    res.json(result);
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/auth/register
 * Complete registration for new users
 */
router.post('/register', async (req, res) => {
  try {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Email, name, and password are required' });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters' });
    }

    const result = await authService.register(
      email,
      name,
      password,
      getClientIp(req),
      getUserAgent(req)
    );

    res.json(result);
  } catch (error) {
    console.error('Register error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await authService.login(
      email,
      password,
      getClientIp(req),
      getUserAgent(req)
    );

    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: error.message });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const result = await authService.refreshAccessToken(refreshToken);
    res.json(result);
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(401).json({ error: error.message, code: 'REFRESH_FAILED' });
  }
});

/**
 * POST /api/auth/logout
 * Logout (revoke refresh token)
 */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken, req.user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * POST /api/auth/logout-all
 * Logout from all devices
 */
router.post('/logout-all', requireAuth, async (req, res) => {
  try {
    await authService.logoutAll(req.user.id);
    res.json({ success: true, message: 'Logged out from all devices' });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current user
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const user = await authService.updateProfile(req.user.id, req.body);
    res.json({ user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/auth/password
 * Change password
 */
router.put('/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.json(result);
  } catch (error) {
    console.error('Change password error:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
