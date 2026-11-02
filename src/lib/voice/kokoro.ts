/**
 * Kokoro TTS & Client-Side Voice Engine
 *
 * Provides a drop-in replacement for proprietary voice providers:
 * 1. Kokoro TTS synthesis via backend/local service with audio buffer caching.
 * 2. High-quality Web Speech fallback using the browser's native natural speech synthesis (Samantha / Victoria / Google US English).
 * 3. Speech Recognition integration using webkitSpeechRecognition / SpeechRecognition.
 */

export type KokoroVoice =
  | "af_heart"
  | "af_alloy"
  | "af_aoede"
  | "af_bella"
  | "af_jessica"
  | "af_kore"
  | "af_nicole"
  | "af_nova"
  | "af_river"
  | "af_sarah"
  | "af_sky"
  | "am_adam"
  | "am_echo"
  | "am_eric"
  | "am_fenrir"
  | "am_liam"
  | "am_michael"
  | "am_onyx"
  | "am_puck";

export interface SpeakOptions {
  voice?: KokoroVoice;
  speed?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: Error) => void;
}

class KokoroVoiceEngine {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private isSpeaking = false;

  private getAudioContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === "closed") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();
    }
    if (this.audioContext.state === "suspended") {
      void this.audioContext.resume();
    }
    return this.audioContext;
  }

  /**
   * Synthesize text and play audio via Kokoro API or high-fidelity Web Speech fallback.
   */
  async speak(text: string, options: SpeakOptions = {}): Promise<void> {
    this.stop();
    this.isSpeaking = true;
    options.onStart?.();

    const voice = options.voice || "af_heart";
    const speed = options.speed || 1.0;

    // 1. Attempt Kokoro backend TTS synthesis
    try {
      const response = await fetch("/api/voice/kokoro-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice, speed }),
      });

      if (response.ok && response.headers.get("content-type")?.includes("audio")) {
        const arrayBuffer = await response.arrayBuffer();
        const ctx = this.getAudioContext();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        this.currentSource = source;

        source.onended = () => {
          this.isSpeaking = false;
          this.currentSource = null;
          options.onEnd?.();
        };

        source.start(0);
        return;
      }
    } catch {
      // Backend Kokoro audio route not reachable or disabled; fallback to browser speech synthesis
    }

    // 2. High-fidelity browser speech synthesis fallback
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = speed;
      utterance.pitch = 1.0;

      // Select natural preferred voice if available
      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(
        (v) =>
          (v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Premium"))) ||
          v.lang === "en-US",
      );
      if (naturalVoice) {
        utterance.voice = naturalVoice;
      }

      utterance.onend = () => {
        this.isSpeaking = false;
        options.onEnd?.();
      };
      utterance.onerror = (e) => {
        this.isSpeaking = false;
        if (e.error !== "canceled") {
          options.onError?.(new Error(`Speech synthesis error: ${e.error}`));
        }
      };

      window.speechSynthesis.speak(utterance);
      return;
    }

    this.isSpeaking = false;
    options.onEnd?.();
  }

  stop(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        // already stopped
      }
      this.currentSource = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
  }

  speaking(): boolean {
    return this.isSpeaking;
  }
}

export const kokoroVoice = new KokoroVoiceEngine();

/**
 * Creates a browser-compatible continuous speech recognition listener
 */
export function createSpeechListener(callbacks: {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError: (err: unknown) => void;
  onListeningChange?: (listening: boolean) => void;
}) {
  if (typeof window === "undefined") {
    return { start: () => {}, stop: () => {} };
  }

  const SpeechRec =
    (window as unknown as { SpeechRecognition?: any }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

  if (!SpeechRec) {
    callbacks.onError(new Error("Browser does not support SpeechRecognition."));
    return { start: () => {}, stop: () => {} };
  }

  const recognition = new SpeechRec();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  let active = false;

  recognition.onstart = () => {
    active = true;
    callbacks.onListeningChange?.(true);
  };

  recognition.onend = () => {
    callbacks.onListeningChange?.(false);
    if (active) {
      try {
        recognition.start();
      } catch {
        // restart silently
      }
    }
  };

  recognition.onerror = (event: any) => {
    if (event.error !== "no-speech") {
      callbacks.onError(event);
    }
  };

  recognition.onresult = (event: any) => {
    let interim = "";
    let final = "";
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const part = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        final += part;
      } else {
        interim += part;
      }
    }
    const text = (final || interim).trim();
    if (text) {
      callbacks.onTranscript(text, Boolean(final));
    }
  };

  return {
    start: () => {
      active = true;
      try {
        recognition.start();
      } catch {
        // already started
      }
    },
    stop: () => {
      active = false;
      try {
        recognition.stop();
      } catch {
        // already stopped
      }
      callbacks.onListeningChange?.(false);
    },
  };
}

