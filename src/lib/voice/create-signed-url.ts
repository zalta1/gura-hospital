/**
 * Server-only helper. Never import this from client components — it reads
 * ELEVENLABS_API_KEY from process.env.
 */
export async function createElevenLabsSignedUrl(): Promise<{ signed_url: string; agent_id: string }> {
  const apiKey = process.env["ELEVENLABS_API_KEY"]?.trim();
  const agentId = process.env["ELEVENLABS_AGENT_ID"]?.trim();

  if (!apiKey || !agentId) {
    throw new SignedUrlError(
      "Voice navigator is not configured. Set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID in .env.",
      503,
    );
  }

  const url = new URL("https://api.elevenlabs.io/v1/convai/conversation/get-signed-url");
  url.searchParams.set("agent_id", agentId);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "xi-api-key": apiKey },
    });
  } catch {
    throw new SignedUrlError("Could not reach ElevenLabs.", 502);
  }

  if (!res.ok) {
    throw new SignedUrlError("ElevenLabs signed URL failed. Check agent ID and API key.", 502);
  }

  const payload = (await res.json()) as { signed_url?: string; signedUrl?: string };
  const signed = payload.signed_url ?? payload.signedUrl;
  if (!signed) {
    throw new SignedUrlError("ElevenLabs did not return a signed_url.", 502);
  }

  return { signed_url: signed, agent_id: agentId };
}

export class SignedUrlError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "SignedUrlError";
    this.status = status;
  }
}
