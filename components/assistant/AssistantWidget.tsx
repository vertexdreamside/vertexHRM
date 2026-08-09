"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import type { PendingAction } from "@/lib/assistant/intents";

interface DisplayMessage {
  role: "user" | "assistant";
  text: string;
}

export function AssistantWidget() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([
    { role: "assistant", text: "Hi! Try things like \"how many leave days do I have left\", \"apply for leave 2026-03-01 to 2026-03-05\", or \"what is John Doe's job title\"." }
  ]);
  const [pendingAction, setPendingAction] = useState<PendingAction | undefined>(undefined);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, pendingAction })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setLoading(false);
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
      setPendingAction(data.pendingAction);
      if (data.navigate) router.push(data.navigate);
    } catch {
      setError("Couldn't reach the assistant — check your connection and try again.");
    }
    setLoading(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close Vertex Assistant" : "Open Vertex Assistant"}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-gradient text-white shadow-lg transition-transform hover:scale-105"
      >
        {open ? <X size={22} /> : <Sparkles size={22} />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-40 flex h-[520px] w-96 max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-card border border-surface-border bg-white shadow-2xl">
          <div className="flex items-center gap-2 bg-brand-gradient px-4 py-3 text-white">
            <Sparkles size={16} />
            <span className="font-display text-sm font-medium">Vertex Assistant</span>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={clsx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={clsx(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                  m.role === "user" ? "bg-brand-gradient text-white" : "bg-surface-subtle text-ink"
                )}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-lg bg-surface-subtle px-3 py-2 text-sm text-ink-soft">
                  <Loader2 size={14} className="animate-spin" /> Thinking...
                </div>
              </div>
            )}
            {error && <p className="text-center text-xs text-state-danger">{error}</p>}
          </div>

          <form onSubmit={send} className="flex items-center gap-2 border-t border-surface-border p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about leave, timesheets..."
              className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-state-success text-white disabled:opacity-50"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
