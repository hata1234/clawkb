"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Send, Bot, User, Loader2, FileText, ExternalLink } from "lucide-react";

interface Source {
  entryId: number;
  title: string;
  similarity: number;
  chunkText: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export default function RagPage() {
  const t = useTranslations('Rag');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingSources, setStreamingSources] = useState<Source[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = useCallback(async () => {
    const q = input.trim();
    if (!q || loading) return;

    setInput("");
    setMessages(prev => [...prev, { role: "user", content: q }]);
    setLoading(true);
    setStreamingContent("");
    setStreamingSources([]);

    try {
      const res = await fetch("/api/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: t('requestFailed') }));
        setMessages(prev => [...prev, { role: "assistant", content: err.error || t('somethingWrong') }]);
        setLoading(false);
        return;
      }

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream")) {
        // Streaming mode
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";
        let sources: Source[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let eventType = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (eventType === "sources") {
                try {
                  sources = JSON.parse(data);
                  setStreamingSources(sources);
                } catch { /* skip */ }
              } else if (eventType === "delta") {
                try {
                  const token = JSON.parse(data);
                  fullContent += token;
                  setStreamingContent(fullContent);
                } catch { /* skip */ }
              } else if (eventType === "done") {
                // Stream finished
              }
              eventType = "";
            }
          }
        }

        setMessages(prev => [...prev, { role: "assistant", content: fullContent, sources }]);
        setStreamingContent("");
        setStreamingSources([]);
      } else {
        // Non-streaming JSON response
        const data = await res.json();
        setMessages(prev => [...prev, { role: "assistant", content: data.answer, sources: data.sources }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: t('networkError') }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, t]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="rag-page">
      {/* Header */}
      <div style={{ marginBottom: 24, textAlign: "center" }}>
        <p style={{ fontSize: "0.7rem", color: "var(--text-dim)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>{t('label')}</p>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", fontWeight: 400, color: "var(--text)" }}>{t('title')}</h1>
      </div>

      {/* Chat area */}
      <div className="rag-chat-area">
        {messages.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
            <Bot style={{ width: 48, height: 48, margin: "0 auto 16px", opacity: 0.2 }} />
            <p style={{ fontSize: "1rem", fontWeight: 500, marginBottom: 8, color: "var(--text-secondary)" }}>
              {t('prompt')}
            </p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-dim)" }}>
              {t('description')}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`rag-message rag-message-${msg.role}`}>
            <div className="rag-message-avatar">
              {msg.role === "user"
                ? <User style={{ width: 16, height: 16 }} />
                : <Bot style={{ width: 16, height: 16 }} />
              }
            </div>
            <div className="rag-message-body">
              <div className="rag-message-content">{msg.content}</div>
              {msg.sources && msg.sources.length > 0 && (
                <SourceCards sources={msg.sources} />
              )}
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {loading && (streamingContent || streamingSources.length > 0) && (
          <div className="rag-message rag-message-assistant">
            <div className="rag-message-avatar">
              <Bot style={{ width: 16, height: 16 }} />
            </div>
            <div className="rag-message-body">
              {streamingSources.length > 0 && <SourceCards sources={streamingSources} />}
              <div className="rag-message-content">
                {streamingContent || <span className="rag-typing" />}
              </div>
            </div>
          </div>
        )}

        {/* Loading spinner when no content yet */}
        {loading && !streamingContent && streamingSources.length === 0 && (
          <div className="rag-message rag-message-assistant">
            <div className="rag-message-avatar">
              <Bot style={{ width: 16, height: 16 }} />
            </div>
            <div className="rag-message-body">
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-dim)", fontSize: "0.85rem" }}>
                <Loader2 style={{ width: 16, height: 16 }} className="rag-spin" />
                {t('searching')}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="rag-input-area">
        <div className="rag-input-wrapper">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('placeholder')}
            className="rag-input"
            rows={1}
            disabled={loading}
          />
          <button
            onClick={submit}
            disabled={loading || !input.trim()}
            className="rag-send-btn"
          >
            {loading
              ? <Loader2 style={{ width: 18, height: 18 }} className="rag-spin" />
              : <Send style={{ width: 18, height: 18 }} />
            }
          </button>
        </div>
      </div>

      <style>{`
        .rag-page {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 80px);
          max-width: 780px;
          margin: 0 auto;
        }
        .rag-chat-area {
          flex: 1;
          overflow-y: auto;
          padding-bottom: 16px;
        }
        .rag-message {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }
        .rag-message-avatar {
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 2px;
        }
        .rag-message-user .rag-message-avatar {
          background: var(--accent-muted);
          color: var(--accent);
        }
        .rag-message-assistant .rag-message-avatar {
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text-secondary);
        }
        .rag-message-body {
          flex: 1;
          min-width: 0;
        }
        .rag-message-content {
          font-size: 0.9rem;
          line-height: 1.7;
          color: var(--text);
          white-space: pre-wrap;
          word-break: break-word;
        }
        .rag-message-user .rag-message-content {
          color: var(--text);
          font-weight: 500;
        }
        .rag-input-area {
          padding: 16px 0;
          border-top: 1px solid var(--border);
        }
        .rag-input-wrapper {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          background: var(--surface);
          border: 2px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 8px 8px 8px 16px;
          transition: border-color 0.15s;
        }
        .rag-input-wrapper:focus-within {
          border-color: var(--accent);
        }
        .rag-input {
          flex: 1;
          background: none;
          border: none;
          outline: none;
          font-size: 0.95rem;
          color: var(--text);
          resize: none;
          max-height: 120px;
          padding: 6px 0;
          font-family: inherit;
          line-height: 1.5;
        }
        .rag-input::placeholder {
          color: var(--text-dim);
        }
        .rag-send-btn {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          border-radius: var(--radius-md);
          background: var(--accent);
          color: var(--accent-contrast);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.15s;
        }
        .rag-send-btn:disabled {
          opacity: 0.4;
          cursor: default;
        }
        @keyframes rag-spin-anim {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .rag-spin {
          animation: rag-spin-anim 1s linear infinite;
        }
        .rag-typing::after {
          content: "";
          display: inline-block;
          width: 6px;
          height: 14px;
          background: var(--text-dim);
          border-radius: 1px;
          animation: rag-blink 0.8s infinite;
          vertical-align: text-bottom;
        }
        @keyframes rag-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .rag-sources {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }
        .rag-source-card {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-decoration: none;
          transition: border-color 0.15s;
          max-width: 280px;
        }
        .rag-source-card:hover {
          border-color: var(--accent);
          color: var(--accent);
        }
        .rag-source-score {
          font-size: 0.65rem;
          padding: 1px 6px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--type-opportunity) 15%, transparent);
          color: var(--type-opportunity);
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          flex-shrink: 0;
        }
        .rag-source-title {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}

function SourceCards({ sources }: { sources: Source[] }) {
  return (
    <div className="rag-sources">
      {sources.map((s, i) => (
        <Link key={i} href={`/entries/${s.entryId}`} className="rag-source-card">
          <FileText style={{ width: 12, height: 12, flexShrink: 0 }} />
          <span className="rag-source-title">{s.title}</span>
          <span className="rag-source-score">{s.similarity}%</span>
          <ExternalLink style={{ width: 10, height: 10, flexShrink: 0, opacity: 0.5 }} />
        </Link>
      ))}
    </div>
  );
}
