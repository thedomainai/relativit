import React, { useState, useEffect, useRef, createContext, useContext } from 'react';

// ============================================
// CONFIG
// ============================================
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

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
  
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('relativit_token', token);
    } else {
      localStorage.removeItem('relativit_token');
    }
  },

  async request(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }
    
    return data;
  },

  // Auth
  requestCode: (email) => api.request('/auth/request-code', { method: 'POST', body: { email } }),
  verifyCode: (email, code) => api.request('/auth/verify-code', { method: 'POST', body: { email, code } }),
  register: (data) => api.request('/auth/register', { method: 'POST', body: data }),
  login: (email, password) => api.request('/auth/login', { method: 'POST', body: { email, password } }),
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
        } catch {
          api.setToken(null);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = async (token, userData) => {
    api.setToken(token);
    setUser(userData);
    const status = await api.getApiKeyStatus();
    setHasApiKey(status.hasApiKey || status.useTrialMode);
    setUseTrialMode(status.useTrialMode || false);
    setTrialCredits(status.trialCredits || 0);
  };

  const logout = () => {
    api.setToken(null);
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
        await login(result.accessToken || result.token, result.user);
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
      await login(result.token, result.user);
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

    try {
      await api.saveApiKey(provider, apiKey);
      updateApiKeyStatus(true);
    } catch (err) {
      setError(err.message);
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

// ============================================
// MAIN APP
// ============================================
const MainApp = () => {
  const { user, logout, updateTrialMode } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState(new Set(['root']));
  const chatEndRef = useRef(null);

  // Load workspaces
  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const { workspaces: ws } = await api.getWorkspaces();
        setWorkspaces(ws);
      } catch (err) {
        console.error('Failed to load workspaces:', err);
      }
    };
    loadWorkspaces();
  }, []);

  // Load threads when workspace changes
  useEffect(() => {
    if (activeWorkspace) {
      const loadThreads = async () => {
        try {
          const { threads: ts } = await api.getThreads(activeWorkspace.id);
          setThreads(ts);
        } catch (err) {
          console.error('Failed to load threads:', err);
        }
      };
      loadThreads();
    } else {
      setThreads([]);
    }
    setActiveThread(null);
    setMessages([]);
  }, [activeWorkspace]);

  // Load messages when thread changes
  useEffect(() => {
    if (activeThread) {
      const loadMessages = async () => {
        try {
          const { messages: msgs } = await api.getMessages(activeThread.id);
          setMessages(msgs);
        } catch (err) {
          console.error('Failed to load messages:', err);
        }
      };
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [activeThread]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createWorkspace = async () => {
    try {
      const { workspace } = await api.createWorkspace('New Research');
      setWorkspaces([...workspaces, workspace]);
      setActiveWorkspace(workspace);
    } catch (err) {
      console.error('Failed to create workspace:', err);
    }
  };

  const createThread = async () => {
    if (!activeWorkspace) return;
    try {
      const { thread } = await api.createThread(activeWorkspace.id, 'New Thread');
      setThreads([...threads, thread]);
      setActiveThread(thread);
    } catch (err) {
      console.error('Failed to create thread:', err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeThread || loading) return;

    const userContent = input.trim();
    
    // Validate message length (1000 characters max)
    if (userContent.length > 1000) {
      setError(`Message is too long. Maximum 1,000 characters allowed. (${userContent.length} characters)`);
      return;
    }
    
    setInput('');
    setLoading(true);
    setError('');

    try {
      // Add user message
      await api.addMessage(activeThread.id, 'user', userContent);
      const newUserMsg = { role: 'user', content: userContent };
      setMessages(prev => [...prev, newUserMsg]);

      // Update thread title if first message
      if (messages.length === 0) {
        const title = userContent.slice(0, 50) + (userContent.length > 50 ? '...' : '');
        await api.updateThread(activeThread.id, title);
        setActiveThread({ ...activeThread, title });
        setThreads(threads.map(t => t.id === activeThread.id ? { ...t, title } : t));
      }

      // Get AI response
      const allMessages = [...messages, newUserMsg];
      const { response, trialCredits: updatedCredits } = await api.chat(allMessages);
      
      // Update trial credits if returned
      if (updatedCredits !== undefined && updatedCredits !== null) {
        updateTrialMode(true, updatedCredits);
      }
      
      // Add AI message
      await api.addMessage(activeThread.id, 'ai', response);
      const newAiMsg = { role: 'ai', content: response };
      setMessages(prev => [...prev, newAiMsg]);

      // Extract issues
      const finalMessages = [...allMessages, newAiMsg];
      const { tree } = await api.extractIssues(finalMessages, activeWorkspace.issueTree);
      
      // Update workspace with new tree
      await api.updateWorkspace(activeWorkspace.id, { issueTree: tree });
      const updatedWorkspace = { ...activeWorkspace, issueTree: tree };
      setActiveWorkspace(updatedWorkspace);
      setWorkspaces(workspaces.map(w => w.id === activeWorkspace.id ? updatedWorkspace : w));

    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages(prev => [...prev, { role: 'ai', content: `Error: ${err.message}`, isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return colors.status.completed;
      case 'active': return colors.status.active;
      default: return colors.status.pending;
    }
  };

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId);
      return next;
    });
  };

  const TreeNode = ({ node, depth = 0 }) => {
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
            {node.children.map((child, i) => <TreeNode key={child.id || i} node={child} depth={depth + 1} />)}
          </div>
        )}
      </div>
    );
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
    <div style={{ minHeight: '100vh', background: colors.bg.primary }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', borderBottom: `1px solid ${colors.border.subtle}`,
        background: colors.bg.elevated,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '6px',
            background: `linear-gradient(135deg, ${colors.primary.main}, ${colors.secondary.main})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>
            </svg>
          </div>
          <span style={{ fontSize: '16px', fontWeight: '700', fontFamily: '"Fraunces", serif', color: colors.neutral[50] }}>
            Relativit
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: colors.neutral[400] }}>{user?.name}</span>
          <button
            onClick={logout}
            style={{
              padding: '6px 12px', borderRadius: '6px', background: 'transparent',
              border: `1px solid ${colors.border.default}`, color: colors.neutral[400],
              fontSize: '12px', cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 280px', height: 'calc(100vh - 53px)' }}>
        
        {/* Left Sidebar */}
        <div style={{ borderRight: `1px solid ${colors.border.subtle}`, display: 'flex', flexDirection: 'column' }}>
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
            {workspaces.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: colors.neutral[600], fontSize: '12px' }}>
                No workspaces yet
              </div>
            ) : (
              workspaces.map(ws => (
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

                  {activeWorkspace?.id === ws.id && (
                    <div style={{ marginLeft: '12px', marginTop: '4px' }}>
                      <button
                        onClick={createThread}
                        style={{
                          width: '100%', padding: '6px 10px', borderRadius: '6px',
                          background: 'transparent', border: `1px dashed ${colors.border.default}`,
                          color: colors.neutral[500], fontSize: '11px', cursor: 'pointer', marginBottom: '4px',
                        }}
                      >
                        + New Thread
                      </button>
                      {threads.map(t => (
                        <div
                          key={t.id}
                          onClick={() => setActiveThread(t)}
                          style={{
                            padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', marginBottom: '2px',
                            background: activeThread?.id === t.id ? colors.bg.hover : 'transparent',
                          }}
                        >
                          <div style={{
                            fontSize: '11px', color: colors.neutral[400],
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {t.title}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)' }}>
          {activeThread ? (
            <>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border.subtle}` }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: colors.neutral[50] }}>{activeThread.title}</div>
              </div>

              <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
                {messages.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '16px', animation: 'fadeIn 0.3s ease' }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '5px', flexShrink: 0,
                      background: msg.role === 'user' ? `linear-gradient(135deg, ${colors.accent.main}, ${colors.error})` : `linear-gradient(135deg, ${colors.primary.main}, ${colors.secondary.main})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '9px', fontWeight: '600', color: 'white',
                    }}>
                      {msg.role === 'user' ? 'U' : 'AI'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '10px', color: colors.neutral[500], marginBottom: '3px' }}>
                        {msg.role === 'user' ? 'You' : 'Relativit AI'}
                      </div>
                      <div style={{
                        fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap',
                        color: msg.isError ? colors.error : colors.neutral[200],
                      }}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '5px',
                      background: `linear-gradient(135deg, ${colors.primary.main}, ${colors.secondary.main})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {[0, 1, 2].map(i => (
                          <div key={i} style={{
                            width: '3px', height: '3px', borderRadius: '50%', background: 'white',
                            animation: 'pulse 1s ease-in-out infinite', animationDelay: `${i * 0.15}s`,
                          }} />
                        ))}
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: colors.neutral[500], alignSelf: 'center' }}>Thinking...</div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div style={{ padding: '12px 16px', borderTop: `1px solid ${colors.border.subtle}` }}>
                {/* Trial mode credits display */}
                {useTrialMode && (
                  <div style={{
                    marginBottom: '8px', padding: '6px 10px',
                    background: `${colors.primary.main}15`, borderRadius: '6px',
                    fontSize: '11px', color: colors.neutral[300],
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <span>Trial Credits:</span>
                    <span style={{ fontWeight: '600', color: trialCredits > 0.1 ? colors.status.active : colors.error }}>
                      ${trialCredits.toFixed(2)}
                    </span>
                  </div>
                )}
                
                <div style={{
                  display: 'flex', gap: '8px', padding: '8px 12px',
                  background: colors.bg.elevated, borderRadius: '8px', border: `1px solid ${colors.border.default}`,
                }}>
                  <input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Ask a question..."
                    disabled={loading}
                    maxLength={1000}
                    style={{
                      flex: 1, background: 'transparent', border: 'none', outline: 'none',
                      color: colors.neutral[50], fontSize: '13px',
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <button
                      onClick={sendMessage}
                      disabled={loading || !input.trim()}
                      style={{
                        width: '28px', height: '28px', borderRadius: '6px',
                        background: input.trim() && !loading ? `linear-gradient(135deg, ${colors.primary.main}, ${colors.secondary.main})` : colors.neutral[700],
                        border: 'none', color: 'white', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                    </button>
                    <span style={{
                      fontSize: '9px', color: input.length > 900 ? colors.error : colors.neutral[600],
                      lineHeight: '1',
                    }}>
                      {input.length}/1000
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: colors.neutral[600] }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '16px',
                background: `${colors.primary.main}15`, display: 'flex',
                alignItems: 'center', justifyContent: 'center', marginBottom: '16px',
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={colors.primary.main} strokeWidth="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div style={{ fontSize: '14px' }}>{activeWorkspace ? 'Select or create a thread' : 'Select or create a workspace'}</div>
            </div>
          )}
        </div>

        {/* Issue Tree */}
        <div style={{ borderLeft: `1px solid ${colors.border.subtle}`, display: 'flex', flexDirection: 'column' }}>
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
              <TreeNode node={activeWorkspace.issueTree} />
            ) : (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '100%', color: colors.neutral[600],
              }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: colors.bg.elevated, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  marginBottom: '10px', border: `1px dashed ${colors.border.default}`,
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.neutral[600]} strokeWidth="1.5">
                    <circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>
                  </svg>
                </div>
                <div style={{ fontSize: '11px' }}>Select a workspace</div>
              </div>
            )}
          </div>
        </div>
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
