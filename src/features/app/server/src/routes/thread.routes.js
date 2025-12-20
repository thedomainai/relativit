const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { requireAuth } = require('../middleware/auth.middleware');

/**
 * GET /api/workspaces/:workspaceId/threads
 * List threads in workspace
 */
router.get('/workspaces/:workspaceId/threads', requireAuth, async (req, res) => {
  try {
    // Verify workspace ownership
    const workspace = await prisma.workspace.findFirst({
      where: { id: req.params.workspaceId, userId: req.user.id }
    });

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const threads = await prisma.thread.findMany({
      where: { workspaceId: req.params.workspaceId },
      include: {
        _count: { select: { messages: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const formatted = threads.map(t => ({
      id: t.id,
      title: t.title,
      summary: t.summary,
      status: t.status,
      messageCount: t._count.messages,
      lastMessage: t.messages[0]?.content?.slice(0, 100),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    }));

    res.json({ threads: formatted });
  } catch (error) {
    console.error('List threads error:', error);
    res.status(500).json({ error: 'Failed to list threads' });
  }
});

/**
 * GET /api/threads/:id
 * Get single thread with messages
 */
router.get('/threads/:id', requireAuth, async (req, res) => {
  try {
    const thread = await prisma.thread.findFirst({
      where: { id: req.params.id },
      include: {
        workspace: { select: { userId: true } },
        messages: { orderBy: { createdAt: 'asc' } }
      }
    });

    if (!thread || thread.workspace.userId !== req.user.id) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const { workspace, ...threadData } = thread;
    res.json({ thread: threadData });
  } catch (error) {
    console.error('Get thread error:', error);
    res.status(500).json({ error: 'Failed to get thread' });
  }
});

/**
 * POST /api/workspaces/:workspaceId/threads
 * Create new thread
 */
router.post('/workspaces/:workspaceId/threads', requireAuth, async (req, res) => {
  try {
    const { title } = req.body;

    // Verify workspace ownership
    const workspace = await prisma.workspace.findFirst({
      where: { id: req.params.workspaceId, userId: req.user.id }
    });

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const thread = await prisma.thread.create({
      data: {
        workspaceId: req.params.workspaceId,
        title: title?.trim() || 'New Thread'
      }
    });

    res.status(201).json({
      thread: {
        ...thread,
        messageCount: 0
      }
    });
  } catch (error) {
    console.error('Create thread error:', error);
    res.status(500).json({ error: 'Failed to create thread' });
  }
});

/**
 * PUT /api/threads/:id
 * Update thread
 */
router.put('/threads/:id', requireAuth, async (req, res) => {
  try {
    const { title, summary, status } = req.body;

    // Verify ownership through workspace
    const existing = await prisma.thread.findFirst({
      where: { id: req.params.id },
      include: { workspace: { select: { userId: true } } }
    });

    if (!existing || existing.workspace.userId !== req.user.id) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (summary !== undefined) updateData.summary = summary?.trim();
    if (status !== undefined) updateData.status = status;

    const thread = await prisma.thread.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json({ thread });
  } catch (error) {
    console.error('Update thread error:', error);
    res.status(500).json({ error: 'Failed to update thread' });
  }
});

/**
 * POST /api/threads/:id/pin
 * Pin thread
 */
router.post('/threads/:id/pin', requireAuth, async (req, res) => {
  try {
    const existing = await prisma.thread.findFirst({
      where: { id: req.params.id },
      include: { workspace: { select: { userId: true } } }
    });

    if (!existing || existing.workspace.userId !== req.user.id) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    await prisma.thread.update({
      where: { id: req.params.id },
      data: { status: 'pinned' }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Pin thread error:', error);
    res.status(500).json({ error: 'Failed to pin thread' });
  }
});

/**
 * POST /api/threads/:id/archive
 * Archive thread
 */
router.post('/threads/:id/archive', requireAuth, async (req, res) => {
  try {
    const existing = await prisma.thread.findFirst({
      where: { id: req.params.id },
      include: { workspace: { select: { userId: true } } }
    });

    if (!existing || existing.workspace.userId !== req.user.id) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    await prisma.thread.update({
      where: { id: req.params.id },
      data: { status: 'archived' }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Archive thread error:', error);
    res.status(500).json({ error: 'Failed to archive thread' });
  }
});

/**
 * DELETE /api/threads/:id
 * Delete thread
 */
router.delete('/threads/:id', requireAuth, async (req, res) => {
  try {
    const existing = await prisma.thread.findFirst({
      where: { id: req.params.id },
      include: { workspace: { select: { userId: true } } }
    });

    if (!existing || existing.workspace.userId !== req.user.id) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    await prisma.$transaction([
      prisma.message.deleteMany({ where: { threadId: req.params.id } }),
      prisma.thread.delete({ where: { id: req.params.id } })
    ]);

    res.json({ success: true, message: 'Thread deleted' });
  } catch (error) {
    console.error('Delete thread error:', error);
    res.status(500).json({ error: 'Failed to delete thread' });
  }
});

module.exports = router;
