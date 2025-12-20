const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'relativity-secret-key-change-in-production';

// Initialize SQLite database
const db = new Database(path.join(__dirname, 'relativity.db'));

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    api_provider TEXT,
    api_key_encrypted TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS workspaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    issue_tree TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (thread_id) REFERENCES threads(id)
  );

  CREATE TABLE IF NOT EXISTS verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    used INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Middleware
app.use(cors());
app.use(express.json());

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Simple encryption for API keys (use proper encryption in production)
const encryptApiKey = (key) => {
  return Buffer.from(key).toString('base64');
};

const decryptApiKey = (encrypted) => {
  return Buffer.from(encrypted, 'base64').toString('utf-8');
};

// Demo verification code (fixed for local testing)
const DEMO_VERIFICATION_CODE = '677485';

// Generate 6-digit verification code
// Demo mode: always use fixed code for easier testing.
// NOTE: For real production use, replace this with a random generator.
const generateVerificationCode = () => {
  return DEMO_VERIFICATION_CODE;
};

// ============================================
// AUTH ROUTES
// ============================================

// Step 1: Request verification code
app.post('/api/auth/request-code', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete old codes for this email
    db.prepare('DELETE FROM verification_codes WHERE email = ?').run(email);
    
    // Insert new code
    db.prepare(
      'INSERT INTO verification_codes (email, code, expires_at) VALUES (?, ?, ?)'
    ).run(email, code, expiresAt.toISOString());

    // In production, send email here
    // For demo, we'll return the code (remove in production!)
    console.log(`Verification code for ${email}: ${code}`);
    
    res.json({ 
      message: 'Verification code sent',
      // Remove this in production - only for demo
      demo_code: code 
    });
  } catch (error) {
    console.error('Request code error:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

// Step 2: Verify code and check if user exists
app.post('/api/auth/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    // Demo shortcut: accept the fixed demo code without checking DB
    if (code === DEMO_VERIFICATION_CODE) {
      // Check if user exists
      const existingUser = db.prepare('SELECT id, email, name FROM users WHERE email = ?').get(email);

      if (existingUser) {
        const token = jwt.sign({ id: existingUser.id, email: existingUser.email }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({
          status: 'existing_user',
          token,
          user: existingUser
        });
      }

      // New user - need to complete registration
      return res.json({
        status: 'new_user',
        email,
        verified: true
      });
    }

    const verification = db.prepare(
      'SELECT * FROM verification_codes WHERE email = ? AND code = ? AND used = 0 AND expires_at > datetime("now")'
    ).get(email, code);

    if (!verification) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // Mark code as used
    db.prepare('UPDATE verification_codes SET used = 1 WHERE id = ?').run(verification.id);

    // Check if user exists
    const existingUser = db.prepare('SELECT id, email, name FROM users WHERE email = ?').get(email);

    if (existingUser) {
      // User exists - log them in
      const token = jwt.sign({ id: existingUser.id, email: existingUser.email }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({
        status: 'existing_user',
        token,
        user: existingUser
      });
    }

    // New user - need to complete registration
    res.json({
      status: 'new_user',
      email,
      verified: true
    });
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

// Step 3: Complete registration for new users
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Email, name, and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // In demo mode, we skip strict verification-code checks here.
    // NOTE: For real production, restore a proper verification lookup.

    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = db.prepare(
      'INSERT INTO users (email, name, password) VALUES (?, ?, ?)'
    ).run(email, name, hashedPassword);

    const token = jwt.sign({ id: result.lastInsertRowid, email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: result.lastInsertRowid, email, name }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Login with password (for returning users)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, email, name, api_provider FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user: { ...user, hasApiKey: !!user.api_provider } });
});

// ============================================
// API KEY ROUTES
// ============================================

// Save API key
app.post('/api/settings/api-key', authenticateToken, (req, res) => {
  try {
    const { provider, apiKey } = req.body;

    if (!provider || !apiKey) {
      return res.status(400).json({ error: 'Provider and API key are required' });
    }

    if (!['anthropic', 'openai', 'gemini'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    const encrypted = encryptApiKey(apiKey);
    db.prepare(
      'UPDATE users SET api_provider = ?, api_key_encrypted = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(provider, encrypted, req.user.id);

    res.json({ message: 'API key saved successfully' });
  } catch (error) {
    console.error('Save API key error:', error);
    res.status(500).json({ error: 'Failed to save API key' });
  }
});

// Get API key status
app.get('/api/settings/api-key', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT api_provider, api_key_encrypted FROM users WHERE id = ?').get(req.user.id);
  res.json({
    hasApiKey: !!user.api_key_encrypted,
    provider: user.api_provider
  });
});

// ============================================
// AI PROXY ROUTES
// ============================================

const SYSTEM_PROMPT = `You are Relativity AI, an intelligent research assistant that helps users explore complex topics through structured thinking.

Your role is to:
1. Help users investigate topics thoroughly
2. Identify key questions and sub-questions
3. Provide well-structured, insightful responses
4. Track what has been discussed and what remains to explore

When responding:
- Be thorough but concise
- Identify related questions that might need exploration
- Summarize conclusions clearly
- Suggest next areas to investigate

Always aim to help users build a complete understanding of their topic.`;

// Chat endpoint
app.post('/api/ai/chat', authenticateToken, async (req, res) => {
  try {
    const { messages } = req.body;
    
    const user = db.prepare('SELECT api_provider, api_key_encrypted FROM users WHERE id = ?').get(req.user.id);
    
    if (!user.api_key_encrypted) {
      return res.status(400).json({ error: 'API key not configured' });
    }

    const apiKey = decryptApiKey(user.api_key_encrypted);
    const provider = user.api_provider;

    const formattedMessages = messages.map(m => ({
      role: m.role === 'ai' ? 'assistant' : m.role,
      content: m.content
    }));

    let response;

    if (provider === 'anthropic') {
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: formattedMessages,
        }),
      });
      const data = await anthropicRes.json();
      if (data.error) throw new Error(data.error.message);
      response = data.content[0].text;
    } 
    else if (provider === 'openai') {
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...formattedMessages],
          max_tokens: 4096,
        }),
      });
      const data = await openaiRes.json();
      if (data.error) throw new Error(data.error.message);
      response = data.choices[0].message.content;
    } 
    else if (provider === 'gemini') {
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
            ...formattedMessages.map(m => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }]
            }))
          ],
        }),
      });
      const data = await geminiRes.json();
      if (data.error) throw new Error(data.error.message);
      response = data.candidates[0].content.parts[0].text;
    }

    res.json({ response });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: error.message || 'Failed to get AI response' });
  }
});

