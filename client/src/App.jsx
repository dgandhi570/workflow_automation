import React, { useEffect, useRef } from "react";
import { useChat } from "./hooks/useChat";
import MessageBubble from "./components/MessageBubble";
import ChatInput from "./components/ChatInput";
import WorkflowPanel from "./components/WorkflowPanel";
import PhaseIndicator from "./components/PhaseIndicator";
import StarterPrompts from "./components/StarterPrompts";
import ContextPanel from "./components/ContextPanel";

const styles = {
  root: {
    display: "flex",
    height: "100vh",
    overflow: "hidden",
    flexDirection: "column",
  },
  header: {
    height: "52px",
    background: "var(--bg-secondary)",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
    flexShrink: 0,
    zIndex: 10,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  logoIcon: {
    width: "28px",
    height: "28px",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: "700",
    color: "#fff",
    letterSpacing: "-0.5px",
  },
  logoText: {
    fontSize: "14px",
    fontWeight: "600",
    color: "var(--text-primary)",
  },
  logoSub: {
    fontSize: "11px",
    color: "var(--text-muted)",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  resetBtn: {
    background: "none",
    border: "1px solid var(--border)",
    color: "var(--text-secondary)",
    padding: "5px 12px",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontSize: "12px",
    fontFamily: "var(--font-sans)",
    transition: "all 0.15s",
  },
  main: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  chatArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  phaseBar: {
    background: "var(--bg-secondary)",
    borderBottom: "1px solid var(--border)",
    padding: "6px 16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  sessionBadge: {
    fontSize: "10px",
    color: "var(--text-muted)",
    fontFamily: "var(--font-mono)",
    marginLeft: "auto",
  },
  messages: {
    flex: 1,
    overflow: "auto",
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
  },
  typingIndicator: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 0",
    color: "var(--text-muted)",
    fontSize: "13px",
  },
  dots: {
    display: "flex",
    gap: "4px",
  },
  dot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "var(--accent)",
    animation: "bounce 1.2s infinite ease-in-out",
  },
};

export default function App() {
  const {
    sessionId,
    messages,
    isLoading,
    phase,
    currentWorkflow,
    validation,
    isSaving,
    context,
    initialize,
    sendMessage,
    saveWorkflow,
    reset,
  } = useChat();

  const messagesEndRef = useRef(null);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleStarterClick = (prompt) => {
    sendMessage(prompt);
  };

  return (
    <div style={styles.root}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>AI</div>
          <div>
            <div style={styles.logoText}>Workflow AI Builder</div>
            <div style={styles.logoSub}>Powered by Claude · Yabx Platform</div>
          </div>
        </div>
        <div style={styles.headerRight}>
          {currentWorkflow && (
            <span style={{
              fontSize: "11px",
              padding: "3px 10px",
              borderRadius: "20px",
              background: "rgba(16,185,129,0.1)",
              border: "1px solid rgba(16,185,129,0.3)",
              color: "#10b981",
              fontWeight: "500",
            }}>
              ✓ Workflow ready
            </span>
          )}
          <button style={styles.resetBtn} onClick={reset}>
            ↺ New Session
          </button>
        </div>
      </header>

      <div style={styles.main}>
        {/* Chat Area */}
        <div style={styles.chatArea}>
          {/* Phase Bar */}
          {phase !== "idle" && (
            <div style={styles.phaseBar}>
              <PhaseIndicator phase={phase} />
              {sessionId && (
                <span style={styles.sessionBadge}>
                  {sessionId.slice(0, 8)}
                </span>
              )}
            </div>
          )}

          {/* Context Panel — shows collected AI context during gathering */}
          <ContextPanel context={context} phase={phase} />

          {/* Messages */}
          <div style={styles.messages}>
            {messages.map((msg) => {
              if (msg.type === "starters") {
                return <StarterPrompts key={msg.id} prompts={msg.starters} onSelect={handleStarterClick} />;
              }
              return <MessageBubble key={msg.id} message={msg} />;
            })}

            {isLoading && (
              <div style={styles.typingIndicator}>
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  color: "#fff",
                  fontWeight: "600",
                }}>
                  AI
                </div>
                <div style={styles.dots}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        ...styles.dot,
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
                <span>Thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <ChatInput
            onSend={sendMessage}
            isLoading={isLoading}
            disabled={!sessionId}
          />
        </div>

        {/* Workflow Preview Panel */}
        <WorkflowPanel
          workflow={currentWorkflow}
          validation={validation}
          isSaving={isSaving}
          onSave={saveWorkflow}
        />
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
          40% { transform: scale(1.1); opacity: 1; }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
