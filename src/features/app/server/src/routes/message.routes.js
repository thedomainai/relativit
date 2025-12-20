const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { requireAuth } = require('../middleware/auth.middleware');

/**
 * GET /api/threads/:threadId/messages
 * List messages in thread
 */
router.get('/threads/:threadId/messages', requireAuth, async (req, res) => {
  try {
    const { limit = 100, before } = req.query;

    // Verify ownership through thread -> workspace
    const thread = await prisma.thread.findFirst({
      where: { id: req.params.threadId },
      include: { workspace: { select: { userId: true } } }
    });

    if (!thread || thread.workspace.userId !== req.user.id) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const where = { threadId: req.params.threadId };
    if (before) {
      where.createdAt = { lt: new Date(before) };
    }

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: parseInt(limit)
    });

    res.json({ messages });
  } catch (error) {
    console.error('List messages error:', error);
    res.status(500).json({ error: 'Failed to list messages' });
  }
});

/**
 * POST /api/threads/:threadId/messages
 * Add message to thread
 */
router.post('/threads/:threadId/messages', requireAuth, async (req, res) => {
  try {
    const { role, content, model, tokens, isError, errorCode } = req.body;

    if (!role || !content) {
      return res.status(400).json({ error: 'Role and content are required' });
    }

    if (!['user', 'assistant', 'system'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Validate message length (1000 characters max for user messages)
    if (role === 'user' && content.length > 1000) {
      return res.status(400).json({ 
        error: 'Message is too long. Maximum 1,000 characters allowed.',
        maxLength: 1000,
        actualLength: content.length
      });
    }

    // Verify ownership
    const thread = await prisma.thread.findFirst({
      where: { id: req.params.threadId },
      include: { workspace: { select: { userId: true } } }
    });

    if (!thread || thread.workspace.userId !== req.user.id) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const message = await prisma.message.create({
      data: {
        threadId: req.params.threadId,
        role,
        content,
        model,
        tokens,
        isError: isError || false,
        errorCode
      }
    });

    // Update thread timestamp
    await prisma.thread.update({
      where: { id: req.params.threadId },
      data: { updatedAt: new Date() }
    });

    // Update workspace timestamp
    await prisma.workspace.update({
      where: { id: thread.workspaceId },
      data: { updatedAt: new Date() }
    });

    res.status(201).json({ message });
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

/**
 * DELETE /api/messages/:id
 * Delete single message
 */
router.delete('/messages/:id', requireAuth, async (req, res) => {
  try {
    const message = await prisma.message.findFirst({
      where: { id: req.params.id },
      include: {
        thread: {
          include: { workspace: { select: { userId: true } } }
        }
      }
    });

    if (!message || message.thread.workspace.userId !== req.user.id) {
      return res.status(404).json({ error: 'Message not found' });
    }

    await prisma.message.delete({ where: { id: req.params.id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

module.exports = router;
