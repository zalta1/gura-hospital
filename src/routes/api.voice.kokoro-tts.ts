import { createFileRoute } from "@tanstack/react-router";
import { authorizeOutboundApiRequest } from "@/lib/api-auth";

/**
 * Kokoro TTS Proxy Route
 * Synthesizes audio using a local Kokoro instance or external open Kokoro inference service.
 * Defaults to JSON metadata response or streaming WAV/MP3 if an external engine is attached.
 */
async function kokoroTtsPost({ request }: { request: Request }) {
  const auth = authorizeOutboundApiRequest(request);
  if (!auth.authorized) {
    return Response.json({ ok: false, error: auth.reason || "Unauthorized" }, { status: 401 });
  }

  try {
    const json = (await request.json().catch(() => ({}))) as {
      text?: string;
      voice?: string;
      speed?: number;
    };

    const text = json.text?.trim();
    if (!text) {
      return Response.json({ error: "Text is required for TTS synthesis." }, { status: 400 });
    }

    const kokoroEndpoint = process.env.KOKORO_API_URL || "http://127.0.0.1:8880/v1/audio/speech";

    try {
      const externalRes = await fetch(kokoroEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "kokoro",
          input: text,
          voice: json.voice || "af_heart",
          response_format: "mp3",
          speed: json.speed || 1.0,
        }),
      });

      if (externalRes.ok) {
        const audioData = await externalRes.arrayBuffer();
        return new Response(audioData, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "public, max-age=3600",
          },
        });
      }
    } catch {
      // Local or external Kokoro server is optional; client gracefully falls back to browser synthesis
    }

    // Return status indicator so client knows to use client-side natural synthesis fallback
    return Response.json({
      status: "fallback_to_client",
      voice: json.voice || "af_heart",
      message: "Kokoro backend server offline; client-side synthesized voice activated.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "TTS error.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/voice/kokoro-tts" as any)({
  server: {
    handlers: {
      POST: kokoroTtsPost,
    },
  },
});

