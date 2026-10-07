import { useRouterState } from "@tanstack/react-router";
import { Paperclip, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageGate, EmptyState } from "@/components/patient/ui";
import { usePatientPortal, useSnapshot } from "@/components/patient/PatientPortalProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { doctorById } from "@/lib/patient-portal/data";
import { formatDateTime } from "@/lib/portal/format";
import { cn } from "@/lib/utils";

export function MessagesPage() {
  return (
    <PageGate>
      <MessagesBody />
    </PageGate>
  );
}

function MessagesBody() {
  const snapshot = useSnapshot();
  const { sendMessage, markThreadRead, typingDoctorId } = usePatientPortal();
  const search = useRouterState({ select: (s) => s.location.search });
  const requested = typeof search === "object" && search && "thread" in search ? String(search.thread) : "";
  const threads = useMemo(() => {
    const ids = [...new Set(snapshot.messages.map((message) => message.doctorId))];
    return ids
      .map((id) => {
        const doctor = doctorById(snapshot, id);
        const messages = snapshot.messages.filter((message) => message.doctorId === id);
        const unread = messages.filter((message) => message.from === "doctor" && !message.read).length;
        return { id, doctor, messages, unread };
      })
      .filter((thread) => thread.doctor);
  }, [snapshot]);

  const [activeId, setActiveId] = useState(requested || threads[0]?.id || "");
  const [mobileThread, setMobileThread] = useState(Boolean(requested));
  const [draft, setDraft] = useState("");
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    if (requested) {
      setActiveId(requested);
      setMobileThread(true);
    }
  }, [requested]);

  useEffect(() => {
    if (activeId) markThreadRead(activeId);
  }, [activeId, snapshot.messages.length, markThreadRead]);

  const active = threads.find((thread) => thread.id === activeId) ?? null;

  return (
    <div className="space-y-3">
      <p className="border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-primary">
        For emergencies call 911. Messages are not monitored around the clock.
      </p>
      {threads.length === 0 ? (
        <EmptyState title="No messages" body="When a doctor sends a note, the thread will appear here." />
      ) : (
        <div className="grid min-h-[28rem] border border-border bg-card shadow-card md:grid-cols-[16rem_1fr]">
          <div className={cn("border-b border-border md:border-b-0 md:border-r", mobileThread && "hidden md:block")}>
            <ul>
              {threads.map((thread) => (
                <li key={thread.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(thread.id);
                      setMobileThread(true);
                    }}
                    className={cn(
                      "flex w-full items-start justify-between gap-2 px-3 py-3 text-left hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      thread.id === activeId && "bg-surface",
                    )}
                  >
                    <span>
                      <span className="block text-sm font-medium text-primary">{thread.doctor?.name}</span>
                      <span className="block text-xs text-muted-foreground">{thread.doctor?.specialty}</span>
                    </span>
                    {thread.unread > 0 ? (
                      <span className="rounded-full bg-gold px-1.5 text-[10px] font-semibold text-gold-foreground">{thread.unread}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className={cn("flex min-h-[24rem] flex-col", !mobileThread && "hidden md:flex")}>
            {active ? (
              <>
                <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                  <Button type="button" variant="ghost" size="sm" className="md:hidden" onClick={() => setMobileThread(false)}>
                    Back
                  </Button>
                  <div>
                    <p className="text-sm font-medium text-primary">{active.doctor?.name}</p>
                    <p className="text-xs text-muted-foreground">{active.doctor?.specialty}</p>
                  </div>
                </div>
                <div className="flex-1 space-y-3 overflow-auto px-4 py-4" aria-live="polite">
                  {active.messages.length === 0 ? (
                    <EmptyState title="No messages yet" body="Send a note to start this thread." />
                  ) : (
                    active.messages.map((message) => {
                      const laterReply = active.messages.some(
                        (other) => other.from === "doctor" && new Date(other.at).getTime() > new Date(message.at).getTime(),
                      );
                      return (
                        <div key={message.id} className={cn("max-w-[36rem]", message.from === "patient" ? "ml-auto" : "mr-auto")}>
                          <div
                            className={cn(
                              "rounded-md px-3 py-2 text-sm",
                              message.from === "patient" ? "bg-primary text-primary-foreground" : "bg-surface",
                            )}
                          >
                            <p>{message.body}</p>
                            {message.attachmentName ? (
                              <p className="mt-2 rounded border border-current/20 px-2 py-1 text-xs">
                                Attachment: {message.attachmentName}
                              </p>
                            ) : null}
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {formatDateTime(message.at)}
                            {message.from === "patient" ? ` · ${laterReply ? "Read" : "Delivered"}` : null}
                          </p>
                        </div>
                      );
                    })
                  )}
                  {typingDoctorId === active.id ? (
                    <p className="text-sm text-muted-foreground">
                      Dr. {active.doctor?.name.split(" ").at(-1)} is typing
                      <span className="motion-safe:animate-pulse motion-reduce:animate-none">...</span>
                    </p>
                  ) : null}
                </div>
                <form
                  className="space-y-2 border-t border-border p-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    sendMessage(active.id, draft, fileName || undefined);
                    setDraft("");
                    setFileName("");
                  }}
                >
                  {fileName ? <p className="text-xs text-muted-foreground">Attached: {fileName}</p> : null}
                  <Textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Write a secure message"
                    aria-label="Message"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground">
                      <Paperclip className="size-3.5" />
                      Attach file
                      <input
                        type="file"
                        className="sr-only"
                        onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
                      />
                    </label>
                    <Button type="submit" variant="gold" size="sm" disabled={!draft.trim() && !fileName}>
                      <Send className="size-3.5" /> Send
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <EmptyState title="Choose a conversation" body="Select a doctor to read the thread." />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