// Extract issues endpoint
app.post('/api/ai/extract-issues', authenticateToken, async (req, res) => {
  try {
    const { messages, currentTree } = req.body;
    
    const user = db.prepare('SELECT api_provider, api_key_encrypted FROM users WHERE id = ?').get(req.user.id);
    
    if (!user.api_key_encrypted) {
      return res.status(400).json({ error: 'API key not configured' });
    }

    const apiKey = decryptApiKey(user.api_key_encrypted);
    const provider = user.api_provider;

    const prompt = `Analyze this conversation and extract key discussion points as an issue tree.

Conversation:
${messages.map(m => `${m.role}: ${m.content}`).join('\n\n')}

Current issue tree:
${JSON.stringify(currentTree, null, 2)}

Return ONLY valid JSON (no markdown) in this format:
{
  "id": "root",
  "label": "Main Topic",
  "status": "active",
  "children": [
    {
      "id": "unique-id",
      "label": "Sub Topic",
      "status": "completed|active|pending",
      "children": []
    }
  ]
}

Status meanings:
- "completed": Topic has been thoroughly discussed and concluded
- "active": Currently being discussed
- "pending": Identified but not yet discussed`;

    let response;

    if (provider === 'anthropic') {
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: 'You are a JSON-only response bot. Return only valid JSON, no markdown, no explanation.',
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await anthropicRes.json();
      if (data.error) throw new Error(data.error.message);
      response = data.content[0].text;
    } 
    else if (provider === 'openai') {
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are a JSON-only response bot. Return only valid JSON, no markdown, no explanation.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 4096,
        }),
      });
      const data = await openaiRes.json();
      if (data.error) throw new Error(data.error.message);
      response = data.choices[0].message.content;
    } 
    else if (provider === 'gemini') {
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        }),
      });
      const data = await geminiRes.json();
      if (data.error) throw new Error(data.error.message);
      response = data.candidates[0].content.parts[0].text;
    }

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const tree = JSON.parse(jsonMatch[0]);
      res.json({ tree });
    } else {
      res.json({ tree: currentTree });
    }
  } catch (error) {
    console.error('Extract issues error:', error);
    res.json({ tree: req.body.currentTree });
  }
});

