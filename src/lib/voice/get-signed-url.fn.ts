import { createServerFn } from "@tanstack/react-start";
import { createElevenLabsSignedUrl } from "./create-signed-url";

/** Fallback if GET /api/elevenlabs/signed-url is not reachable (CSRF-safe Start RPC). */
export const getElevenLabsSignedUrl = createServerFn({ method: "GET" }).handler(async () => {
  return createElevenLabsSignedUrl();
});
