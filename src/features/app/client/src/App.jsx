import React, { useState, useEffect, useRef, createContext, useContext } from 'react';

// ============================================
// CONFIG
// ============================================

// ============================================
// COLOR PALETTE
// ============================================
const colors = {
  primary: { main: '#6366f1', light: '#818cf8', dark: '#4f46e5', contrast: '#ffffff' },
  secondary: { main: '#8b5cf6', light: '#a78bfa', dark: '#7c3aed', contrast: '#ffffff' },
  accent: { main: '#f59e0b', light: '#fbbf24', dark: '#d97706', contrast: '#000000' },
  status: { completed: '#10b981', active: '#f59e0b', pending: '#64748b' },
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  chat: {
    userBg: '#24262a',
    userText: '#e3e3e3',
  },
  neutral: {
    50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
    400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
    800: '#1e293b', 900: '#0f172a', 950: '#020617',
  },
  bg: {
    primary: '#0a0a0f', secondary: '#0f1419', tertiary: '#1a1a24',
    elevated: 'rgba(255,255,255,0.03)', hover: 'rgba(255,255,255,0.06)',
  },
  border: { subtle: 'rgba(255,255,255,0.06)', default: 'rgba(255,255,255,0.1)', strong: 'rgba(255,255,255,0.2)' },
};

// ============================================
// API CLIENT
// ============================================
const api = {
  token: localStorage.getItem('relativit_token'),
  refreshToken: localStorage.getItem('relativit_refresh_token'),
  isRefreshing: false,
  refreshPromise: null,
  
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('relativit_token', token);
    } else {
      localStorage.removeItem('relativit_token');
    }
  },

  setRefreshToken(refreshToken) {
    this.refreshToken = refreshToken;
    if (refreshToken) {
      localStorage.setItem('relativit_refresh_token', refreshToken);
    } else {
      localStorage.removeItem('relativit_refresh_token');
    }
  },

  async refreshAccessToken() {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    this.isRefreshing = true;
    this.refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Refresh failed');
        }
        this.setToken(data.accessToken);
        if (data.refreshToken) {
          this.setRefreshToken(data.refreshToken);
        }
        return data.accessToken;
      })
      .finally(() => {
        this.isRefreshing = false;
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  },

  async request(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    let response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    
    let data = await response.json();
    
    // If access token expired, try to refresh
    if (response.status === 401 && data.code === 'TOKEN_EXPIRED') {
      try {
        const newToken = await this.refreshAccessToken();
        // Retry the original request with new token
        headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
        });
        data = await response.json();
      } catch (refreshError) {
        // Refresh failed - clear tokens and throw error
        this.setToken(null);
        this.setRefreshToken(null);
        throw new Error('Session expired. Please log in again.');
      }
    }
    
    if (!response.ok) {
      // Include details field if available (for API key validation errors)
      const error = new Error(data.error || data.details || 'Request failed');
      if (data.details) {
        error.details = data.details;
      }
      throw error;
    }
    
    return data;
  },

  // Auth
  requestCode: (email) => api.request('/auth/request-code', { method: 'POST', body: { email } }),
  verifyCode: (email, code) => api.request('/auth/verify-code', { method: 'POST', body: { email, code } }),
  register: (data) => api.request('/auth/register', { method: 'POST', body: data }),
  login: (email, password) => api.request('/auth/login', { method: 'POST', body: { email, password } }),
  refresh: (refreshToken) => api.request('/auth/refresh', { method: 'POST', body: { refreshToken } }),
  getMe: () => api.request('/auth/me'),

  // Settings
  saveApiKey: (provider, apiKey) => api.request('/settings/api-key', { method: 'POST', body: { provider, apiKey } }),
  getApiKeyStatus: () => api.request('/settings/api-key'),
  enableTrialMode: () => api.request('/settings/trial-mode/enable', { method: 'POST' }),

  // AI
  chat: (messages) => api.request('/ai/chat', { method: 'POST', body: { messages } }),
  extractIssues: (messages, currentTree) => api.request('/ai/extract-issues', { method: 'POST', body: { messages, currentTree } }),

  // Workspaces
  getWorkspaces: () => api.request('/workspaces'),
  createWorkspace: (name) => api.request('/workspaces', { method: 'POST', body: { name } }),
  updateWorkspace: (id, data) => api.request(`/workspaces/${id}`, { method: 'PUT', body: data }),
  deleteWorkspace: (id) => api.request(`/workspaces/${id}`, { method: 'DELETE' }),

  // Threads
  getThreads: (workspaceId) => api.request(`/workspaces/${workspaceId}/threads`),
  createThread: (workspaceId, title) => api.request(`/workspaces/${workspaceId}/threads`, { method: 'POST', body: { title } }),
  updateThread: (id, title) => api.request(`/threads/${id}`, { method: 'PUT', body: { title } }),

  // Messages
  getMessages: (threadId) => api.request(`/threads/${threadId}/messages`),
  addMessage: (threadId, role, content) => api.request(`/threads/${threadId}/messages`, { method: 'POST', body: { role, content } }),
};

