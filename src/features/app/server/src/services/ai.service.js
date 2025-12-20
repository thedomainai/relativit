const { decrypt } = require('../utils/encryption');
const prisma = require('../utils/prisma');

const SYSTEM_PROMPT = `You are Relativit AI, an intelligent research assistant that helps users explore complex topics through structured thinking.

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

const ISSUE_EXTRACTION_PROMPT = `Analyze this conversation and extract key discussion points as an issue tree.

Return ONLY valid JSON (no markdown, no explanation) in this exact format:
{
  "id": "root",
  "label": "Main Topic",
  "status": "active",
  "children": [
    {
      "id": "unique-id-1",
      "label": "Sub Topic",
      "status": "completed|active|pending",
      "children": []
    }
  ]
}

Status meanings:
- "completed": Topic has been thoroughly discussed and concluded
- "active": Currently being discussed
- "pending": Identified but not yet discussed

Rules:
- Generate unique IDs for new nodes
- Preserve existing IDs for nodes that haven't changed
- Update statuses based on conversation progress
- Keep labels concise (under 60 characters)
- Nest related topics appropriately`;

class AIService {
  constructor() {
    this.providers = {
      anthropic: {
        url: 'https://api.anthropic.com/v1/messages',
        model: 'claude-sonnet-4-20250514',
        headerKey: 'x-api-key'
      },
      openai: {
        url: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o',
        headerKey: 'Authorization',
        headerPrefix: 'Bearer '
      },
      gemini: {
        urlTemplate: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=',
        model: 'gemini-1.5-flash'
      }
    };
  }

  /**
   * Get decrypted API key for user
   * If trial mode is enabled, use Relativit's API key
   */
  async getApiKey(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        apiProvider: true,
        apiKeyEncrypted: true,
        apiKeyIv: true,
        useTrialMode: true,
        trialCredits: true
      }
    });

    // If trial mode is enabled, use Relativit's API key
    if (user?.useTrialMode && user.trialCredits > 0) {
      const relativitApiKey = process.env.RELATIVIT_API_KEY;
      const relativitProvider = process.env.RELATIVIT_API_PROVIDER || 'anthropic';
      
      if (!relativitApiKey) {
        throw new Error('Trial mode is enabled but Relativit API key is not configured');
      }

      return { 
        provider: relativitProvider, 
        apiKey: relativitApiKey,
        isTrialMode: true
      };
    }

    // Otherwise, use user's own API key
    if (!user?.apiKeyEncrypted || !user?.apiKeyIv) {
      throw new Error('API key not configured');
    }

    const apiKey = decrypt(
      user.apiKeyEncrypted,
      user.apiKeyIv,
      process.env.ENCRYPTION_KEY
    );

    return { provider: user.apiProvider, apiKey, isTrialMode: false };
  }

  /**
   * Send chat message to AI
   */
  async chat(userId, messages, options = {}) {
    const startTime = Date.now();
    const { provider, apiKey, isTrialMode } = await this.getApiKey(userId);
    
    // Check and deduct credits if in trial mode
    if (isTrialMode) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { trialCredits: true }
      });
      
      if (!user || user.trialCredits <= 0) {
        throw new Error('Trial credits exhausted. Please add your own API key to continue.');
      }
    }

    const formattedMessages = messages.map(m => ({
      role: m.role === 'ai' || m.role === 'assistant' ? 'assistant' : m.role,
      content: m.content
    }));

    let response, model, tokens;

    try {
      if (provider === 'anthropic') {
        const result = await this.callAnthropic(apiKey, formattedMessages, options);
        response = result.content[0].text;
        model = result.model;
        tokens = result.usage?.input_tokens + result.usage?.output_tokens;
      } else if (provider === 'openai') {
        const result = await this.callOpenAI(apiKey, formattedMessages, options);
        response = result.choices[0].message.content;
        model = result.model;
        tokens = result.usage?.total_tokens;
      } else if (provider === 'gemini') {
        const result = await this.callGemini(apiKey, formattedMessages, options);
        response = result.candidates[0].content.parts[0].text;
        model = 'gemini-1.5-flash';
        tokens = result.usageMetadata?.totalTokenCount;
      } else {
        throw new Error(`Unknown provider: ${provider}`);
      }

      // Calculate estimated cost (rough estimate: $0.50 per 1M tokens)
      const estimatedCost = tokens ? (tokens / 1000000) * 0.5 : 0;
      
      // Deduct credits if in trial mode
      if (isTrialMode) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            trialCredits: {
              decrement: estimatedCost
            }
          }
        });
      }

      // Log API usage
      await this.logUsage(userId, provider, model, 'chat', tokens, Date.now() - startTime, true, estimatedCost);

      return { 
        response, 
        model, 
        tokens,
        isTrialMode 
      };
    } catch (error) {
      await this.logUsage(userId, provider, model || 'unknown', 'chat', 0, Date.now() - startTime, false, error.message);
      throw error;
    }
  }

  /**
   * Extract issues from conversation
   */
  async extractIssues(userId, messages, currentTree) {
    const startTime = Date.now();
    const { provider, apiKey, isTrialMode } = await this.getApiKey(userId);
    
    // Check and deduct credits if in trial mode
    if (isTrialMode) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { trialCredits: true }
      });
      
      if (!user || user.trialCredits <= 0) {
        // Return current tree if credits exhausted
        return currentTree;
      }
    }

    const conversationText = messages
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    const prompt = `${ISSUE_EXTRACTION_PROMPT}

