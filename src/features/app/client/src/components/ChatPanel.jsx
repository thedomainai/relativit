import React, { useState, useRef, useEffect } from 'react';
import { api } from './api';

const ChatMessage = ({ msg }) => {
  const isUser = msg.role === 'user';
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        alignItems: 'flex-start',
        marginBottom: '16px',
        animation: 'fadeIn 0.3s ease',
        gap: '8px',
      }}
    >
      {!isUser && (
        <div style={{ flexShrink: 0, marginTop: '2px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
      )}
      <div
        style={{
          maxWidth: '70%',
          padding: '10px 14px',
          borderRadius: '20px',
          background: isUser ? '#24262a' : 'transparent',
          color: isUser ? '#e3e3e3' : (msg.isError ? '#ef4444' : '#cbd5e1'),
          textAlign: 'left',
          whiteSpace: 'pre-wrap',
          fontSize: '14px',
          lineHeight: 1.6,
        }}
      >
        {msg.content}
        {msg.isStreaming && <span className="streaming-cursor" />}
      </div>
    </div>
  );
};

export const ChatPanel = ({
  activeThread,
  activeWorkspace,
  messages,
  setMessages,
  setThreads,
  setActiveThread,
  setWorkspaces,
  onTreeUpdate, // Callback to update workspace in parent
  useTrialMode,
  trialCredits,
}) => {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [aiThinkingPhase, setAiThinkingPhase] = useState(null);
  const chatEndRef = useRef(null);
  const isComposingRef = useRef(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // This is a placeholder for the real SSE implementation.
  // It simulates the streaming behavior while using the old API calls.
  const sendMessageWithStreaming = async (threadId, currentMessages) => {
    setIsSending(true);
    let fullResponse = '';

    try {
      // Phase 1: Get AI chat response
      setAiThinkingPhase('generating');
      const { response: chatResponse, trialCredits: updatedCredits } = await api.chat(currentMessages);
      fullResponse = chatResponse;

      // Simulate streaming by adding the full response at once
      setMessages(prev => [...prev, { role: 'ai', content: fullResponse }]);

      if (updatedCredits !== undefined && updatedCredits !== null) {
        // This should be handled by a global state updater, but passing for now.
        // updateTrialMode(true, updatedCredits); 
      }

      // Phase 2: Extract issues and update tree in the background
      setAiThinkingPhase('analyzing');
      const finalMessages = [...currentMessages, { role: 'ai', content: fullResponse }];
      const initialIssueTree = activeWorkspace?.issueTree || { id: 'root', label: 'Root', children: [] };
      
      setAiThinkingPhase('updating');
      const { tree, activeNodeId } = await api.extractIssues(finalMessages, initialIssueTree);

      // Notify parent component of the updated tree and active node
      onTreeUpdate(tree, activeNodeId);

    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: `Error: ${error.message}`, isError: true }]);
    } finally {
      setIsSending(false);
      setAiThinkingPhase(null);
    }
  };


  const handleSendMessage = async () => {
    if (!input.trim() || isSending) return;

    const userContent = input.trim();
    if (userContent.length > 1000) {
      setMessages(prev => [...(prev || []), { role: 'ai', content: 'Error: Message is too long (max 1000 chars).', isError: true }]);
      return;
    }

    setInput('');
    let currentThread = activeThread;

    // If there's no active thread, create one first.
    if (!currentThread && activeWorkspace) {
      try {
        const { thread: newThread } = await api.createThread(activeWorkspace.id, 'New Thread');
        setThreads(prev => [...(prev || []), newThread]);
        setActiveThread(newThread);
        currentThread = newThread;
      } catch (err) {
        console.error("Failed to create new thread:", err);
        return; // Stop if thread creation fails
      }
    }
    
    if (!currentThread) return;

    const userMessage = { role: 'user', content: userContent };
    const optimisticMessages = [...(messages || []), userMessage];
    setMessages(optimisticMessages);

    // Persist the user's message to the backend.
    await api.addMessage(currentThread.id, 'user', userContent);
    
    // Update thread title on first message
    if ((messages || []).length === 0 && currentThread.title === 'New Thread') {
      const newTitle = userContent.slice(0, 50) + (userContent.length > 50 ? '...' : '');
      api.updateThread(currentThread.id, newTitle).then(() => {
        const updatedThread = { ...currentThread, title: newTitle };
        setActiveThread(updatedThread);
        setThreads(prev => prev.map(t => t.id === currentThread.id ? updatedThread : t));
      });
    }

    // Call the streaming function
    await sendMessageWithStreaming(currentThread.id, optimisticMessages);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)', position: 'relative', flex: 1 }}>
        {/* Header: Thread title with edit button */}
        <div style={{ 
            padding: '12px 16px', 
            borderBottom: `1px solid rgba(255,255,255,0.1)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            <div style={{ maxWidth: '880px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#f8fafc' }}>
                {activeThread ? activeThread.title : 'New Chat'}
              </div>
            </div>
          </div>
      {/* Main chat area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px', paddingBottom: '120px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ maxWidth: '880px', width: '100%' }}>
          {(messages && messages.length > 0) ? messages.map((msg, i) => (
            <ChatMessage key={i} msg={msg} />
          )) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#475569', minHeight: '200px' }}>
               <div style={{ fontSize: '14px' }}>Start a new conversation</div>
            </div>
          )}
          {isSending && aiThinkingPhase && (
             <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'flex-start' }}>
                <div style={{ flexShrink: 0, marginTop: '2px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                  {aiThinkingPhase === 'generating' && 'Generating AI response...'}
                  {aiThinkingPhase === 'analyzing' && 'Analyzing conversation...'}
                  {aiThinkingPhase === 'updating' && 'Updating issue tree...'}
                  {(!aiThinkingPhase && isSending) && 'Thinking...'}
                </div>
              </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Floating input bar */}
      <div style={{ 
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '12px 16px',
            background: 'transparent',
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <div style={{ maxWidth: '880px', width: '100%', pointerEvents: 'auto' }}>
            {useTrialMode && (
              <div style={{
                marginBottom: '8px', padding: '6px 10px',
                background: `rgba(99, 102, 241, 0.1)`, borderRadius: '6px',
                fontSize: '11px', color: '#cbd5e1',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span>Trial Credits:</span>
                <span style={{ fontWeight: '600', color: trialCredits > 0.1 ? '#f59e0b' : '#ef4444' }}>
                  ${trialCredits.toFixed(2)}
                </span>
              </div>
            )}
            
            <div style={{
              display: 'flex', 
              alignItems: 'center',
              gap: '8px', 
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.03)', 
              borderRadius: '12px',
              border: `1px solid rgba(255,255,255,0.1)`,
              boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.3)',
            }}>
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onCompositionStart={() => isComposingRef.current = true}
                onCompositionEnd={() => isComposingRef.current = false}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask a question..."
                disabled={isSending}
                maxLength={1000}
                rows={1}
                style={{
                  flex: 1, 
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#f8fafc',
                  fontSize: '16px',
                  resize: 'none',
                }}
              />
            </div>
             <div style={{
                marginTop: '8px',
                fontSize: '9px',
                color: '#475569',
                textAlign: 'center',
              }}>
                AI responses may be inaccurate. Verify important information.
              </div>
            </div>
          </div>
    </div>
  );
};
