const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const aiService = require('../services/ai.service');
const { requireAuth } = require('../middleware/auth.middleware');

/**
 * POST /api/ai/chat
 * Send message and get AI response
 */
router.post('/chat', requireAuth, async (req, res) => {
  try {
    const { messages, threadId } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Validate message length (1000 characters max for user messages)
    const userMessages = messages.filter(m => m.role === 'user' || m.role === 'user');
    for (const msg of userMessages) {
      if (msg.content && msg.content.length > 1000) {
        return res.status(400).json({ 
          error: 'Message is too long. Maximum 1,000 characters allowed.',
          maxLength: 1000,
          actualLength: msg.content.length
        });
      }
    }

    // If threadId provided, verify ownership
    if (threadId) {
      const thread = await prisma.thread.findFirst({
        where: { id: threadId },
        include: { workspace: { select: { userId: true } } }
      });

      if (!thread || thread.workspace.userId !== req.user.id) {
        return res.status(404).json({ error: 'Thread not found' });
      }
    }

    const result = await aiService.chat(req.user.id, messages);

    // Get updated trial credits if in trial mode
    let trialCredits = null;
    if (result.isTrialMode) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { trialCredits: true }
      });
      trialCredits = user?.trialCredits || 0;
    }

    res.json({
      response: result.response,
      model: result.model,
      tokens: result.tokens,
      trialCredits
    });
  } catch (error) {
    console.error('AI chat error:', error);
    
    // Return appropriate error
    if (error.message.includes('API key')) {
      return res.status(400).json({ error: error.message, code: 'API_KEY_ERROR' });
    }
    
    res.status(500).json({ 
      error: error.message || 'Failed to get AI response',
      code: 'AI_ERROR'
    });
  }
});

/**
 * POST /api/ai/extract-issues
 * Extract issue tree from conversation
 */
router.post('/extract-issues', requireAuth, async (req, res) => {
  try {
    const { messages, currentTree, workspaceId } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // If workspaceId provided, verify ownership
    if (workspaceId) {
      const workspace = await prisma.workspace.findFirst({
        where: { id: workspaceId, userId: req.user.id }
      });

      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
    }

    const defaultTree = currentTree || {
      id: 'root',
      label: 'Research Topic',
      status: 'pending',
      children: []
    };

    const tree = await aiService.extractIssues(req.user.id, messages, defaultTree);

    res.json({ tree });
  } catch (error) {
    console.error('Extract issues error:', error);
    
    // Return current tree on error
    res.json({ 
      tree: req.body.currentTree || { id: 'root', label: 'Research Topic', status: 'pending', children: [] },
      error: error.message 
    });
  }
});

/**
 * GET /api/ai/usage
 * Get user's API usage statistics
 */
router.get('/usage', requireAuth, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calculate date range
    const days = parseInt(period) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const usage = await prisma.apiUsage.groupBy({
      by: ['provider', 'endpoint'],
      where: {
        userId: req.user.id,
        createdAt: { gte: startDate }
      },
      _count: { id: true },
      _sum: { tokens: true, cost: true }
    });

    const totalUsage = await prisma.apiUsage.aggregate({
      where: {
        userId: req.user.id,
        createdAt: { gte: startDate }
      },
      _count: { id: true },
      _sum: { tokens: true, cost: true }
    });

    // Daily breakdown
    const dailyUsage = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as requests,
        SUM(tokens) as tokens
      FROM "ApiUsage"
      WHERE user_id = ${req.user.id}
        AND created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    res.json({
      period: `${days}d`,
      summary: {
        totalRequests: totalUsage._count.id || 0,
        totalTokens: totalUsage._sum.tokens || 0,
        estimatedCost: totalUsage._sum.cost || 0
      },
      byProvider: usage,
      daily: dailyUsage
    });
  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({ error: 'Failed to get usage statistics' });
  }
});

module.exports = router;
