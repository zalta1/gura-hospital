/** Maps browser mic failures to copy patients can act on. */
export function microphoneErrorMessage(err: unknown): string {
  const name = err && typeof err === "object" && "name" in err ? String(err.name) : "";
  const raw = err instanceof Error ? err.message.toLowerCase() : String(err ?? "").toLowerCase();
  const text = `${name} ${raw}`.toLowerCase();

  if (
    name === "NotFoundError" ||
    name === "DevicesNotFoundError" ||
    text.includes("requested device not found") ||
    text.includes("device not found")
  ) {
    return [
      "No microphone was found.",
      "Open this page in Chrome or Edge at http://localhost:3000 (not an editor preview).",
      "In Windows: Settings → Privacy & security → Microphone → allow desktop apps and your browser.",
      "Plug in a headset if the laptop mic is disabled, then click Try again.",
    ].join(" ");
  }

  if (name === "NotAllowedError" || name === "PermissionDeniedError" || text.includes("permission")) {
    return "Microphone access was blocked. Click the padlock in the address bar, allow Microphone, then click Try again.";
  }

  if (name === "NotReadableError" || name === "AbortError" || text.includes("could not start audio")) {
    return "The microphone is in use by another app. Close Zoom, Teams, or other calls, then click Try again.";
  }

  if (name === "OverconstrainedError" || text.includes("overconstrained")) {
    return "This microphone does not support the voice settings the navigator requested. Click Try again — we will use simpler audio settings.";
  }

  if (name === "SecurityError") {
    return "The browser blocked the microphone on this page. Use http://localhost:3000 over a normal Chrome or Edge window.";
  }

  const message = err instanceof Error ? err.message.trim() : "";
  return message || "Could not start the microphone.";
}

type AudioContextCtor = typeof AudioContext;

let clickContext: AudioContext | null = null;
let clickKeepAlive: OscillatorNode | null = null;

function audioContextCtor(): AudioContextCtor {
  const w = window as Window & { webkitAudioContext?: AudioContextCtor };
  const Ctor = window.AudioContext || w.webkitAudioContext;
  if (!Ctor) throw new Error("This browser cannot start audio. Use the latest Chrome or Edge.");
  return Ctor;
}

/** Must run inside the Speak-with-a-navigator click so AudioContext is unlocked. */
export function unlockWebAudio() {
  if (typeof window === "undefined") return;
  try {
    const Ctor = audioContextCtor();
    if (!clickContext || clickContext.state === "closed") {
      clickContext = new Ctor();
    }
    const gain = clickContext.createGain();
    gain.gain.value = 0;
    const osc = clickContext.createOscillator();
    osc.connect(gain);
    gain.connect(clickContext.destination);
    osc.start();
    clickKeepAlive?.stop();
    clickKeepAlive = osc;
    void clickContext.resume();
  } catch {
    /* click unlock is best-effort */
  }
}

/** AEC must be on. Without it the mic hears TTS from the speakers and the SDK ducks output. */
const CAPTURE_AUDIO: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

function isPermissionProbe(constraints?: MediaStreamConstraints): boolean {
  if (!constraints) return true;
  if (constraints.video) return false;
  return constraints.audio === true || constraints.audio == null;
}

function wrapLiveStream(stream: MediaStream): MediaStream {
  const tracks = stream.getAudioTracks().map((track) => {
    track.enabled = true;
    const nativeStop = track.stop.bind(track);
    track.stop = () => {
      /* ElevenLabs stops its permission-probe stream. Keep the real capture alive. */
    };
    (track as MediaStreamTrack & { __guraStop?: () => void }).__guraStop = nativeStop;
    return track;
  });
  return new MediaStream(tracks);
}

function stopLiveStream(stream: MediaStream) {
  for (const track of stream.getTracks()) {
    const native = (track as MediaStreamTrack & { __guraStop?: () => void }).__guraStop;
    track.stop = native ?? track.stop.bind(track);
    track.stop();
  }
}

export type VoiceCapture = {
  getInputBins: () => Uint8Array;
  getInputLevel: () => number;
  /** Silence the capture tracks so speaker playback cannot barge-in as "user speech". */
  setCaptureEnabled: (enabled: boolean) => void;
  echoCancellationEnabled: boolean;
  dispose: () => void;
};

/**
 * Open the microphone once, then feed that same live capture to ElevenLabs.
 * The SDK otherwise opens getUserMedia twice (probe + worklet). On Windows the
 * second stream is often silent while speaker playback still works.
 */
