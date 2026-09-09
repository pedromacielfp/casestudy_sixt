"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, X } from "lucide-react";

import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What is the All Rentals repeat conversion rate?",
  "Where is the biggest opportunity to lift repeat rate?",
  "How do B2C and B2P compare, and what would you do about it?",
  "When should win-back outreach be triggered?",
];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setInput("");
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? `Request failed (${res.status}).`);
      } else {
        setMessages([...next, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setError("Could not reach the chat service.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 print:hidden">
      {open && (
        <div className="flex h-[min(70vh,560px)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-xl border border-border bg-popover shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Dashboard assistant</span>
              <span className="text-[11px] text-muted-foreground">
                Only answers questions about this dashboard&apos;s data
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="rounded-md p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          <div
            ref={listRef}
            className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
          >
            {messages.length === 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                  Ask about the KPIs and definitions, or for recommendations
                  grounded in the data.
                </p>
                {SUGGESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(q)}
                    className="rounded-md border border-border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                  m.role === "user"
                    ? "self-end bg-foreground text-background"
                    : "self-start bg-[rgba(255,255,255,0.06)] text-foreground",
                )}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <span className="self-start text-sm text-muted-foreground">
                Thinking&hellip;
              </span>
            )}
            {error && (
              <p className="rounded-md border border-border bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-foreground">
                {error}
              </p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about the numbers or what to do"
              className="min-w-0 flex-1 rounded-md border border-input bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-[var(--ring)]"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send"
              className="shrink-0 rounded-md bg-[var(--brand)] p-2 text-white disabled:opacity-40"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close assistant" : "Open dashboard assistant"}
        aria-expanded={open}
        className="flex size-14 items-center justify-center rounded-full bg-[var(--brand)] text-white shadow-[0_10px_30px_rgba(255,95,0,0.35)] transition-transform hover:scale-105"
      >
        {open ? <X className="size-6" /> : <MessageSquare className="size-6" />}
      </button>
    </div>
  );
}
