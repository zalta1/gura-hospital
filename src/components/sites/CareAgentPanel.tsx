import { Bot, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { apiFetch, getStoredToken, storeAuth, wsUrl } from "@/lib/api";

type Message = { from: "agent" | "you" | "system"; text: string };

export function CareAgentPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      from: "agent",
      text: "Hello. I am the Gura care navigation agent. I can help you describe what is going on, find a specialist, and request a visit. I do not diagnose or replace your physician. How can I help?",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function connect() {
      setError(null);
      try {
        if (!getStoredToken()) {
          const session = await apiFetch<import("@/lib/api").AuthSession>("/auth/demo-login", {
            method: "POST",
            body: JSON.stringify({ persona: "patient" }),
          });
          storeAuth(session);
        }
        const started = await apiFetch<{ session_id: string; websocket_path: string }>(
          "/intake/sessions",
          {
            method: "POST",
            body: JSON.stringify({ channel: "web_chat" }),
          },
        );
        if (cancelled) return;
        setSessionId(started.session_id);
        const ws = new WebSocket(wsUrl(`/ws/intake/${started.session_id}`));
        wsRef.current = ws;
        ws.onopen = () => setReady(true);
        ws.onmessage = (ev) => {
          try {
            const payload = JSON.parse(ev.data) as {
              type?: string;
              role?: string;
              content?: string;
              text?: string;
            };
            const text = payload.content ?? payload.text ?? "";
            if (!text) return;
            const from: Message["from"] =
              payload.role === "user" ? "you" : payload.type === "system" ? "system" : "agent";
            setMessages((prev) => [...prev, { from, text }]);
          } catch {
            setMessages((prev) => [...prev, { from: "agent", text: String(ev.data) }]);
          }
        };
        ws.onerror = () => setError("Connection interrupted. You can still submit the written form.");
        ws.onclose = () => setReady(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not start a live session.");
      }
    }

    void connect();
    return () => {
      cancelled = true;
      wsRef.current?.close();
      wsRef.current = null;
      setReady(false);
    };
  }, [open]);

  function send() {
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { from: "you", text }]);
    setDraft("");
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "message", content: text }));
      return;
    }
    if (sessionId) {
      void apiFetch(`/intake/sessions/${sessionId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: text }),
      })
        .then((res) => {
          const r = res as { reply?: string };
          if (r.reply) setMessages((prev) => [...prev, { from: "agent", text: r.reply! }]);
        })
        .catch((err: Error) => setError(err.message));
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="bg-primary px-6 py-5 text-left">
          <SheetTitle className="flex items-center gap-2 text-primary-foreground">
            <Bot className="size-5 text-gold" /> Care navigation
          </SheetTitle>
          <SheetDescription className="text-primary-foreground/70">
            Live assistant — not medical advice. Clinicians approve follow-up plans and clinical messages.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed ${
                m.from === "agent"
                  ? "bg-surface text-foreground"
                  : m.from === "system"
                    ? "border border-border text-muted-foreground"
                    : "ml-auto bg-primary text-primary-foreground"
              }`}
            >
              {m.text}
            </div>
          ))}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div ref={endRef} />
        </div>

        <div className="flex items-center gap-2 border-t border-border px-4 py-4">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder={ready ? "Describe what is going on…" : "Connecting…"}
            aria-label="Message the care agent"
            className="rounded-none"
          />
          <Button size="icon" className="rounded-none" onClick={send} aria-label="Send message">
            <Send className="size-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
