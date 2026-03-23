"use client";

import { useState, useRef, useEffect, useCallback, type KeyboardEvent, type FormEvent } from "react";
import { Bot, X, Send, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Source = {
  entryId: number;
  title: string;
  similarity: number;
  chunkText: string;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
};

export default function FloatingChat() {
  const t = useTranslations("FloatingChat");
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPulse, setShowPulse] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Stop pulse after first open
  useEffect(() => {
    if (open) setShowPulse(false);
  }, [open]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Escape to close
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const handleSend = useCallback(async () => {
    const query = input.trim();
    if (!query || loading) return;

    setInput("");
    const userMsg: Message = { role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    const assistantMsg: Message = { role: "assistant", content: "", sources: [] };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      abortRef.current = new AbortController();
      const res = await fetch("/api/rag?stream=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, topK: 5 }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error("API error");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let currentEvent = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (currentEvent === "sources") {
              try {
                const sources = JSON.parse(data) as Source[];
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last.role === "assistant") last.sources = sources;
                  return updated;
                });
              } catch { /* ignore parse errors */ }
            } else if (currentEvent === "delta") {
              try {
                const token = JSON.parse(data) as string;
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last.role === "assistant") last.content += token;
                  return updated;
                });
              } catch { /* ignore */ }
            }
            // done event - no action needed
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === "assistant" && !last.content) {
          last.content = t("error");
        }
        return updated;
      });
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [input, loading, t]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label={t("title")}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "var(--accent, #C9A96E)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          zIndex: 9999,
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        {open ? <X size={24} /> : <Bot size={24} />}
        {showPulse && !open && (
          <span
            style={{
              position: "absolute",
              inset: -4,
              borderRadius: "50%",
              border: "2px solid var(--accent, #C9A96E)",
              animation: "fc-pulse 2s ease-out infinite",
              pointerEvents: "none",
            }}
          />
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 92,
            right: 24,
            width: 400,
            maxWidth: "calc(100vw - 32px)",
            height: 500,
            maxHeight: "calc(100vh - 120px)",
            background: "var(--surface, #1e1e1e)",
            border: "1px solid var(--border, #333)",
            borderRadius: 16,
            display: "flex",
            flexDirection: "column",
            zIndex: 9999,
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            overflow: "hidden",
            animation: "fc-slideUp 0.2s ease-out",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              borderBottom: "1px solid var(--border, #333)",
              background: "var(--surface-alt, var(--surface, #1e1e1e))",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Bot size={18} style={{ color: "var(--accent, #C9A96E)" }} />
              <span style={{ fontWeight: 600, color: "var(--text, #eee)", fontSize: 15 }}>
                {t("title")}
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted, #888)",
                cursor: "pointer",
                padding: 4,
                borderRadius: 6,
                display: "flex",
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {messages.length === 0 && (
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "var(--text-muted, #888)",
                fontSize: 14,
                gap: 8,
              }}>
                <Bot size={32} style={{ opacity: 0.4 }} />
                <span>{t("placeholder")}</span>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div
                  style={{
                    maxWidth: "85%",
                    padding: "8px 12px",
                    borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: msg.role === "user" ? "var(--accent, #C9A96E)" : "var(--surface-raised, var(--border, #333))",
                    color: msg.role === "user" ? "#fff" : "var(--text, #eee)",
                    fontSize: 14,
                    lineHeight: 1.5,
                    wordBreak: "break-word",
                  }}
                >
                  {msg.role === "assistant" ? (
                    <div className="fc-md">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content || (loading && i === messages.length - 1 ? t("thinking") : "")}</ReactMarkdown>
                    </div>
                  ) : (
                    <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
                  )}
                </div>
                {/* Sources */}
                {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && msg.content && (
                  <div style={{ marginTop: 6, maxWidth: "85%", fontSize: 12 }}>
                    <span style={{ color: "var(--text-muted, #888)", fontWeight: 500 }}>{t("sources")}:</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
                      {msg.sources.map((s) => (
                        <a
                          key={s.entryId}
                          href={`/entries/${s.entryId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "var(--accent, #C9A96E)",
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "2px 0",
                          }}
                        >
                          <ExternalLink size={10} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {s.title} ({s.similarity}%)
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {loading && messages.length > 0 && messages[messages.length - 1].role === "assistant" && !messages[messages.length - 1].content && (
              <div style={{ display: "flex", gap: 4, padding: "4px 0" }}>
                <span className="fc-dot" style={{ animationDelay: "0ms" }} />
                <span className="fc-dot" style={{ animationDelay: "150ms" }} />
                <span className="fc-dot" style={{ animationDelay: "300ms" }} />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: "10px 12px",
              borderTop: "1px solid var(--border, #333)",
              display: "flex",
              gap: 8,
              alignItems: "flex-end",
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("placeholder")}
              rows={1}
              style={{
                flex: 1,
                resize: "none",
                background: "var(--background, #111)",
                color: "var(--text, #eee)",
                border: "1px solid var(--border, #333)",
                borderRadius: 10,
                padding: "8px 12px",
                fontSize: 14,
                lineHeight: 1.4,
                maxHeight: 100,
                outline: "none",
                fontFamily: "inherit",
              }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 100) + "px";
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              style={{
                background: input.trim() && !loading ? "var(--accent, #C9A96E)" : "var(--border, #333)",
                color: input.trim() && !loading ? "#fff" : "var(--text-muted, #888)",
                border: "none",
                borderRadius: 10,
                padding: "8px 12px",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.15s",
                flexShrink: 0,
              }}
              aria-label={t("send")}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fc-pulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes fc-slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fc-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        .fc-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--text-muted, #888);
          animation: fc-bounce 1.2s ease-in-out infinite;
        }
        .fc-md p { margin: 0 0 4px; }
        .fc-md p:last-child { margin: 0; }
        .fc-md code {
          background: var(--background, #111);
          padding: 1px 4px;
          border-radius: 4px;
          font-size: 0.9em;
        }
        .fc-md pre {
          background: var(--background, #111);
          padding: 8px;
          border-radius: 6px;
          overflow-x: auto;
          margin: 4px 0;
        }
        .fc-md pre code { background: none; padding: 0; }
        .fc-md ul, .fc-md ol { margin: 4px 0; padding-left: 20px; }
        .fc-md a { color: var(--accent, #C9A96E); }
        @media (max-width: 480px) {
          /* handled by maxWidth: calc(100vw - 32px) inline */
        }
      `}</style>
    </>
  );
}
