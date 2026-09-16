import { CheckCircle2, Mic, MicOff, PhoneOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { Button } from "@/components/ui/button";
import { createVoiceClientTools } from "@/lib/voice/client-tools";
import { getElevenLabsSignedUrl } from "@/lib/voice/get-signed-url.fn";
import { resetIntakeSession, seedIntakeFromForm } from "@/lib/voice/intake";
import {
  installVoiceCaptureBridge,
  microphoneErrorMessage,
  startSpeechRelay,
  type VoiceCapture,
} from "@/lib/voice/microphone";
import { navigatorSessionOverrides } from "@/lib/voice/session-config";
import { VoiceOrb, type VoicePhase } from "./VoiceOrb";

type Caption = { role: "user" | "agent"; text: string };

const EMPTY = new Uint8Array(64);

const PHASE_LABEL: Record<VoicePhase, string> = {
  connecting: "Connecting",
  listening: "Listening",
  speaking: "Navigator speaking",
  thinking: "Thinking",
};

export type VoiceFormContext = {
  doctorSlug?: string;
  doctorName?: string;
  reason?: string;
  insurance?: string;
  preferredSpecialty?: string;
  visitPreference?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
};

function binsFromVolume(volume: number): Uint8Array {
  const bins = new Uint8Array(64);
  const level = Math.max(0, Math.min(1, volume));
  bins.fill(Math.round(level * 180));
  return bins;
}

/**
 * A dropped session and a finished intake look identical to the UI otherwise,
 * so surface the server's own words. Quota exhaustion in particular arrives as
 * a mid-turn close and used to read as a completed request.
 */
function disconnectMessage(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  const d = details as { reason?: string; message?: string; closeReason?: string };
  const raw = [d.message, d.closeReason].find((t) => typeof t === "string" && t.trim());
  if (raw && /quota|credit|billing|limit/i.test(raw)) {
    return `The voice provider cut the call off: "${raw.trim()}" This is an ElevenLabs account limit, not a problem with your answers.`;
  }
  if (raw) return `The call dropped before intake finished: ${raw.trim()}`;
  if (d.reason === "error") return "The voice connection dropped before intake finished.";
  return null;
}

function dynamicVariablesFromForm(ctx: VoiceFormContext | undefined): Record<string, string> {
  return {
    doctor_slug: ctx?.doctorSlug?.trim() || "",
    doctor_name: ctx?.doctorName?.trim() || "",
    reason_for_visit: ctx?.reason?.trim() || "",
    insurance: ctx?.insurance?.trim() || "",
    preferred_specialty: ctx?.preferredSpecialty?.trim() || "",
    visit_preference: ctx?.visitPreference?.trim() || "",
    full_name: ctx?.fullName?.trim() || "",
    email: ctx?.email?.trim() || "",
    phone: ctx?.phone?.trim() || "",
    date_of_birth: ctx?.dateOfBirth?.trim() || "",
  };
}

export function VoiceNavigator({
  open,
  onOpenChange,
  onCallComplete,
  formContext,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCallComplete?: ((callId: string) => void) | undefined;
  formContext?: VoiceFormContext | undefined;
}) {
  if (!open) return null;
  return (
    <ConversationProvider>
      <VoiceNavigatorSession
        onOpenChange={onOpenChange}
        onCallComplete={onCallComplete}
        formContext={formContext}
      />
    </ConversationProvider>
  );
}

function VoiceNavigatorSession({
  onOpenChange,
  onCallComplete,
  formContext,
}: {
  onOpenChange: (open: boolean) => void;
  onCallComplete?: ((callId: string) => void) | undefined;
  formContext?: VoiceFormContext | undefined;
}) {
  const [phase, setPhase] = useState<VoicePhase>("connecting");
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<"active" | "submitted" | "incomplete">("active");
  const [dropReason, setDropReason] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);
  const [callId, setCallId] = useState<string | null>(null);

  const conversationIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef(crypto.randomUUID());
  const bookedRef = useRef(false);
  const closing = useRef(false);
  const connectedOnce = useRef(false);
  const waitingForAgent = useRef(false);
  const errorRef = useRef<string | null>(null);
  const captureRef = useRef<VoiceCapture | null>(null);
  const sdkSilentRef = useRef(true);
  const listenGate = useRef({
    connected: false,
    listening: true,
    muted: false,
  });
  const [retryToken, setRetryToken] = useState(0);

  const clientTools = useMemo(
    () =>
      createVoiceClientTools({
        getConversationId: () => conversationIdRef.current,
        getSessionId: () => sessionIdRef.current,
        getDoctorSlug: () => formContext?.doctorSlug?.trim() ?? "",
        onBookingSuccess: () => {
          bookedRef.current = true;
        },
      }),
    [formContext?.doctorSlug],
  );

  const conversation = useConversation({
    clientTools,
    onConnect: ({ conversationId }) => {
      conversationIdRef.current = conversationId;
      setCallId(conversationId);
      connectedOnce.current = true;
      listenGate.current.connected = true;
      try {
        conversation.setMuted(false);
      } catch {
        /* session still attaching */
      }
      if (!waitingForAgent.current) setPhase("listening");
    },
    onStatusChange: ({ status }) => {
      if (status === "connecting") setPhase("connecting");
      if (status === "connected" && !waitingForAgent.current) setPhase("listening");
    },
    onModeChange: ({ mode }) => {
      waitingForAgent.current = false;
      const next = mode === "speaking" ? "speaking" : "listening";
      listenGate.current.listening = next === "listening";
      if (next === "speaking") {
        captureRef.current?.setCaptureEnabled(false);
        setPhase("speaking");
      } else {
        window.setTimeout(() => {
          if (listenGate.current.listening && !listenGate.current.muted) {
            captureRef.current?.setCaptureEnabled(true);
          }
        }, 120);
        setPhase((prev) => (prev === "thinking" ? prev : "listening"));
      }
    },
    onInterruption: () => {
      listenGate.current.listening = true;
      if (!listenGate.current.muted) captureRef.current?.setCaptureEnabled(true);
      waitingForAgent.current = false;
      setPhase("listening");
    },
    onMessage: ({ message, role }) => {
      if (!message?.trim()) return;
      const line: Caption = { role: role === "user" ? "user" : "agent", text: message };
      setCaptions((prev) => [...prev.slice(-2), line].slice(-2));
      if (line.role === "user") {
        waitingForAgent.current = true;
        setPhase("thinking");
      }
    },
    onError: (message) => {
      const text = microphoneErrorMessage(
        typeof message === "string" ? { name: "", message } : message,
      );
      errorRef.current = text;
      setError(text);
      setPhase("listening");
    },
    onDisconnect: (details) => {
      listenGate.current.connected = false;
      captureRef.current?.dispose();
      captureRef.current = null;
      if (closing.current) return;
      if (!connectedOnce.current || errorRef.current) return;
      closing.current = true;
      const id = conversationIdRef.current;
      if (bookedRef.current) {
        setOutcome("submitted");
        if (id) onCallComplete?.(id);
        return;
      }
      setDropReason(disconnectMessage(details));
      setOutcome("incomplete");
    },
  });
  const conversationApi = useRef(conversation);
  conversationApi.current = conversation;

  const getInputBins = useCallback(() => {
    try {
      const volume = conversation.getInputVolume();
      if (volume > 0.015) sdkSilentRef.current = false;
      const data = conversation.getInputByteFrequencyData();
      if (data.length > 0 && volume > 0.01) return data;
    } catch {
      /* session not ready */
    }
    const fromCapture = captureRef.current?.getInputBins();
    if (fromCapture && fromCapture.length > 0) return fromCapture;
    try {
      return binsFromVolume(conversation.getInputVolume());
    } catch {
      return EMPTY;
    }
  }, [conversation]);

  const getOutputBins = useCallback(() => {
    try {
      const data = conversation.getOutputByteFrequencyData();
      if (data.length > 0) return data;
    } catch {
      /* session not ready */
    }
    try {
      return binsFromVolume(conversation.getOutputVolume());
    } catch {
      return EMPTY;
    }
  }, [conversation]);

  useEffect(() => {
    const t = window.setTimeout(() => setEntered(true), 20);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    closing.current = false;
    connectedOnce.current = false;
    errorRef.current = null;
    waitingForAgent.current = false;
    conversationIdRef.current = null;
    bookedRef.current = false;
    sessionIdRef.current = crypto.randomUUID();
    resetIntakeSession(sessionIdRef.current, seedIntakeFromForm(formContext));
    sdkSilentRef.current = true;
    listenGate.current = { connected: false, listening: true, muted: false };
    setOutcome("active");
    setDropReason(null);
    setError(null);
    setCaptions([]);
    setPhase("connecting");

    let cancelled = false;

    async function start() {
      try {
        captureRef.current?.dispose();
        captureRef.current = await installVoiceCaptureBridge();
        if (cancelled) {
          captureRef.current.dispose();
          captureRef.current = null;
          return;
        }

        let signedUrl: string | undefined;
        try {
          const res = await fetch("/api/elevenlabs/signed-url");
          const body = (await res.json()) as { signed_url?: string; error?: string };
          if (res.ok && body.signed_url) signedUrl = body.signed_url;
          else if (!res.ok) throw new Error(body.error || "Could not start the voice navigator.");
        } catch (err) {
          if (err instanceof Error && err.message.includes("Could not start")) throw err;
        }
        if (!signedUrl) {
          const body = await getElevenLabsSignedUrl();
          signedUrl = body.signed_url;
        }
        if (cancelled) return;

        conversation.startSession({
          signedUrl,
          connectionType: "websocket",
          clientTools,
          dynamicVariables: dynamicVariablesFromForm(formContext),
          overrides: navigatorSessionOverrides,
        });
      } catch (err) {
        if (cancelled) return;
        captureRef.current?.dispose();
        captureRef.current = null;
        const text = microphoneErrorMessage(err);
        errorRef.current = text;
        setError(text);
        setPhase("listening");
      }
    }

    void start();
    return () => {
      cancelled = true;
      closing.current = true;
      captureRef.current?.dispose();
      captureRef.current = null;
      try {
        conversation.endSession();
      } catch {
        /* already closed */
      }
    };
    // Start once when the modal mounts (ConversationProvider is created per open).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryToken]);

  useEffect(() => {
    let lastSpeechAt = 0;
    let lastOutputAt = 0;
    const poll = window.setInterval(() => {
      const api = conversationApi.current;
      try {
        if (api.getInputVolume() > 0.015) sdkSilentRef.current = false;
      } catch {
        /* session not ready */
      }
      try {
        const out = api.getOutputVolume();
        if (out > 0.02) {
          lastOutputAt = Date.now();
          if (!listenGate.current.listening) setPhase("speaking");
        } else if (
          !listenGate.current.listening &&
          lastOutputAt > 0 &&
          Date.now() - lastOutputAt > 450
        ) {
          listenGate.current.listening = true;
          if (!listenGate.current.muted) captureRef.current?.setCaptureEnabled(true);
          setPhase("listening");
        }
      } catch {
        /* session not ready */
      }
      const gate = listenGate.current;
      const level = captureRef.current?.getInputLevel() ?? 0;
      if (level > 0.08) lastSpeechAt = Date.now();
      if (gate.connected && gate.listening && !gate.muted && Date.now() - lastSpeechAt < 900) {
        try {
          api.sendUserActivity();
        } catch {
          /* session not ready */
        }
      }
    }, 120);
    return () => window.clearInterval(poll);
  }, []);

  useEffect(() => {
    if (!callId || outcome !== "active") return;
    const stop = startSpeechRelay({
      shouldListen: () => {
        const gate = listenGate.current;
        return gate.connected && gate.listening && !gate.muted && sdkSilentRef.current;
      },
      commitDelayMs: 700,
      onTranscript: (text) => {
        try {
          conversationApi.current.sendUserMessage(text);
        } catch {
          /* session ended */
        }
      },
    });
    return stop;
  }, [callId, outcome]);

  function hangup() {
    closing.current = true;
    listenGate.current.connected = false;
    captureRef.current?.dispose();
    captureRef.current = null;
    try {
      conversation.endSession();
    } catch {
      /* already closed */
    }
    const id = conversationIdRef.current;
    if (errorRef.current || !connectedOnce.current) {
      onOpenChange(false);
      return;
    }
    if (bookedRef.current) {
      setOutcome("submitted");
      if (id) onCallComplete?.(id);
      return;
    }
    setOutcome("incomplete");
  }

  function toggleMute() {
    const next = !conversation.isMuted;
    listenGate.current.muted = next;
    conversation.setMuted(next);
    captureRef.current?.setCaptureEnabled(!next && listenGate.current.listening);
  }

  const recent = captions.slice(-2);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-primary text-primary-foreground transition-opacity duration-500 ${
        entered ? "opacity-100" : "opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Voice care navigator"
    >
      <div className="h-1 bg-gold" />
      {outcome === "submitted" ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <CheckCircle2 className="size-12 text-gold" />
          <h2 className="mt-6 font-display text-3xl">Request received</h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-primary-foreground/75">
            Your conversation is pending navigator review. A care team member will confirm
            specialty, insurance, and visit options. This assistant does not diagnose.
          </p>
          {callId && (
            <p className="mt-3 text-xs text-primary-foreground/45">Call ID {callId}</p>
          )}
          <Button
            size="pillLg"
            variant="gold"
            className="mt-10"
            onClick={() => onOpenChange(false)}
          >
            Return to appointments
          </Button>
        </div>
      ) : outcome === "incomplete" ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <PhoneOff className="size-12 text-gold" />
          <h2 className="mt-6 font-display text-3xl">Call ended</h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-primary-foreground/75">
            {dropReason ??
              "The visit request was not submitted. Intake was still missing required details."}
          </p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-primary-foreground/60">
            Nothing was sent to a navigator. You can use the appointment form instead, or try
            the call again.
          </p>
          {callId && (
            <p className="mt-3 text-xs text-primary-foreground/45">Call ID {callId}</p>
          )}
          <Button
            size="pillLg"
            variant="gold"
            className="mt-10"
            onClick={() => onOpenChange(false)}
          >
            Return to appointments
          </Button>
        </div>
      ) : (
        <>
          <p className="px-6 pt-6 text-center text-xs text-primary-foreground/65">
            Live assistant, not medical advice. Clinicians approve follow-up plans and clinical
            messages.
          </p>

          <div className="flex flex-1 flex-col items-center justify-center px-6">
            <VoiceOrb phase={phase} getInputBins={getInputBins} getOutputBins={getOutputBins} />
            <p className="eyebrow mt-4">{PHASE_LABEL[phase]}</p>
            {error && (
              <div className="mt-3 max-w-lg space-y-3 text-center">
                <p className="text-sm text-gold">{error}</p>
                <Button
                  type="button"
                  size="pill"
                  variant="outlineLight"
                  onClick={() => {
                    errorRef.current = null;
                    setError(null);
                    setRetryToken((n) => n + 1);
                  }}
                >
                  Try again
                </Button>
              </div>
            )}
            <div className="mt-8 w-full max-w-xl space-y-3">
              {recent.length === 0 ? (
                <p className="text-center text-sm text-primary-foreground/50">
                  Captions will appear here as you speak.
                </p>
              ) : (
                recent.map((c, i) => (
                  <p
                    key={`${c.role}-${i}-${c.text.slice(0, 12)}`}
                    className={`text-sm leading-relaxed ${
                      c.role === "agent" ? "text-primary-foreground/85" : "text-gold"
                    }`}
                  >
                    <span className="nav-label mr-2 text-[0.65rem] text-gold">
                      {c.role === "agent" ? "Navigator" : "You"}
                    </span>
                    {c.text}
                  </p>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 pb-10">
            <Button
              type="button"
              size="pillLg"
              variant="outlineLight"
              onClick={toggleMute}
              aria-pressed={conversation.isMuted}
              disabled={Boolean(error) && !connectedOnce.current}
            >
              {conversation.isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              {conversation.isMuted ? "Unmute" : "Mute mic"}
            </Button>
            <Button type="button" size="pillLg" variant="gold" onClick={hangup}>
              <PhoneOff className="size-4" />
              End call
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