Conversation:
${conversationText}

Current issue tree:
${JSON.stringify(currentTree, null, 2)}

Return the updated issue tree as JSON:`;

    let response, model;

    try {
      if (provider === 'anthropic') {
        const result = await this.callAnthropic(apiKey, [{ role: 'user', content: prompt }], {
          systemPrompt: 'You are a JSON-only response bot. Return only valid JSON, no markdown, no explanation.'
        });
        response = result.content[0].text;
        model = result.model;
      } else if (provider === 'openai') {
        const result = await this.callOpenAI(apiKey, [{ role: 'user', content: prompt }], {
          systemPrompt: 'You are a JSON-only response bot. Return only valid JSON, no markdown, no explanation.'
        });
        response = result.choices[0].message.content;
        model = result.model;
      } else if (provider === 'gemini') {
        const result = await this.callGemini(apiKey, [{ role: 'user', content: prompt }]);
        response = result.candidates[0].content.parts[0].text;
        model = 'gemini-1.5-flash';
      }

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const tree = JSON.parse(jsonMatch[0]);
        await this.logUsage(userId, provider, model || 'unknown', 'extract_issues', 0, Date.now() - startTime, true, null);
        return tree;
      }

      return currentTree;
    } catch (error) {
      console.error('Issue extraction failed:', error);
      await this.logUsage(userId, provider, model || 'unknown', 'extract_issues', 0, Date.now() - startTime, false, null, error.message);
      return currentTree;
    }
  }

  /**
   * Validate API key
   */
  async validateApiKey(provider, apiKey) {
    try {
      const testMessage = [{ role: 'user', content: 'Hello, respond with just "OK".' }];

      if (provider === 'anthropic') {
        await this.callAnthropic(apiKey, testMessage, { maxTokens: 10 });
      } else if (provider === 'openai') {
        await this.callOpenAI(apiKey, testMessage, { maxTokens: 10 });
      } else if (provider === 'gemini') {
        await this.callGemini(apiKey, testMessage, { maxTokens: 10 });
      } else {
        throw new Error(`Unknown provider: ${provider}`);
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Provider-specific API calls
   */
  async callAnthropic(apiKey, messages, options = {}) {
    const response = await fetch(this.providers.anthropic.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.providers.anthropic.model,
        max_tokens: options.maxTokens || 4096,
        system: options.systemPrompt || SYSTEM_PROMPT,
        messages
      })
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }
    return data;
  }

  async callOpenAI(apiKey, messages, options = {}) {
    const allMessages = [
      { role: 'system', content: options.systemPrompt || SYSTEM_PROMPT },
      ...messages
    ];

    const response = await fetch(this.providers.openai.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: this.providers.openai.model,
        max_tokens: options.maxTokens || 4096,
        messages: allMessages
      })
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }
    return data;
  }

  async callGemini(apiKey, messages, options = {}) {
    const url = `${this.providers.gemini.urlTemplate}${apiKey}`;
    
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // Add system prompt as first user message if provided
    if (options.systemPrompt || SYSTEM_PROMPT) {
      contents.unshift({
        role: 'user',
        parts: [{ text: options.systemPrompt || SYSTEM_PROMPT }]
      });
      contents.splice(1, 0, {
        role: 'model',
        parts: [{ text: 'Understood. I will follow these instructions.' }]
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: options.maxTokens || 4096
        }
      })
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }
    return data;
  }

  /**
   * Log API usage
   */
  async logUsage(userId, provider, model, endpoint, tokens, duration, success, cost = null, error = null) {
    try {
      await prisma.apiUsage.create({
        data: {
          userId,
          provider,
          model,
          endpoint,
          tokens: tokens || 0,
          cost: cost || null,
          duration,
          success,
          error
        }
      });
    } catch (e) {
      console.error('Failed to log API usage:', e);
    }
  }
}

module.exports = new AIService();
