const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { requireAuth } = require('../middleware/auth.middleware');

/**
 * GET /api/workspaces
 * List all workspaces for current user
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { archived = 'false' } = req.query;

    const workspaces = await prisma.workspace.findMany({
      where: {
        userId: req.user.id,
        archivedAt: archived === 'true' ? { not: null } : null
      },
      include: {
        _count: {
          select: { threads: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const formatted = workspaces.map(w => ({
      id: w.id,
      name: w.name,
      description: w.description,
      color: w.color,
      icon: w.icon,
      issueTree: w.issueTree,
      threadCount: w._count.threads,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
      archivedAt: w.archivedAt
    }));

    res.json({ workspaces: formatted });
  } catch (error) {
    console.error('List workspaces error:', error);
    res.status(500).json({ error: 'Failed to list workspaces' });
  }
});

/**
 * GET /api/workspaces/:id
 * Get single workspace
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: {
        threads: {
          orderBy: { updatedAt: 'desc' },
          include: {
            _count: {
              select: { messages: true }
            }
          }
        }
      }
    });

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    res.json({
      workspace: {
        ...workspace,
        threads: workspace.threads.map(t => ({
          ...t,
          messageCount: t._count.messages
        }))
      }
    });
  } catch (error) {
    console.error('Get workspace error:', error);
    res.status(500).json({ error: 'Failed to get workspace' });
  }
});

/**
 * POST /api/workspaces
 * Create new workspace
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Workspace name is required' });
    }

    const defaultTree = {
      id: 'root',
      label: name.trim(),
      status: 'pending',
      children: []
    };

    const workspace = await prisma.workspace.create({
      data: {
        userId: req.user.id,
        name: name.trim(),
        description: description?.trim(),
        color,
        icon,
        issueTree: defaultTree
      }
    });

    res.status(201).json({
      workspace: {
        ...workspace,
        threadCount: 0
      }
    });
  } catch (error) {
    console.error('Create workspace error:', error);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
});

/**
 * PUT /api/workspaces/:id
 * Update workspace
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { name, description, color, icon, issueTree } = req.body;

    // Verify ownership
    const existing = await prisma.workspace.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;
    if (issueTree !== undefined) updateData.issueTree = issueTree;

    const workspace = await prisma.workspace.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json({ workspace });
  } catch (error) {
    console.error('Update workspace error:', error);
    res.status(500).json({ error: 'Failed to update workspace' });
  }
});

/**
 * POST /api/workspaces/:id/archive
 * Archive workspace
 */
router.post('/:id/archive', requireAuth, async (req, res) => {
  try {
    const workspace = await prisma.workspace.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { archivedAt: new Date() }
    });

    if (workspace.count === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    res.json({ success: true, message: 'Workspace archived' });
  } catch (error) {
    console.error('Archive workspace error:', error);
    res.status(500).json({ error: 'Failed to archive workspace' });
  }
});

/**
 * POST /api/workspaces/:id/restore
 * Restore archived workspace
 */
router.post('/:id/restore', requireAuth, async (req, res) => {
  try {
    const workspace = await prisma.workspace.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { archivedAt: null }
    });

    if (workspace.count === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    res.json({ success: true, message: 'Workspace restored' });
  } catch (error) {
    console.error('Restore workspace error:', error);
    res.status(500).json({ error: 'Failed to restore workspace' });
  }
});

/**
 * DELETE /api/workspaces/:id
 * Permanently delete workspace
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    // Verify ownership
    const existing = await prisma.workspace.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Delete in order due to foreign keys
    await prisma.$transaction([
      prisma.message.deleteMany({
        where: { thread: { workspaceId: req.params.id } }
      }),
      prisma.thread.deleteMany({
        where: { workspaceId: req.params.id }
      }),
      prisma.workspace.delete({
        where: { id: req.params.id }
      })
    ]);

    res.json({ success: true, message: 'Workspace deleted' });
  } catch (error) {
    console.error('Delete workspace error:', error);
    res.status(500).json({ error: 'Failed to delete workspace' });
  }
});

module.exports = router;
