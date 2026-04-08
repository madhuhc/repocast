"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import VoiceButton from "./VoiceButton";
import { Send, ChevronDown, FileCode, Loader2, Bot, Sparkles } from "lucide-react";

interface Props {
  owner: string;
  repo: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ChatPanel({ owner, repo }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [sourcesExpanded, setSourcesExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner,
          repo,
          messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Request failed" }));
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: err.error || "Something went wrong." }
              : m
          )
        );
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const current = accumulated;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: current } : m))
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Failed to get a response. Please try again." }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, owner, repo]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function toggleSources(id: string) {
    setSourcesExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const visibleMessages = showAll ? messages : messages.slice(-20);
  const hasHidden = messages.length > 20 && !showAll;

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:max-h-[calc(100dvh-3.5rem)]">
      <div className="border-b border-border/60 bg-gradient-to-r from-cyan-500/[0.06] via-transparent to-violet-500/[0.06] px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 ring-1 ring-white/10">
            <Bot className="h-5 w-5 text-cyan-300" aria-hidden />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Ask about this repo
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              Answers use retrieved code chunks — cite paths when you need certainty.
            </p>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 && (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 px-4 text-center">
            <div className="rounded-2xl border border-dashed border-border/80 bg-card/30 px-5 py-8">
              <Sparkles className="mx-auto h-8 w-8 text-cyan-400/80" aria-hidden />
              <p className="mt-3 text-sm font-medium text-foreground">Grounded Q&amp;A</p>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground leading-relaxed">
                Ask how something works, where logic lives, or what a file does — by text or voice.
              </p>
            </div>
          </div>
        )}

        {hasHidden && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="w-full rounded-xl border border-border/60 bg-background/40 py-2.5 text-center text-xs font-medium text-muted-foreground transition-colors hover:border-cyan-500/30 hover:text-foreground"
          >
            Show {messages.length - 20} earlier messages
          </button>
        )}

        {visibleMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[min(92%,28rem)] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                msg.role === "user"
                  ? "rounded-br-md border border-cyan-500/25 bg-gradient-to-br from-cyan-500/15 to-sky-500/10 text-foreground"
                  : "rounded-bl-md border border-border/70 bg-card/60 text-foreground backdrop-blur-sm"
              }`}
            >
              <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              {msg.role === "assistant" && msg.content && (
                <button
                  type="button"
                  onClick={() => toggleSources(msg.id)}
                  className="mt-3 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-cyan-300/90"
                >
                  <FileCode className="h-3 w-3" aria-hidden />
                  Sources
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${
                      sourcesExpanded[msg.id] ? "rotate-180" : ""
                    }`}
                    aria-hidden
                  />
                </button>
              )}
              {sourcesExpanded[msg.id] && (
                <div className="mt-2 rounded-lg border border-border/50 bg-background/40 px-3 py-2 text-[10px] text-muted-foreground font-mono">
                  <p className="italic">Source files used for this answer are shown in the response text.</p>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.content === "" && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-border/70 bg-card/50 px-4 py-3 backdrop-blur-sm">
              <div className="flex gap-1.5">
                <div className="h-2 w-2 animate-bounce rounded-full bg-cyan-400/80 [animation-delay:0ms]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-cyan-400/80 [animation-delay:150ms]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-cyan-400/80 [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border/60 bg-background/40 p-4 backdrop-blur-md">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <VoiceButton onTranscript={(text) => sendMessage(text)} />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about the code…"
            className="min-w-0 flex-1 rounded-xl border border-border/70 bg-card/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/80 focus:border-cyan-500/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            aria-label="Ask a question about this repository"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-sky-500 text-slate-950 shadow-md shadow-cyan-500/15 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send message"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
