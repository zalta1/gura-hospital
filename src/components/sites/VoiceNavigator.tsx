import { CheckCircle2, Mic, MicOff, PhoneOff, Volume2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { createVoiceClientTools } from "@/lib/voice/client-tools";
import {
  resetIntakeSession,
  seedIntakeFromForm,
  nextAskHint,
  intakeComplete,
  matchInsurance,
  getIntakeSession,
  patchIntakeSession,
} from "@/lib/voice/intake";
import { createSpeechListener, kokoroVoice } from "@/lib/voice/kokoro";
import { VoiceOrb, type VoicePhase } from "./VoiceOrb";

type Caption = { role: "user" | "agent"; text: string };

const EMPTY = new Uint8Array(64);

const PHASE_LABEL: Record<VoicePhase, string> = {
  connecting: "Connecting",
  listening: "Listening",
  speaking: "Navigator speaking (Kokoro TTS)",
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

export interface VoiceNavigatorProps {
  open: boolean;
  onClose: () => void;
  formContext?: VoiceFormContext;
  onFormContextChange?: (patch: Partial<VoiceFormContext>) => void;
  onCallComplete?: (conversationId: string) => void;
}

export function VoiceNavigator(props: VoiceNavigatorProps) {
  if (!props.open) return null;
  return <VoiceNavigatorInner {...props} />;
}

function VoiceNavigatorInner({
  onClose,
  formContext,
  onFormContextChange,
  onCallComplete,
}: VoiceNavigatorProps) {
  const [phase, setPhase] = useState<VoicePhase>("connecting");
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [outcome, setOutcome] = useState<"active" | "submitted" | "incomplete">("active");
  const [entered, setEntered] = useState(false);

  const sessionIdRef = useRef<string>(crypto.randomUUID());
  const speechListenerRef = useRef<ReturnType<typeof createSpeechListener> | null>(null);
  const bookedRef = useRef(false);

  // Client tools bridge for booking and intake
  const clientTools = useMemo(() => {
    return createVoiceClientTools({
      sessionId: sessionIdRef.current,
      onFormPatch: (patch) => {
        onFormContextChange?.(patch);
      },
      onBooked: () => {
        bookedRef.current = true;
      },
    });
  }, [onFormContextChange]);

  const speakAgent = useCallback(
    async (text: string) => {
      setPhase("speaking");
      setCaptions((prev) => [...prev.slice(-3), { role: "agent", text }].slice(-3));

      // Temporarily pause speech listener to avoid echo feedback
      speechListenerRef.current?.stop();

      await kokoroVoice.speak(text, {
        voice: "af_heart",
        speed: 1.05,
        onEnd: () => {
          if (!isMuted) {
            speechListenerRef.current?.start();
          }
          setPhase("listening");
        },
        onError: () => {
          if (!isMuted) {
            speechListenerRef.current?.start();
          }
          setPhase("listening");
        },
      });
    },
    [isMuted],
  );

  const handleUserSpeech = useCallback(
    async (text: string, isFinal: boolean) => {
      if (!isFinal || !text.trim()) return;

      setCaptions((prev) => [...prev.slice(-3), { role: "user", text }].slice(-3));
      setPhase("thinking");

      // Check emergency phrases immediately
      const lowered = text.toLowerCase();
      if (
        lowered.includes("chest pain") ||
        lowered.includes("cannot breathe") ||
        lowered.includes("can't breathe") ||
        lowered.includes("stroke") ||
        lowered.includes("suicid")
      ) {
        await speakAgent(
          "Your message describes an emergency. Please hang up and dial 911 or visit the nearest emergency department immediately. I have flagged our on-call team.",
        );
        return;
      }

      // Route through intake slot matching
      const currentIntake = getIntakeSession(sessionIdRef.current);
      const patch: Record<string, string> = {};

      if (!currentIntake.reason) {
        patch.reason = text;
      } else if (!currentIntake.specialty && (lowered.includes("cardio") || lowered.includes("heart") || lowered.includes("ortho") || lowered.includes("doctor"))) {
        patch.specialty = text;
      } else if (!currentIntake.insurance && (lowered.includes("blue") || lowered.includes("aetna") || lowered.includes("cigna") || lowered.includes("self") || lowered.includes("medicare"))) {
        const match = matchInsurance(text);
        patch.insurance = match.matched || text;
      } else if (!currentIntake.full_name && text.split(" ").length >= 2) {
        patch.full_name = text;
      }

      patchIntakeSession(sessionIdRef.current, patch);
      const updated = getIntakeSession(sessionIdRef.current);
      onFormContextChange?.(patch);

      if (intakeComplete(updated)) {
        bookedRef.current = true;
        await speakAgent(
          "Thank you! We have collected all your intake information. Your visit request has been recorded for staff scheduling.",
        );
        setOutcome("submitted");
        onCallComplete?.(sessionIdRef.current);
        return;
      }

      const nextHint = nextAskHint(updated);
      let reply = `Got it. ${nextHint}`;
      if (patch.insurance) {
        const insCheck = matchInsurance(patch.insurance);
        reply = `${insCheck.note} ${nextHint}`;
      }

      await speakAgent(reply);
    },
    [speakAgent, onFormContextChange, onCallComplete],
  );

  useEffect(() => {
    const t = window.setTimeout(() => setEntered(true), 20);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    sessionIdRef.current = crypto.randomUUID();
    resetIntakeSession(sessionIdRef.current, seedIntakeFromForm(formContext));

    const listener = createSpeechListener({
      onTranscript: (t, isFinal) => {
        void handleUserSpeech(t, isFinal);
      },
      onError: (err: any) => {
        if (err?.error && err.error !== "no-speech") {
          setError("Microphone recognition error: " + err.error);
        }
      },
    });

    speechListenerRef.current = listener;
    listener.start();
    setPhase("listening");

    // Initial greeting via Kokoro
    const greeting = formContext?.doctorName
      ? `Hello, I'm the Gura Hospital care navigator. I see you'd like to book an appointment with ${formContext.doctorName}. What is the primary reason for your visit?`
      : "Hello, I'm the Gura Hospital care navigator powered by Kokoro voice synthesis. How can we help you today?";

    void speakAgent(greeting);

    return () => {
      listener.stop();
      kokoroVoice.stop();
    };
  }, []);

  const toggleMute = () => {
    if (isMuted) {
      speechListenerRef.current?.start();
      setIsMuted(false);
    } else {
      speechListenerRef.current?.stop();
      setIsMuted(true);
    }
  };

  const hangup = () => {
    speechListenerRef.current?.stop();
    kokoroVoice.stop();
    onClose();
  };

  const dummyBins = useMemo(() => new Uint8Array(64).fill(phase === "speaking" ? 120 : phase === "listening" ? 40 : 0), [phase]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Voice care navigator"
      className={`fixed inset-0 z-50 flex flex-col bg-navy text-primary-foreground transition-opacity duration-300 ${
        entered ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div>
          <h2 className="font-serif text-lg text-primary-foreground flex items-center gap-2">
            <Volume2 className="size-4 text-gold" />
            Gura Voice Navigator
            <span className="text-xs bg-gold/20 text-gold px-2 py-0.5 rounded-full font-sans">
              Kokoro TTS
            </span>
          </h2>
          <p className="text-xs text-primary-foreground/60">
            Open-weight voice assistant · No API credit limits
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={hangup} className="text-primary-foreground/80 hover:text-white">
          Close
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {outcome === "submitted" ? (
          <div className="text-center space-y-4 max-w-md">
            <CheckCircle2 className="size-16 text-emerald-400 mx-auto" />
            <h3 className="font-serif text-2xl">Intake Submitted</h3>
            <p className="text-sm text-primary-foreground/75">
              Your appointment request and details have been recorded. Our team will contact you shortly with confirmed times.
            </p>
            <Button variant="gold" size="pillLg" onClick={hangup} className="mt-4">
              Return to booking form
            </Button>
          </div>
        ) : (
          <>
            <VoiceOrb
              phase={phase}
              getInputBins={() => dummyBins}
              getOutputBins={() => dummyBins}
              isMuted={isMuted}
            />

            <p className="mt-6 text-sm font-medium tracking-wide uppercase text-gold">
              {PHASE_LABEL[phase]}
            </p>

            {error && <p className="mt-2 text-xs text-red-400 bg-red-950/40 px-3 py-1 rounded">{error}</p>}

            <div className="mt-8 w-full max-w-xl space-y-2 bg-white/5 rounded-xl p-4 min-h-[100px] border border-white/10">
              {captions.length === 0 ? (
                <p className="text-center text-sm text-primary-foreground/50 py-4">
                  Listening for your speech... Speak naturally.
                </p>
              ) : (
                captions.map((c, i) => (
                  <p key={i} className="text-sm leading-relaxed">
                    <span className="font-semibold text-gold mr-2">
                      {c.role === "agent" ? "Navigator:" : "You:"}
                    </span>
                    <span className={c.role === "agent" ? "text-primary-foreground/90" : "text-white"}>
                      {c.text}
                    </span>
                  </p>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {outcome === "active" && (
        <div className="flex items-center justify-center gap-4 pb-10">
          <Button
            type="button"
            size="pillLg"
            variant="outlineLight"
            onClick={toggleMute}
            aria-pressed={isMuted}
          >
            {isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            {isMuted ? "Unmute" : "Mute mic"}
          </Button>
          <Button type="button" size="pillLg" variant="gold" onClick={hangup}>
            <PhoneOff className="size-4" />
            End call
          </Button>
        </div>
      )}
    </div>
  );
}
