import { MessageSquare, Mic, MicOff, MonitorUp, PhoneOff, Video, VideoOff } from "lucide-react";
import { useEffect, useState } from "react";
import { PageGate, EmptyState, StatusChip } from "@/components/patient/ui";
import { usePatientPortal, useSnapshot } from "@/components/patient/PatientPortalProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { canJoinVideo, doctorById, doctorName, nextAppointment } from "@/lib/patient-portal/data";
import { formatDateTime } from "@/lib/portal/format";

const CHECKLIST = ["Test camera", "Test microphone", "Find a quiet place", "Have medication list ready"];

export function VideoPage() {
  return (
    <PageGate>
      <VideoBody />
    </PageGate>
  );
}

function VideoBody() {
  const snapshot = useSnapshot();
  const { sendMessage } = usePatientPortal();
  const upcoming = snapshot.appointments.find(
    (row) => row.mode === "telehealth" && (row.status === "pending" || row.status === "confirmed"),
  );
  const next = nextAppointment(snapshot);
  const visit = upcoming ?? (next?.mode === "telehealth" ? next : null);
  const doctor = visit ? doctorById(snapshot, visit.doctorId) : null;
  const past = snapshot.appointments.filter((row) => row.mode === "telehealth" && row.status === "completed");
  const [checks, setChecks] = useState<string[]>([]);
  const [phase, setPhase] = useState<"lobby" | "connecting" | "live" | "ended">("lobby");
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [camera, setCamera] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [chat, setChat] = useState("");
  const [rating, setRating] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (phase !== "live") return;
    const id = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "connecting") return;
    const id = window.setTimeout(() => setPhase("live"), 1200);
    return () => window.clearTimeout(id);
  }, [phase]);

  const countdown = visit ? formatCountdown(new Date(visit.datetime).getTime() - now) : "";
  const windowOpen = visit ? canJoinVideo(visit, now) : false;

  if (phase === "connecting" || phase === "live") {
    return (
      <div className="fixed inset-0 z-[70] flex flex-col bg-primary text-primary-foreground">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-xs uppercase tracking-[0.14em] text-gold">Demo call</p>
          <p className="text-sm">{phase === "connecting" ? "Connecting…" : formatTimer(seconds)}</p>
        </div>
        <div className="relative flex flex-1 items-center justify-center">
          {phase === "connecting" ? (
            <p className="text-lg motion-safe:animate-pulse motion-reduce:animate-none">Connecting to {doctor?.name}</p>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="flex size-36 items-center justify-center rounded-full bg-primary-soft font-display text-4xl">
                {doctor?.initials ?? "DR"}
              </div>
              <p className="flex items-center gap-2 text-sm">
                <span className="size-2 rounded-full bg-gold motion-safe:animate-pulse motion-reduce:animate-none" aria-hidden />
                Connected
              </p>
              <p>{doctor ? doctorName(snapshot, doctor.id) : "Your doctor"}</p>
            </div>
          )}
          <div className="absolute bottom-4 right-4 flex h-28 w-40 items-center justify-center border border-primary-foreground/20 bg-primary-soft text-sm">
            {camera ? "ME" : "Camera off"}
          </div>
          {sharing ? <p className="absolute left-4 top-4 bg-gold px-2 py-1 text-xs text-gold-foreground">Sharing your screen</p> : null}
          {chatOpen ? (
            <aside className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col border-l border-primary-foreground/10 bg-primary">
              <div className="flex-1 space-y-2 overflow-auto p-3 text-sm">
                {snapshot.messages
                  .filter((message) => visit && message.doctorId === visit.doctorId)
                  .slice(-6)
                  .map((message) => (
                    <p key={message.id}>{message.body}</p>
                  ))}
              </div>
              <form
                className="flex gap-2 p-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!visit) return;
                  sendMessage(visit.doctorId, chat);
                  setChat("");
                }}
              >
                <Input value={chat} onChange={(event) => setChat(event.target.value)} aria-label="Call chat" className="bg-card text-foreground" />
                <Button type="submit" variant="gold" size="sm">
                  Send
                </Button>
              </form>
            </aside>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 px-4 py-4">
          <Button type="button" variant="outlineLight" size="icon" aria-label={muted ? "Unmute" : "Mute"} aria-pressed={muted} onClick={() => setMuted((v) => !v)}>
            {muted ? <MicOff /> : <Mic />}
          </Button>
          <Button type="button" variant="outlineLight" size="icon" aria-label={camera ? "Turn camera off" : "Turn camera on"} aria-pressed={!camera} onClick={() => setCamera((v) => !v)}>
            {camera ? <Video /> : <VideoOff />}
          </Button>
          <Button type="button" variant="outlineLight" size="icon" aria-label="Toggle chat" aria-pressed={chatOpen} onClick={() => setChatOpen((v) => !v)}>
            <MessageSquare />
          </Button>
          <Button type="button" variant="outlineLight" size="icon" aria-label="Share screen" aria-pressed={sharing} onClick={() => setSharing((v) => !v)}>
            <MonitorUp />
          </Button>
          <Button type="button" variant="destructive" size="icon" aria-label="End call" onClick={() => setPhase("ended")}>
            <PhoneOff />
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "ended") {
    return (
      <section className="mx-auto max-w-lg border border-border bg-card p-6 shadow-card">
        <p className="eyebrow">Visit complete</p>
        <h2 className="mt-1 font-display text-2xl text-primary">How was the visit?</h2>
        <div className="mt-4 flex gap-2" role="group" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((score) => (
            <Button key={score} type="button" size="icon" variant={rating === score ? "gold" : "outline"} aria-label={`${score} out of 5`} onClick={() => setRating(score)}>
              {score}
            </Button>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Visit summary will appear in your Health Record.</p>
        <Button type="button" className="mt-4" variant="outlineNavy" onClick={() => setPhase("lobby")}>
          Back to video visits
        </Button>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {visit && doctor ? (
        <section className="border border-border bg-card p-5 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Upcoming video visit</p>
              <h2 className="mt-1 font-display text-2xl text-primary">{visit.reason}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{doctorName(snapshot, doctor.id)}</p>
              <p className="text-sm text-muted-foreground">{formatDateTime(visit.datetime)}</p>
              <p className="mt-2 text-sm text-primary">{countdown}</p>
              <div className="mt-2">
                <StatusChip value={visit.status} />
              </div>
            </div>
            <Button type="button" variant="gold" onClick={() => setPhase("connecting")}>
              Join
            </Button>
          </div>
          <p className="mt-3 text-xs uppercase tracking-wide text-gold">Demo call</p>
          {!windowOpen ? (
            <p className="mt-1 text-xs text-muted-foreground">
              The official join window opens 15 minutes before the start time. This demo room is available so you can preview the call.
            </p>
          ) : null}
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {CHECKLIST.map((item) => (
              <li key={item}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checks.includes(item)}
                    onChange={() =>
                      setChecks((current) => (current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item]))
                    }
                  />
                  {item}
                </label>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <EmptyState title="No video visit scheduled" body="When a telehealth visit is booked, it will show up here." />
      )}

      <section className="border border-border bg-card shadow-card">
        <div className="bg-primary px-4 py-2 text-primary-foreground">
          <h2 className="nav-label">Past video visits</h2>
        </div>
        {past.length === 0 ? (
          <EmptyState title="No past video visits" body="Completed telehealth visits will be listed here." />
        ) : (
          <ul className="divide-y divide-border">
            {past.map((row) => (
              <li key={row.id} className="px-4 py-3 text-sm">
                <p className="font-medium text-primary">{row.reason}</p>
                <p className="text-muted-foreground">
                  {formatDateTime(row.datetime)} · {doctorName(snapshot, row.doctorId)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatTimer(total: number) {
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatCountdown(delta: number) {
  if (delta <= 0) return "Your visit time has started.";
  const hours = Math.floor(delta / 3600000);
  const minutes = Math.floor((delta % 3600000) / 60000);
  if (hours > 48) return `Starts in ${Math.floor(hours / 24)} days`;
  if (hours > 0) return `Starts in ${hours}h ${minutes}m`;
  return `Starts in ${minutes}m`;
}