export async function installVoiceCaptureBridge(): Promise<VoiceCapture> {
  if (typeof window === "undefined") {
    throw new Error("Microphone access needs a browser window.");
  }
  if (!window.isSecureContext) {
    throw new Error(
      "Microphone access needs a secure origin. Open http://localhost:3000 in Chrome or Edge.",
    );
  }
  const media = navigator.mediaDevices;
  if (!media?.getUserMedia) {
    throw new Error("This browser cannot access a microphone. Use the latest Chrome or Edge.");
  }

  const originalGum = media.getUserMedia.bind(media);
  const NativeWorklet = window.AudioWorkletNode;
  const NativeAudioContext = window.AudioContext;

  let live: MediaStream;
  try {
    live = await originalGum({ audio: CAPTURE_AUDIO, video: false });
  } catch (err) {
    try {
      live = await originalGum({ audio: true, video: false });
    } catch (inner) {
      throw new Error(microphoneErrorMessage(inner));
    }
  }
  const track = live.getAudioTracks()[0];
  if (track) {
    try {
      await track.applyConstraints(CAPTURE_AUDIO);
    } catch {
      /* keep the stream even if the device ignores a constraint */
    }
  }
  const echoCancellationEnabled = track?.getSettings().echoCancellation === true;

  const shared = wrapLiveStream(live);

  const monitorCtx =
    clickContext && clickContext.state !== "closed" ? clickContext : new (audioContextCtor())();
  void monitorCtx.resume();
  const monitorSource = monitorCtx.createMediaStreamSource(shared);
  const analyser = monitorCtx.createAnalyser();
  analyser.fftSize = 128;
  analyser.smoothingTimeConstant = 0.5;
  monitorSource.connect(analyser);
  const bins = new Uint8Array(analyser.frequencyBinCount);

  const dummyCtx =
    clickContext && clickContext.state !== "closed" ? clickContext : new (audioContextCtor())();
  const dummyDest = dummyCtx.createMediaStreamDestination();

  media.getUserMedia = async (constraints?: MediaStreamConstraints) => {
    if (isPermissionProbe(constraints)) {
      return dummyDest.stream;
    }
    return new MediaStream(shared.getAudioTracks());
  };

  window.AudioWorkletNode = function PatchedWorklet(
    this: AudioWorkletNode,
    context: BaseAudioContext,
    name: string,
    options?: AudioWorkletNodeOptions,
  ) {
    const node = new NativeWorklet(context, name, options);
    if (name === "rawAudioProcessor") {
      const silent = context.createGain();
      silent.gain.value = 0;
      node.connect(silent);
      silent.connect(context.destination);
    }
    return node;
  } as unknown as typeof AudioWorkletNode;
  window.AudioWorkletNode.prototype = NativeWorklet.prototype;

  if (NativeAudioContext) {
    const Wrapped = function WrappedAudioContext(
      this: AudioContext,
      options?: AudioContextOptions,
    ) {
      const ctx = new NativeAudioContext(options);
      void ctx.resume();
      return ctx;
    } as unknown as AudioContextCtor;
    Wrapped.prototype = NativeAudioContext.prototype;
    Object.setPrototypeOf(Wrapped, NativeAudioContext);
    window.AudioContext = Wrapped;
  }

  const origRamp = GainNode.prototype.exponentialRampToValueAtTime;
  GainNode.prototype.exponentialRampToValueAtTime = function (value, endTime) {
    // ElevenLabs barge-in fades TTS to ~0 over 2s. Self-echo must not duck the agent.
    if (value <= 0.001) return this;
    return origRamp.call(this, value, endTime);
  };

  return {
    echoCancellationEnabled,
    getInputBins() {
      analyser.getByteFrequencyData(bins);
      return bins;
    },
    getInputLevel() {
      analyser.getByteFrequencyData(bins);
      let sum = 0;
      for (let i = 0; i < bins.length; i++) sum += bins[i] ?? 0;
      return bins.length ? sum / (bins.length * 255) : 0;
    },
    setCaptureEnabled(enabled: boolean) {
      for (const t of live.getAudioTracks()) t.enabled = enabled;
    },
    dispose() {
      media.getUserMedia = originalGum;
      window.AudioWorkletNode = NativeWorklet;
      if (NativeAudioContext) window.AudioContext = NativeAudioContext;
      GainNode.prototype.exponentialRampToValueAtTime = origRamp;
      try {
        monitorSource.disconnect();
      } catch {
        /* already torn down */
      }
      stopLiveStream(live);
    },
  };
}

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

/**
 * Chrome/Edge local speech recognition. Used when the ElevenLabs worklet is
 * connected but sending silence — the agent still gets the user's words as text.
 */
export function startSpeechRelay(options: {
  shouldListen: () => boolean;
  onTranscript: (text: string) => void;
  /** Wait this long after the last finalized fragment before sending. */
  commitDelayMs?: number;
}): () => void {
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) return () => undefined;

  const rec = new Ctor();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = document.documentElement.lang || "en-US";
  let stopped = false;
  let running = false;
  let pending = "";
  let commitTimer: number | null = null;
  const commitDelayMs = options.commitDelayMs ?? 700;
  const fillerOnly = /^(um+|uh+|hmm+|hm+|ah+|er+|uh-huh|mm-hmm|like|you know)[.,!?]*$/i;

  const flush = () => {
    commitTimer = null;
    const text = pending.replace(/\s+/g, " ").trim();
    pending = "";
    if (!text || fillerOnly.test(text) || !options.shouldListen()) return;
    options.onTranscript(text);
  };

  const startIfNeeded = () => {
    if (stopped || running || !options.shouldListen()) return;
    try {
      rec.start();
      running = true;
    } catch {
      running = false;
    }
  };

  rec.onresult = (event) => {
    if (!options.shouldListen()) return;
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      // Partial hypotheses must never be sent — they cut the patient off.
      if (!result?.isFinal) continue;
      const text = result[0]?.transcript?.trim();
      if (!text) continue;
      pending = `${pending} ${text}`.trim();
      if (commitTimer != null) window.clearTimeout(commitTimer);
      commitTimer = window.setTimeout(flush, commitDelayMs);
    }
  };
  rec.onerror = (event) => {
    running = false;
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      stopped = true;
    }
  };
  rec.onend = () => {
    running = false;
    if (!stopped) window.setTimeout(startIfNeeded, 120);
  };

  startIfNeeded();
  const tick = window.setInterval(startIfNeeded, 1500);

  return () => {
    stopped = true;
    window.clearInterval(tick);
    if (commitTimer != null) window.clearTimeout(commitTimer);
    rec.onresult = null;
    rec.onend = null;
    rec.onerror = null;
    try {
      rec.stop();
    } catch {
      /* already stopped */
    }
  };
}
