const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const aiService = require('../services/ai.service');
const { requireAuth } = require('../middleware/auth.middleware');

/**
 * POST /api/settings/trial-mode/enable
 * Enable trial mode (gives user $0.50 in credits)
 */
router.post('/trial-mode/enable', requireAuth, async (req, res) => {
  try {
    const result = await authService.enableTrialMode(req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Enable trial mode error:', error);
    res.status(500).json({ error: 'Failed to enable trial mode' });
  }
});

/**
 * GET /api/settings/api-key
 * Get API key status
 */
router.get('/api-key', requireAuth, async (req, res) => {
  try {
    const status = await authService.getApiKeyStatus(req.user.id);
    res.json(status);
  } catch (error) {
    console.error('Get API key status error:', error);
    res.status(500).json({ error: 'Failed to get API key status' });
  }
});

/**
 * POST /api/settings/api-key
 * Save API key
 */
router.post('/api-key', requireAuth, async (req, res) => {
  try {
    const { provider, apiKey } = req.body;

    if (!provider || !apiKey) {
      return res.status(400).json({ error: 'Provider and API key are required' });
    }

    // Validate API key before saving
    const validation = await aiService.validateApiKey(provider, apiKey);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Invalid API key', 
        details: validation.error 
      });
    }

    await authService.saveApiKey(req.user.id, provider, apiKey);
    
    res.json({ 
      success: true, 
      message: 'API key saved successfully',
      provider
    });
  } catch (error) {
    console.error('Save API key error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/settings/api-key
 * Remove API key
 */
router.delete('/api-key', requireAuth, async (req, res) => {
  try {
    await authService.removeApiKey(req.user.id);
    res.json({ success: true, message: 'API key removed' });
  } catch (error) {
    console.error('Remove API key error:', error);
    res.status(500).json({ error: 'Failed to remove API key' });
  }
});

/**
 * POST /api/settings/api-key/validate
 * Validate API key without saving
 */
router.post('/api-key/validate', requireAuth, async (req, res) => {
  try {
    const { provider, apiKey } = req.body;

    if (!provider || !apiKey) {
      return res.status(400).json({ error: 'Provider and API key are required' });
    }

    const validation = await aiService.validateApiKey(provider, apiKey);
    res.json(validation);
  } catch (error) {
    console.error('Validate API key error:', error);
    res.status(500).json({ error: 'Validation failed' });
  }
});

module.exports = router;
