import { createFileRoute } from "@tanstack/react-router";
import { authorizeOutboundApiRequest } from "@/lib/api-auth";
import { createElevenLabsSignedUrl, SignedUrlError } from "@/lib/voice/create-signed-url";

async function signedUrlGet({ request }: { request: Request }) {
  const auth = authorizeOutboundApiRequest(request);
  if (!auth.authorized) {
    return Response.json({ error: auth.reason || "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await createElevenLabsSignedUrl();
    return Response.json(body);
  } catch (err) {
    const status = err instanceof SignedUrlError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Could not create a signed URL.";
    return Response.json({ error: message }, { status });
  }
}

export const Route = createFileRoute("/api/elevenlabs/signed-url")({
  server: {
    handlers: {
      GET: signedUrlGet,
    },
  },
});
