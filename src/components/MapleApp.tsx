import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { chatWithMaple } from "@/lib/ai/chat.functions";

type Message = { role: "user" | "assistant"; content: string };
type Task = { id: string; title: string; done: boolean; due?: string };

const STORAGE_KEY = "maple.state.v1";

const STARTERS = [
  "I just landed in Toronto. What do I do first?",
  "Help me get a SIN and open a bank account.",
  "Plan my first 2 weeks in Vancouver as a student.",
  "What about health coverage in Quebec?",
];

const INITIAL_TASKS: Task[] = [
  { id: "t1", title: "Apply for SIN at Service Canada", done: false, due: "Week 1" },
  { id: "t2", title: "Open a student bank account", done: false, due: "Week 1" },
  { id: "t3", title: "Register for provincial health card", done: false, due: "Week 2" },
  { id: "t4", title: "Get a SIM / phone plan", done: false, due: "Week 1" },
];

export function MapleApp() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi, I'm **Maple** 🍁 — your settlement coach for Canada. Tell me where you've landed and what's on your mind. I'll plan it out with you.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [tab, setTab] = useState<"chat" | "plan">("chat");
  const chat = useServerFn(chatWithMaple);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.messages?.length) setMessages(s.messages);
        if (s.tasks?.length) setTasks(s.tasks);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, tasks }));
    } catch {}
  }, [messages, tasks]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, tab]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const result = await chat({ data: { messages: next } });
      if ("error" in result && result.error) {
        setMessages((m) => [...m, { role: "assistant", content: `_${result.error}_` }]);
      } else if ("reply" in result) {
        setMessages((m) => [...m, { role: "assistant", content: result.reply || "…" }]);
      }
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "_Connection hiccup. Try again._" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = (id: string) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const addTask = (title: string) => {
    const t = title.trim();
    if (!t) return;
    setTasks((ts) => [...ts, { id: crypto.randomUUID(), title: t, done: false }]);
  };

  const done = tasks.filter((t) => t.done).length;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md mx-auto">
        {/* Phone frame */}
        <div className="relative rounded-[2.5rem] border border-border bg-card shadow-2xl overflow-hidden h-[88vh] sm:h-[760px] flex flex-col">
          {/* Header */}
          <header className="px-5 pt-6 pb-4 border-b border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary text-primary-foreground grid place-items-center text-lg font-semibold">
                🍁
              </div>
              <div className="flex-1">
                <h1 className="text-base font-semibold tracking-tight text-foreground">Maple</h1>
                <p className="text-xs text-muted-foreground">Your Canada settlement coach</p>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Progress</div>
                <div className="text-sm font-semibold text-foreground">
                  {done}/{tasks.length}
                </div>
              </div>
            </div>

            <div className="mt-4 flex rounded-full bg-secondary p-1 text-sm">
              <button
                onClick={() => setTab("chat")}
                className={`flex-1 rounded-full py-1.5 transition-colors ${
                  tab === "chat" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setTab("plan")}
                className={`flex-1 rounded-full py-1.5 transition-colors ${
                  tab === "plan" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                Plan
              </button>
            </div>
          </header>

          {/* Body */}
          {tab === "chat" ? (
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-secondary text-secondary-foreground rounded-bl-md"
                    }`}
                  >
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-headings:my-1 prose-strong:text-current">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:120ms]" />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:240ms]" />
                    </div>
                  </div>
                </div>
              )}
              {messages.length <= 1 && (
                <div className="pt-2 space-y-2">
                  <p className="text-xs text-muted-foreground px-1">Try one of these:</p>
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="block w-full text-left text-sm px-3 py-2 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/40 transition-colors text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground px-1">
                Your settlement plan
              </p>
              {tasks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => toggleTask(t.id)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors text-left"
                >
                  <span
                    className={`mt-0.5 h-5 w-5 rounded-md border-2 grid place-items-center shrink-0 ${
                      t.done ? "bg-primary border-primary text-primary-foreground" : "border-border"
                    }`}
                  >
                    {t.done && (
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                        <path
                          fillRule="evenodd"
                          d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.8 3.8 6.8-6.8a1 1 0 011.4 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm ${
                        t.done ? "line-through text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {t.title}
                    </div>
                    {t.due && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">{t.due}</div>
                    )}
                  </div>
                </button>
              ))}
              <AddTask onAdd={addTask} />
            </div>
          )}

          {/* Footer / input */}
          {tab === "chat" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="border-t border-border bg-card px-3 py-3 flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Maple anything…"
                className="flex-1 rounded-full bg-secondary px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-full bg-primary text-primary-foreground h-10 w-10 grid place-items-center disabled:opacity-40 hover:opacity-90 transition-opacity"
                aria-label="Send"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Built for international students arriving in Canada 🇨🇦
        </p>
      </div>
    </div>
  );
}

function AddTask({ onAdd }: { onAdd: (title: string) => void }) {
  const [v, setV] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(v);
        setV("");
      }}
      className="flex items-center gap-2 pt-2"
    >
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="Add a step…"
        className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <button
        type="submit"
        disabled={!v.trim()}
        className="rounded-xl bg-primary text-primary-foreground px-3 py-2 text-sm disabled:opacity-40"
      >
        Add
      </button>
    </form>
  );
}