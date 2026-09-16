/**
 * Prints why recent navigator calls ended: termination reason, turn count, and
 * which tools the agent invoked. Use this to tell "agent hung up" apart from
 * "websocket dropped" or "silence timeout".
 *
 * Usage: node scripts/diagnose-voice-call.mjs [count]
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(root, ".env"), "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const apiKey = env.ELEVENLABS_API_KEY;
const agentId = env.ELEVENLABS_AGENT_ID;
if (!apiKey || !agentId) {
  console.error("Missing ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID in .env");
  process.exit(1);
}

const count = Number(process.argv[2] ?? 3);

async function eleven(pathname) {
  const res = await fetch(`https://api.elevenlabs.io${pathname}`, {
    headers: { "xi-api-key": apiKey },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    console.error("GET", pathname, res.status, JSON.stringify(body).slice(0, 400));
    process.exit(1);
  }
  return body;
}

const list = await eleven(`/v1/convai/conversations?agent_id=${agentId}&page_size=${count}`);
const conversations = list.conversations ?? [];
if (conversations.length === 0) {
  console.log("No conversations recorded for this agent yet.");
  process.exit(0);
}

for (const summary of conversations) {
  const id = summary.conversation_id;
  const detail = await eleven(`/v1/convai/conversations/${id}`);
  const meta = detail.metadata ?? {};
  const transcript = detail.transcript ?? [];

  const toolCalls = [];
  for (const turn of transcript) {
    for (const call of turn.tool_calls ?? []) {
      toolCalls.push(call.tool_name ?? call.name ?? "unknown");
    }
  }

  console.log("\n=".repeat(30));
  console.log("conversation:", id);
  console.log("status:", detail.status ?? summary.status);
  console.log("duration_secs:", meta.call_duration_secs);
  console.log("termination_reason:", meta.termination_reason || "(none recorded)");
  console.log("turns:", transcript.length);
  console.log("tools_called:", toolCalls.length ? toolCalls.join(", ") : "(none)");

  for (const turn of transcript) {
    const who = turn.role === "agent" ? "AGENT" : "USER ";
    const said = (turn.message ?? "").replace(/\s+/g, " ").trim();
    const tools = (turn.tool_calls ?? []).map((c) => c.tool_name ?? c.name).filter(Boolean);
    console.log(` ${who} ${said || "(no text)"}${tools.length ? `   [tools: ${tools.join(", ")}]` : ""}`);
  }
}