// ============================================
// WORKSPACE ROUTES
// ============================================

// Get all workspaces
app.get('/api/workspaces', authenticateToken, (req, res) => {
  const workspaces = db.prepare(`
    SELECT w.*, COUNT(t.id) as thread_count 
    FROM workspaces w 
    LEFT JOIN threads t ON w.id = t.workspace_id 
    WHERE w.user_id = ? 
    GROUP BY w.id 
    ORDER BY w.updated_at DESC
  `).all(req.user.id);
  
  res.json({ workspaces: workspaces.map(w => ({ ...w, issueTree: JSON.parse(w.issue_tree || '{}') })) });
});

// Create workspace
app.post('/api/workspaces', authenticateToken, (req, res) => {
  const { name } = req.body;
  const defaultTree = JSON.stringify({ id: 'root', label: name || 'Research Topic', status: 'pending', children: [] });
  
  const result = db.prepare(
    'INSERT INTO workspaces (user_id, name, issue_tree) VALUES (?, ?, ?)'
  ).run(req.user.id, name || 'New Research', defaultTree);
  
  res.json({ 
    workspace: { 
      id: result.lastInsertRowid, 
      name: name || 'New Research', 
      issueTree: JSON.parse(defaultTree),
      thread_count: 0 
    } 
  });
});

// Update workspace
app.put('/api/workspaces/:id', authenticateToken, (req, res) => {
  const { name, issueTree } = req.body;
  
  db.prepare(
    'UPDATE workspaces SET name = COALESCE(?, name), issue_tree = COALESCE(?, issue_tree), updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?'
  ).run(name, issueTree ? JSON.stringify(issueTree) : null, req.params.id, req.user.id);
  
  res.json({ message: 'Workspace updated' });
});

// Delete workspace
app.delete('/api/workspaces/:id', authenticateToken, (req, res) => {
  db.prepare('DELETE FROM messages WHERE thread_id IN (SELECT id FROM threads WHERE workspace_id = ?)').run(req.params.id);
  db.prepare('DELETE FROM threads WHERE workspace_id = ?').run(req.params.id);
  db.prepare('DELETE FROM workspaces WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Workspace deleted' });
});

// ============================================
// THREAD ROUTES
// ============================================

// Get threads for workspace
app.get('/api/workspaces/:workspaceId/threads', authenticateToken, (req, res) => {
  const threads = db.prepare(`
    SELECT t.*, COUNT(m.id) as message_count 
    FROM threads t 
    LEFT JOIN messages m ON t.id = m.thread_id 
    WHERE t.workspace_id = ? 
    GROUP BY t.id 
    ORDER BY t.updated_at DESC
  `).all(req.params.workspaceId);
  
  res.json({ threads });
});

// Create thread
app.post('/api/workspaces/:workspaceId/threads', authenticateToken, (req, res) => {
  const { title } = req.body;
  
  const result = db.prepare(
    'INSERT INTO threads (workspace_id, title) VALUES (?, ?)'
  ).run(req.params.workspaceId, title || 'New Thread');
  
  res.json({ thread: { id: result.lastInsertRowid, title: title || 'New Thread', message_count: 0 } });
});

// Update thread
app.put('/api/threads/:id', authenticateToken, (req, res) => {
  const { title } = req.body;
  db.prepare('UPDATE threads SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(title, req.params.id);
  res.json({ message: 'Thread updated' });
});

// ============================================
// MESSAGE ROUTES
// ============================================

// Get messages for thread
app.get('/api/threads/:threadId/messages', authenticateToken, (req, res) => {
  const messages = db.prepare(
    'SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at ASC'
  ).all(req.params.threadId);
  
  res.json({ messages });
});

// Add message
app.post('/api/threads/:threadId/messages', authenticateToken, (req, res) => {
  const { role, content } = req.body;
  
  const result = db.prepare(
    'INSERT INTO messages (thread_id, role, content) VALUES (?, ?, ?)'
  ).run(req.params.threadId, role, content);
  
  db.prepare('UPDATE threads SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.threadId);
  
  res.json({ message: { id: result.lastInsertRowid, role, content } });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`Relativity server running on port ${PORT}`);
});