// ============================================
// AUTH CONTEXT
// ============================================
const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [useTrialMode, setUseTrialMode] = useState(false);
  const [trialCredits, setTrialCredits] = useState(0);

  useEffect(() => {
    const init = async () => {
      if (api.token) {
        try {
          const { user } = await api.getMe();
          setUser(user);
          setHasApiKey(user.hasApiKey);
        } catch (error) {
          // If token expired and we have refresh token, try to refresh
          if (api.refreshToken && error.message.includes('expired')) {
            try {
              const newToken = await api.refreshAccessToken();
              const { user } = await api.getMe();
              setUser(user);
              setHasApiKey(user.hasApiKey);
            } catch (refreshError) {
              // Refresh failed - clear tokens
              api.setToken(null);
              api.setRefreshToken(null);
            }
          } else {
            api.setToken(null);
            api.setRefreshToken(null);
          }
        }
      } else if (api.refreshToken) {
        // No access token but have refresh token - try to refresh
        try {
          await api.refreshAccessToken();
          const { user } = await api.getMe();
          setUser(user);
          setHasApiKey(user.hasApiKey);
        } catch (refreshError) {
          // Refresh failed - clear tokens
          api.setToken(null);
          api.setRefreshToken(null);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = async (token, userData, refreshToken = null) => {
    api.setToken(token);
    if (refreshToken) {
      api.setRefreshToken(refreshToken);
    }
    setUser(userData);
    const status = await api.getApiKeyStatus();
    setHasApiKey(status.hasApiKey || status.useTrialMode);
    setUseTrialMode(status.useTrialMode || false);
    setTrialCredits(status.trialCredits || 0);
  };

  const logout = () => {
    api.setToken(null);
    api.setRefreshToken(null);
    setUser(null);
    setHasApiKey(false);
    setUseTrialMode(false);
    setTrialCredits(0);
  };

  const updateApiKeyStatus = (status) => {
    setHasApiKey(status);
  };

  const updateTrialMode = (enabled, credits) => {
    setUseTrialMode(enabled);
    setTrialCredits(credits || 0);
    if (enabled) {
      setHasApiKey(true);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      hasApiKey, 
      useTrialMode,
      trialCredits,
      login, 
      logout, 
      updateApiKeyStatus,
      updateTrialMode
    }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

// ============================================
// GLOBAL STYLES
// ============================================
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:wght@400;600;700&display=swap');
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: 'DM Sans', -apple-system, sans-serif;
      background: ${colors.bg.primary};
      color: ${colors.neutral[200]};
    }
    
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes highlightFade { from { background-color: rgba(245, 158, 11, 0.2); } to { background-color: transparent; } }
    
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${colors.neutral[700]}; border-radius: 3px; }
    
    input:focus { outline: none; border-color: ${colors.primary.main} !important; }
  `}</style>
);

// ============================================
// AUTH FLOW COMPONENTS
// ============================================

// Step 1: Email Input
const EmailStep = ({ onNext }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await api.requestCode(email);
      onNext(email);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 style={{ fontSize: '24px', fontWeight: '600', color: colors.neutral[50], marginBottom: '8px', textAlign: 'center' }}>
        Welcome to Relativit
      </h2>
      <p style={{ fontSize: '14px', color: colors.neutral[500], marginBottom: '32px', textAlign: 'center' }}>
        Enter your email to get started
      </p>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '12px', color: colors.neutral[400], marginBottom: '6px' }}>
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{
            width: '100%', padding: '14px 16px', background: colors.bg.secondary,
            border: `1px solid ${colors.border.default}`, borderRadius: '10px',
            color: colors.neutral[50], fontSize: '15px',
          }}
        />
      </div>

      {error && (
        <div style={{
          padding: '12px', background: `${colors.error}15`, border: `1px solid ${colors.error}30`,
          borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: colors.error,
        }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
          background: loading ? colors.neutral[700] : `linear-gradient(135deg, ${colors.primary.main}, ${colors.secondary.main})`,
          color: 'white', fontSize: '15px', fontWeight: '600', cursor: loading ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}
      >
        {loading && <span style={{ width: '18px', height: '18px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />}
        {loading ? 'Sending...' : 'Continue'}
      </button>
    </form>
  );
};

// Step 2: Verification Code
const VerifyCodeStep = ({ email, onVerified, onBack }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await api.verifyCode(email, code);
      
      if (result.status === 'existing_user') {
        // Existing user - log them in
        await login(result.accessToken || result.token, result.user, result.refreshToken);
      } else if (result.status === 'new_user') {
        // New user - go to registration screen
        onVerified(email);
      } else {
        // Fallback: if status is not clear, assume new user
        onVerified(email);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <button
        type="button"
        onClick={onBack}
        style={{
          background: 'none', border: 'none', color: colors.neutral[400],
          fontSize: '13px', cursor: 'pointer', marginBottom: '24px',
          display: 'flex', alignItems: 'center', gap: '4px',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back
      </button>

      <h2 style={{ fontSize: '24px', fontWeight: '600', color: colors.neutral[50], marginBottom: '8px', textAlign: 'center' }}>
        Check your email
      </h2>
      <p style={{ fontSize: '14px', color: colors.neutral[500], marginBottom: '8px', textAlign: 'center' }}>
        We sent a verification code to
      </p>
      <p style={{ fontSize: '14px', color: colors.neutral[300], marginBottom: '32px', textAlign: 'center', fontWeight: '500' }}>
        {email}
      </p>


      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '12px', color: colors.neutral[400], marginBottom: '6px' }}>
          Verification Code
        </label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          maxLength={6}
          style={{
            width: '100%', padding: '14px 16px', background: colors.bg.secondary,
            border: `1px solid ${colors.border.default}`, borderRadius: '10px',
            color: colors.neutral[50], fontSize: '24px', textAlign: 'center',
            letterSpacing: '0.5em', fontWeight: '600',
          }}
        />
      </div>

      {error && (
        <div style={{
          padding: '12px', background: `${colors.error}15`, border: `1px solid ${colors.error}30`,
          borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: colors.error,
        }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || code.length !== 6}
        style={{
          width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
          background: (loading || code.length !== 6) ? colors.neutral[700] : `linear-gradient(135deg, ${colors.primary.main}, ${colors.secondary.main})`,
          color: 'white', fontSize: '15px', fontWeight: '600', cursor: (loading || code.length !== 6) ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}
      >
        {loading && <span style={{ width: '18px', height: '18px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />}
        {loading ? 'Verifying...' : 'Verify'}
      </button>
    </form>
  );
};

// Step 3: Complete Registration
const RegisterStep = ({ email, onBack }) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await api.register({ email, name, password });
      await login(result.accessToken || result.token, result.user, result.refreshToken);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <button
        type="button"
        onClick={onBack}
        style={{
          background: 'none', border: 'none', color: colors.neutral[400],
          fontSize: '13px', cursor: 'pointer', marginBottom: '24px',
          display: 'flex', alignItems: 'center', gap: '4px',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back
      </button>

      <h2 style={{ fontSize: '24px', fontWeight: '600', color: colors.neutral[50], marginBottom: '8px', textAlign: 'center' }}>
        Create your account
      </h2>
      <p style={{ fontSize: '14px', color: colors.neutral[500], marginBottom: '32px', textAlign: 'center' }}>
        Just a few more details
      </p>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '12px', color: colors.neutral[400], marginBottom: '6px' }}>
          Your Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="John Doe"
          style={{
            width: '100%', padding: '14px 16px', background: colors.bg.secondary,
            border: `1px solid ${colors.border.default}`, borderRadius: '10px',
            color: colors.neutral[50], fontSize: '15px',
          }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '12px', color: colors.neutral[400], marginBottom: '6px' }}>
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          style={{
            width: '100%', padding: '14px 16px', background: colors.bg.secondary,
            border: `1px solid ${colors.border.default}`, borderRadius: '10px',
            color: colors.neutral[50], fontSize: '15px',
          }}
        />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '12px', color: colors.neutral[400], marginBottom: '6px' }}>
          Confirm Password
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repeat your password"
          style={{
            width: '100%', padding: '14px 16px', background: colors.bg.secondary,
            border: `1px solid ${colors.border.default}`, borderRadius: '10px',
            color: colors.neutral[50], fontSize: '15px',
          }}
        />
      </div>

      {error && (
        <div style={{
          padding: '12px', background: `${colors.error}15`, border: `1px solid ${colors.error}30`,
          borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: colors.error,
        }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
          background: loading ? colors.neutral[700] : `linear-gradient(135deg, ${colors.primary.main}, ${colors.secondary.main})`,
          color: 'white', fontSize: '15px', fontWeight: '600', cursor: loading ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}
      >
        {loading && <span style={{ width: '18px', height: '18px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />}
        {loading ? 'Creating account...' : 'Create Account'}
      </button>
    </form>
  );
};

// Auth Container
const AuthScreen = () => {
  const [step, setStep] = useState('email'); // email, verify, register
  const [email, setEmail] = useState('');

  const handleEmailNext = (emailValue) => {
    setEmail(emailValue);
    setStep('verify');
  };

  const handleVerified = (emailValue) => {
    setEmail(emailValue);
    setStep('register');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(145deg, ${colors.bg.primary} 0%, ${colors.bg.secondary} 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div style={{
        width: '100%', maxWidth: '420px', padding: '40px',
        background: colors.bg.elevated, borderRadius: '20px',
        border: `1px solid ${colors.border.subtle}`,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '16px',
            background: `linear-gradient(135deg, ${colors.primary.main}, ${colors.secondary.main})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: `0 8px 32px ${colors.primary.main}30`,
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', fontFamily: '"Fraunces", serif', color: colors.neutral[50] }}>
            Relativit
          </h1>
        </div>

        {step === 'email' && <EmailStep onNext={handleEmailNext} />}
        {step === 'verify' && <VerifyCodeStep email={email} onVerified={handleVerified} onBack={() => setStep('email')} />}
        {step === 'register' && <RegisterStep email={email} onBack={() => setStep('email')} />}
      </div>
    </div>
  );
};

// ============================================
// API KEY SETUP
// ============================================
const ApiKeySetup = () => {
  const [provider, setProvider] = useState('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const { updateApiKeyStatus, updateTrialMode } = useAuth();

  const providers = [
    { id: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-...' },
    { id: 'openai', name: 'OpenAI', placeholder: 'sk-...' },
    { id: 'gemini', name: 'Gemini', placeholder: 'AI...' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!apiKey) {
      setError('Please enter your API key');
      return;
    }

    setLoading(true);
    setError('');
    setWarning('');

    try {
      const result = await api.saveApiKey(provider, apiKey);
      updateApiKeyStatus(true);
      
      // Show warning if quota exceeded but key is saved
      if (result.warning) {
        setWarning(result.warning);
        // Clear error if warning is shown (key was saved successfully)
        setError('');
      }
    } catch (err) {
      // Check if error has details field
      const errorMessage = err.details || err.message || 'Failed to save API key';
      setError(errorMessage);
      setWarning('');
    } finally {
      setLoading(false);
    }
  };

  const handleTrialMode = async () => {
    setTrialLoading(true);
    setError('');

    try {
      const result = await api.enableTrialMode();
      updateTrialMode(true, result.trialCredits);
    } catch (err) {
      setError(err.message || 'Failed to enable trial mode');
    } finally {
      setTrialLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(145deg, ${colors.bg.primary} 0%, ${colors.bg.secondary} 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div style={{
        width: '100%', maxWidth: '480px', padding: '40px',
        background: colors.bg.elevated, borderRadius: '20px',
        border: `1px solid ${colors.border.subtle}`,
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '16px',
            background: `linear-gradient(135deg, ${colors.primary.main}, ${colors.secondary.main})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '600', color: colors.neutral[50], marginBottom: '8px' }}>
            Connect Your AI
          </h2>
          <p style={{ fontSize: '14px', color: colors.neutral[500] }}>
            Enter your API key to power Relativit
          </p>
        </div>

        {/* Trial Mode Option */}
        <div style={{
          padding: '20px', background: `${colors.primary.main}10`,
          border: `1px solid ${colors.primary.main}30`, borderRadius: '12px',
          marginBottom: '24px', textAlign: 'center'
        }}>
          <p style={{ fontSize: '14px', color: colors.neutral[300], marginBottom: '12px' }}>
            Want to try Relativit first?
          </p>
          <button
            type="button"
            onClick={handleTrialMode}
            disabled={trialLoading}
            style={{
              width: '100%', padding: '12px 24px', borderRadius: '10px',
              background: `linear-gradient(135deg, ${colors.primary.main}, ${colors.secondary.main})`,
              border: 'none', color: 'white', fontSize: '14px', fontWeight: '600',
              cursor: trialLoading ? 'not-allowed' : 'pointer',
              opacity: trialLoading ? 0.6 : 1,
            }}
          >
            {trialLoading ? 'Enabling...' : 'Try Relativit Now'}
          </button>
          <p style={{ fontSize: '11px', color: colors.neutral[600], marginTop: '8px' }}>
            No API key required to get started
          </p>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', marginBottom: '24px',
          color: colors.neutral[500], fontSize: '13px'
        }}>
          <div style={{ flex: 1, height: '1px', background: colors.border.default }} />
          <span style={{ padding: '0 12px' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: colors.border.default }} />
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: colors.neutral[400], marginBottom: '8px' }}>
              AI Provider
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {providers.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProvider(p.id)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '10px',
                    background: provider === p.id ? `${colors.primary.main}20` : colors.bg.secondary,
                    border: `1px solid ${provider === p.id ? colors.primary.main : colors.border.default}`,
                    color: provider === p.id ? colors.primary.light : colors.neutral[400],
                    fontSize: '13px', fontWeight: '500', cursor: 'pointer',
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: colors.neutral[400], marginBottom: '6px' }}>
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={providers.find(p => p.id === provider)?.placeholder}
              style={{
                width: '100%', padding: '14px 16px', background: colors.bg.secondary,
                border: `1px solid ${colors.border.default}`, borderRadius: '10px',
                color: colors.neutral[50], fontSize: '15px',
              }}
            />
            <p style={{ fontSize: '11px', color: colors.neutral[600], marginTop: '8px' }}>
              Your API key is encrypted and stored securely on our servers
            </p>
          </div>

          {error && (
            <div style={{
              padding: '12px', background: `${colors.error}15`, border: `1px solid ${colors.error}30`,
              borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: colors.error,
            }}>
              {error}
            </div>
          )}

          {warning && (
            <div style={{
              padding: '12px', background: `${colors.warning}15`, border: `1px solid ${colors.warning}30`,
              borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: colors.warning,
            }}>
              ⚠️ {warning}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
              background: loading ? colors.neutral[700] : `linear-gradient(135deg, ${colors.primary.main}, ${colors.secondary.main})`,
              color: 'white', fontSize: '15px', fontWeight: '600', cursor: loading ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            {loading && <span style={{ width: '18px', height: '18px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />}
            {loading ? 'Connecting...' : 'Connect & Start'}
          </button>
        </form>
      </div>
    </div>
  );
};

import { useWorkspaces, useThreads, useMessages } from './hooks';

// ============================================
// MAIN APP
// ============================================
import { ChatPanel } from './components/ChatPanel';

const WorkspaceSidebar = ({ workspaces, activeWorkspace, setActiveWorkspace, createWorkspace, threads, activeThread, setActiveThread, createThread }) => (
  <div style={{ borderRight: `1px solid ${colors.border.subtle}`, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
    <div style={{ padding: '12px', borderBottom: `1px solid ${colors.border.subtle}` }}>
      <button
        onClick={createWorkspace}
        style={{
          width: '100%', padding: '10px', borderRadius: '8px',
          background: `${colors.primary.main}15`, border: `1px solid ${colors.primary.main}30`,
          color: colors.primary.light, fontSize: '12px', fontWeight: '500', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        New Workspace
      </button>
    </div>

    <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
      {(workspaces || []).map(ws => (
        <div key={ws.id} style={{ marginBottom: '8px' }}>
          <div
            onClick={() => setActiveWorkspace(ws)}
            style={{
              padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
              background: activeWorkspace?.id === ws.id ? `${colors.primary.main}15` : 'transparent',
              border: activeWorkspace?.id === ws.id ? `1px solid ${colors.primary.main}30` : '1px solid transparent',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: '500', color: colors.neutral[300] }}>{ws.name}</div>
            <div style={{ fontSize: '10px', color: colors.neutral[600] }}>{ws.thread_count || 0} threads</div>
          </div>

          <div style={{ marginLeft: '12px', marginTop: '4px' }}>
            <button onClick={createThread} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', background: 'transparent', border: `1px dashed ${colors.border.default}`, color: colors.neutral[500], fontSize: '11px', cursor: 'pointer', marginBottom: '4px' }}>
              + New Thread
            </button>
            {activeWorkspace?.id === ws.id && (threads || []).map(t => (
              <div key={t.id} onClick={() => setActiveThread(t)} style={{ padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', marginBottom: '2px', background: activeThread?.id === t.id ? colors.bg.hover : 'transparent' }}>
                <div style={{ fontSize: '11px', color: colors.neutral[400], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t.title}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const IssueTreePanel = ({ activeWorkspace, highlightedNodeId, expandedNodes, toggleNode, progress }) => {
    const getStatusColor = (status) => {
        switch(status) {
          case 'completed': return colors.status.completed;
          case 'active': return colors.status.active;
          default: return colors.status.pending;
        }
    };
    
    const TreeNode = ({ node, depth = 0, isHighlighted }) => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedNodes.has(node.id);
        
        return (
          <div>
            <div 
              onClick={() => hasChildren && toggleNode(node.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 10px', marginBottom: '1px', borderRadius: '6px',
                cursor: hasChildren ? 'pointer' : 'default',
                background: isHighlighted ? `rgba(245, 158, 11, 0.2)` : 'transparent',
                animation: isHighlighted ? 'highlightFade 2s forwards' : 'none',
              }}
            >
              {hasChildren ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.neutral[500]} strokeWidth="2"
                  style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              ) : <div style={{ width: '12px' }} />}
              
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusColor(node.status), flexShrink: 0 }} />
              
              <div style={{
                flex: 1, fontSize: '11px', fontWeight: depth === 0 ? '600' : '500',
                color: colors.neutral[400], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {node.label}
              </div>
    
              {node.status === 'completed' && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.status.completed} strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </div>
            
            {hasChildren && isExpanded && (
              <div style={{ marginLeft: '16px', paddingLeft: '12px', borderLeft: `1px solid ${colors.border.subtle}` }}>
                {node.children.map((child, i) => <TreeNode key={child.id || i} node={child} depth={depth + 1} isHighlighted={child.id === highlightedNodeId} />)}
              </div>
            )}
          </div>
        );
    };

  return (
    <div style={{ borderLeft: `1px solid ${colors.border.subtle}`, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{
        padding: '12px 14px', borderBottom: `1px solid ${colors.border.subtle}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '10px', color: colors.neutral[500], textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Issue Tree
        </span>
        {activeWorkspace && (
          <span style={{ padding: '2px 6px', background: `${colors.status.active}20`, borderRadius: '3px', fontSize: '9px', color: colors.status.active }}>
            Live
          </span>
        )}
      </div>

      {activeWorkspace && (
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${colors.border.subtle}` }}>
          <div style={{ display: 'flex', gap: '8px', fontSize: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.status.completed }} />
              <span style={{ color: colors.neutral[500] }}>{progress.completed}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.status.active }} />
              <span style={{ color: colors.neutral[500] }}>{progress.active}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.status.pending }} />
              <span style={{ color: colors.neutral[500] }}>{progress.pending}</span>
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        {activeWorkspace?.issueTree ? (
          <TreeNode node={activeWorkspace.issueTree} isHighlighted={activeWorkspace.issueTree.id === highlightedNodeId} />
        ) : (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', color: colors.neutral[600],
          }}>
             <div style={{ fontSize: '11px' }}>Select a workspace</div>
          </div>
        )}
      </div>
    </div>
  );
};


// ============================================
// MAIN APP
// ============================================
const MainApp = () => {
  const { user, logout, useTrialMode, trialCredits } = useAuth();
  
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [activeThread, setActiveThread] = useState(null);
  const { data: workspaces, mutate: setWorkspaces } = useWorkspaces();
  const { data: threads, mutate: setThreads } = useThreads(activeWorkspace?.id);
  const { data: messages, mutate: setMessages } = useMessages(activeThread?.id);
  const [highlightedNodeId, setHighlightedNodeId] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set(['root']));

  useEffect(() => {
    if (workspaces && !activeWorkspace) {
      const inbox = workspaces.find(w => w.name === 'Inbox') || workspaces[0];
      if (inbox) {
        setActiveWorkspace(inbox);
      } else {
        api.createWorkspace('Inbox').then(({ workspace }) => {
          setWorkspaces(prev => [...(prev || []), workspace]);
          setActiveWorkspace(workspace);
        });
      }
    }
  }, [workspaces, activeWorkspace, setWorkspaces]);

  useEffect(() => {
    if (threads) {
      if (threads.length > 0) {
        const currentThreadExists = activeThread && threads.some(t => t.id === activeThread.id);
        if (!currentThreadExists) {
          setActiveThread(threads[0]);
        }
      } else if (activeWorkspace) {
        api.createThread(activeWorkspace.id, 'New Thread').then(({ thread }) => {
          setThreads([thread]);
          setActiveThread(thread);
        });
      }
    }
     if (activeWorkspace && activeThread && activeThread.workspaceId !== activeWorkspace.id) {
        setActiveThread(null);
    }
  }, [threads, activeWorkspace, activeThread, setThreads]);

  const createWorkspace = async () => {
    const { workspace } = await api.createWorkspace('New Research');
    setWorkspaces(prev => [...(prev || []), workspace]);
    setActiveWorkspace(workspace);
  };

  const createThread = async () => {
    if (!activeWorkspace) return;
    const { thread } = await api.createThread(activeWorkspace.id, 'New Thread');
    setThreads(prev => [...(prev || []), thread]);
    setActiveThread(thread);
  };

  const handleTreeUpdate = (newTree, activeNodeId) => {
    if (activeWorkspace) {
      const updatedWorkspace = { ...activeWorkspace, issueTree: newTree };
      // Update local state for immediate feedback
      setActiveWorkspace(updatedWorkspace);
      setWorkspaces(prev => prev.map(w => w.id === activeWorkspace.id ? updatedWorkspace : w));
      
      // Use the activeNodeId provided by AI, or fallback to null (don't force root highlight)
      if (activeNodeId) {
        setHighlightedNodeId(activeNodeId);
        // Ensure the active node path is expanded
        // This would require traversing the tree to find parents of activeNodeId, 
        // but for now, we rely on user expanding or auto-expand logic if added later.
      }
      
      setTimeout(() => setHighlightedNodeId(null), 3000); // Increased to 3s for better visibility
      
      // Persist change to the backend
      api.updateWorkspace(activeWorkspace.id, { issueTree: newTree });
    }
  };

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId);
      return next;
    });
  };

  const calculateProgress = (tree) => {
    if (!tree) return { completed: 0, active: 0, pending: 0 };
    let completed = 0, active = 0, pending = 0;
    const count = (node) => {
      if (!node.children || node.children.length === 0) {
        if (node.status === 'completed') completed++;
        else if (node.status === 'active') active++;
        else pending++;
      }
      node.children?.forEach(count);
    };
    count(tree);
    return { completed, active, pending };
  };

  const progress = activeWorkspace ? calculateProgress(activeWorkspace.issueTree) : { completed: 0, active: 0, pending: 0 };

  return (
    <div style={{ height: '100vh', background: colors.bg.primary, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderBottom: `1px solid ${colors.border.subtle}`, background: colors.bg.elevated, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: `linear-gradient(135deg, ${colors.primary.main}, ${colors.secondary.main})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>
          </div>
          <span style={{ fontSize: '16px', fontWeight: '700', fontFamily: '"Fraunces", serif', color: colors.neutral[50] }}>Relativit</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: colors.neutral[400] }}>{user?.name}</span>
          <button onClick={logout} style={{ padding: '6px 12px', borderRadius: '6px', background: 'transparent', border: `1px solid ${colors.border.default}`, color: colors.neutral[400], fontSize: '12px', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 280px', height: 'calc(100vh - 53px)', overflow: 'hidden' }}>
        <WorkspaceSidebar 
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          setActiveWorkspace={setActiveWorkspace}
          createWorkspace={createWorkspace}
          threads={threads}
          activeThread={activeThread}
          setActiveThread={setActiveThread}
          createThread={createThread}
        />

        <ChatPanel
          activeThread={activeThread}
          activeWorkspace={activeWorkspace}
          messages={messages || []}
          setMessages={setMessages}
          setThreads={setThreads}
          setActiveThread={setActiveThread}
          onTreeUpdate={handleTreeUpdate}
          useTrialMode={useTrialMode}
          trialCredits={trialCredits}
        />

        <IssueTreePanel
          activeWorkspace={activeWorkspace}
          highlightedNodeId={highlightedNodeId}
          expandedNodes={expandedNodes}
          toggleNode={toggleNode}
          progress={progress}
        />
      </div>
    </div>
  );
};

// ============================================
// ROOT APP
// ============================================
const App = () => {
  const { user, loading, hasApiKey, useTrialMode, trialCredits } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: colors.bg.primary,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: '40px', height: '40px', border: `3px solid ${colors.primary.main}`,
          borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite',
        }} />
      </div>
    );
  }

  if (!user) return <AuthScreen />;
  if (!hasApiKey) return <ApiKeySetup />;
  return <MainApp />;
};

// ============================================
// EXPORT
// ============================================
const RelativitApp = () => (
  <>
    <GlobalStyles />
    <AuthProvider>
      <App />
    </AuthProvider>
  </>
);

export default RelativitApp;
