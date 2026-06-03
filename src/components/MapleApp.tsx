import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { chatWithMaple } from "@/lib/ai/chat.functions";

type Message = { role: "user" | "assistant"; content: string };
type Bucket = "7d" | "30d" | "custom";
type Task = { id: string; title: string; done: boolean; bucket: Bucket; note?: string };

const STORAGE_KEY = "maple.state.v1";

const STARTERS = [
  "I just landed in Toronto. What do I do first?",
  "Help me get a SIN and open a bank account.",
  "Plan my first 2 weeks in Vancouver as a student.",
  "What about health coverage in Quebec?",
];

const INITIAL_TASKS: Task[] = [
  // First 7 days — arrival essentials
  { id: "d1", bucket: "7d", done: false, title: "Apply for a SIN at Service Canada", note: "Bring passport + study permit" },
  { id: "d2", bucket: "7d", done: false, title: "Open a student bank account", note: "Most big banks waive fees for students" },
  { id: "d3", bucket: "7d", done: false, title: "Get a Canadian SIM / phone plan", note: "Prepaid is fine for week one" },
  { id: "d4", bucket: "7d", done: false, title: "Confirm housing & get keys", note: "Take photos of any damage on day one" },
  { id: "d5", bucket: "7d", done: false, title: "Buy a transit pass (student fare)", note: "Presto / Compass / OPUS depending on city" },
  { id: "d6", bucket: "7d", done: false, title: "Stock the kitchen & basics", note: "Grocery run + bedding + adapter" },
  { id: "d7", bucket: "7d", done: false, title: "Save emergency contacts", note: "School int'l office, 911, embassy" },

  // First 30 days — settling in
  { id: "m1", bucket: "30d", done: false, title: "Register for the provincial health card", note: "OHIP / RAMQ / MSP — check the wait period" },
  { id: "m2", bucket: "30d", done: false, title: "Complete on-campus enrolment & orientation", note: "Pick up student ID" },
  { id: "m3", bucket: "30d", done: false, title: "Set up a credit card to build credit", note: "Student card with no income check" },
  { id: "m4", bucket: "30d", done: false, title: "Find a family doctor or walk-in clinic", note: "Know where to go before you need it" },
  { id: "m5", bucket: "30d", done: false, title: "Learn your study permit work rules", note: "On/off-campus hours per IRCC" },
  { id: "m6", bucket: "30d", done: false, title: "Build a weekly budget", note: "Rent, groceries, transit, phone, savings" },
  { id: "m7", bucket: "30d", done: false, title: "Join 1 student club or community group", note: "Fastest way to make friends" },
  { id: "m8", bucket: "30d", done: false, title: "Set up tenant insurance", note: "Usually under $20/month" },
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

  const addTask = (title: string, bucket: Bucket = "custom") => {
    const t = title.trim();
    if (!t) return;
    setTasks((ts) => [...ts, { id: crypto.randomUUID(), title: t, done: false, bucket }]);
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
            <PlanView
              scrollRef={scrollRef}
              tasks={tasks}
              onToggle={toggleTask}
              onAdd={addTask}
            />
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