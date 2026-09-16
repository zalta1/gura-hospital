/**
 * Reads ELEVENLABS_* from .env and patches the Conversational AI agent:
 * turn-taking, VAD-adjacent timeouts, low-latency TTS, spoken prompt, tools.
 *
 * Usage: node scripts/sync-voice-agent.mjs
 *
 * Keep SPOKEN_PROMPT in sync with src/lib/voice/session-config.ts.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const envPath = path.join(root, ".env");
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      return [
        line.slice(0, i).trim(),
        line.slice(i + 1).trim().replace(/^["']|["']$/g, ""),
      ];
    }),
);

const apiKey = env.ELEVENLABS_API_KEY;
const agentId = env.ELEVENLABS_AGENT_ID;
if (!apiKey || !agentId) {
  console.error("Missing ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID in .env");
  process.exit(1);
}

const SPOKEN_PROMPT = `You are the front desk intake assistant at Gura Hospital, on a live phone call with a patient. Your job is to take their information the way an experienced front desk nurse would, so a navigator can book the right visit. You do not diagnose, prescribe, or give treatment advice.

Who you are
- You work the front desk. You are warm, unhurried, and completely unflustered by symptoms.
- You have a triage nurse's instincts: when someone describes a symptom, you naturally want to know how long, how bad, and whether it is getting worse — because the doctor will ask.
- You are an assistant, not a clinician. If they ask whether you are a nurse or a person, say plainly that you are the hospital's intake assistant and a nurse or navigator reviews everything. Never claim to be a nurse, doctor, or human.

How to speak
- Short spoken sentences. One or two questions at a time. Two to four sentences per turn.
- Acknowledge before you ask. "Oh, headaches are rough. How long has this been going on?"
- Use their name once you have it. It makes the call feel like a front desk, not a form.
- Never read a list aloud. No markdown, no bullets, no "question one of nine".
- Contractions and plain words. Avoid "As an AI", "I am programmed", "certainly", "absolutely", "great question".
- If they pause or say "um" / "uh", wait. Do not jump in until they have clearly finished.
- If they give you two things at once ("I'm Brian and I have a headache"), take both and do not re-ask.

Intake is not done after one answer
This is a multi-turn intake, not a one-exchange call. After they say what is bringing them in, respond with brief empathy and keep going. Never wrap up, never say the request is received, and never call book_appointment until the checklist is complete.

Silence and turn-taking
A short pause means they may still be thinking or finishing their sentence. It does not mean the visit request is done, and it does not mean the call should end. If they go quiet after a question, wait, then check in gently: "Take your time — are you still there?" If they are mid-answer, stay silent (skip_turn). Never treat silence as permission to submit or hang up.

What you need before a navigator can book
Call record_intake_fields whenever you learn something. Its missing and ask_next fields are your source of truth — trust them over your own sense that the call feels finished. Ask only what is still missing, one or two questions at a time. Some answers may already be in the session variables; confirm those briefly instead of re-asking.

1. reason — what is bringing them in, in their own words.
2. clinical_followup — if it is anything beyond routine or preventive care (pain, injury, worsening symptoms, anything a doctor would want context on), ask a few natural follow-ups: how long, how severe, whether it is getting worse, and anything else useful before the visit. Ask like a nurse, not a form. For a clearly routine visit (annual physical, wellness, screening), set clinical_followup to "not_needed".
3. specialty — which specialty they want, or help them land on the right one from their symptoms. Use match_doctor if they are unsure, and explain your suggestion in one sentence.
4. insurance — ask whether they have insurance and the plan name if they do. Then call check_insurance and tell them what it came back with. Self-pay is fine. Never guess whether a plan is accepted.
5. visit_preference — in person at Fairmont Ridge, in person at Alder Bay, or telehealth.
6. full_name, date_of_birth, email, and phone number. Read email and phone back to confirm.

Finishing the call
- book_appointment is blocked until every field above is collected. If it comes back with missing fields, ask those next. Do not apologize and hang up.
- You have no way to end this call, and you should not try. After book_appointment succeeds, confirm the request is in for navigator review, ask if there is anything else, and wait. The patient hangs up when they are ready.
- Never say the request was submitted unless book_appointment actually returned success.

Safety — this overrides everything above
Chest pain, trouble breathing, stroke signs, severe bleeding, or "I think this is an emergency" → tell them to hang up and call 911 right now, then call flag_emergency. Stop the intake questions. The emergency department is open 24 hours at 1400 Harborline Avenue.

Tools
record_intake_fields after answers, check_insurance for plans, match_doctor for specialty help, check_availability for times, book_appointment only when the checklist is complete, flag_emergency for emergencies. After a tool, say the result in one or two plain sentences. Booking is a request, not a confirmed slot.

If you are unsure, say a navigator will follow up. Never invent doctors, hours, or insurance coverage.`;

const FIRST_MESSAGE =
  "Thanks for calling Gura Hospital, you've reached the front desk. What's bringing you in today?";

async function eleven(pathname, init) {
  const res = await fetch(`https://api.elevenlabs.io${pathname}`, {
    ...init,
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { ok: res.ok, status: res.status, body };
}

const current = await eleven(`/v1/convai/agents/${agentId}`);
if (!current.ok) {
  console.error("GET agent failed", current.status, JSON.stringify(current.body).slice(0, 500));
  process.exit(1);
}

const cfg = current.body?.conversation_config ?? {};
const tts = cfg.tts ?? {};
const asr = cfg.asr ?? {};
const turn = cfg.turn ?? {};
const promptCfg = cfg.agent?.prompt ?? {};

function summarize(label, obj) {
  console.log(`\n${label}`);
  console.log(
    JSON.stringify(
      {
        llm: promptCfg.llm,
        max_tokens: promptCfg.max_tokens,
        temperature: promptCfg.temperature,
        reasoning_effort: promptCfg.reasoning_effort,
        tts_model: tts.model_id,
        tts_stability: tts.stability,
        tts_similarity: tts.similarity_boost,
        tts_speed: tts.speed,
        optimize_streaming_latency: tts.optimize_streaming_latency,
        asr_quality: asr.quality,
        asr_provider: asr.provider,
        turn_eagerness: turn.turn_eagerness,
        turn_timeout: turn.turn_timeout,
        speculative_turn: turn.speculative_turn,
        turn_model: turn.turn_model,
        silence_end_call_timeout: turn.silence_end_call_timeout,
        vad: cfg.vad ?? null,
        built_in_end_call: promptCfg.built_in_tools?.end_call ?? null,
        prompt_chars: String(promptCfg.prompt ?? "").length,
      },
      null,
      2,
    ),
  );
}

summarize("BEFORE", cfg);

const { knowledge_base, mcp_server_ids, native_mcp_server_ids, rag, timezone, backup_llm_config } =
  promptCfg;

const CLIENT_TOOLS = [
  {
    name: "record_intake_fields",
    description:
      "Save one or more visit-intake fields and return collected vs still missing. Call after every patient answer. Do not end the call. If missing is not empty, ask those next (one or two questions).",
    parameters: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Chief complaint in the patient's words" },
        clinical_followup: {
          type: "string",
          description: 'Symptom details, or "not_needed" for routine/preventive care',
        },
        specialty: { type: "string", description: "Preferred specialty" },
        insurance: { type: "string", description: "Plan name, self-pay, or none" },
        visit_preference: {
          type: "string",
          description: "in-person Fairmont Ridge, in-person Alder Bay, or telehealth",
        },
        full_name: { type: "string", description: "Patient full name" },
        date_of_birth: { type: "string", description: "Date of birth" },
        email: { type: "string", description: "Email" },
        phone: { type: "string", description: "Phone" },
      },
    },
  },
  {
    name: "check_insurance",
    description:
      "Match a plan name against Gura Hospital's published accepted-insurance list and say whether it appears there. Demo list only — not live eligibility.",
    parameters: {
      type: "object",
      properties: {
        plan: { type: "string", description: "Plan or payer name, or none / self-pay" },
      },
      required: ["plan"],
    },
  },
  {
    name: "match_doctor",
    description: "Find up to three Gura Hospital doctors for a symptom or specialty. Call before recommending a name.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Symptom or specialty, e.g. knee pain or cardiology" },
      },
      required: ["query"],
    },
  },
  {
    name: "check_availability",
    description: "List requestable weekday clinic times for a doctor. Does not hold a slot.",
    parameters: {
      type: "object",
      properties: {
        doctor_id: { type: "string", description: "Doctor slug such as nikolai-brandt" },
        start_date: { type: "string", description: "YYYY-MM-DD" },
        end_date: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["doctor_id", "start_date"],
    },
  },
  {
    name: "book_appointment",
    description:
      "Submit an appointment request only after the intake checklist is complete (reason, clinical follow-up or not_needed, specialty, insurance, visit preference, full name, date of birth, email, phone). If fields are missing the tool returns them — keep asking. Not a confirmed calendar hold.",
    parameters: {
      type: "object",
      properties: {
        full_name: { type: "string", description: "Patient full name" },
        email: { type: "string", description: "Patient email" },
        phone: { type: "string", description: "Patient phone" },
        doctor_id: { type: "string", description: "Doctor slug such as nikolai-brandt" },
        slot: { type: "string", description: "Requested time, ISO-like if known" },
        reason: { type: "string", description: "Reason for visit" },
        clinical_followup: { type: "string", description: "Symptom details or not_needed" },
        insurance: { type: "string", description: "Insurance plan name if given" },
        date_of_birth: { type: "string", description: "Date of birth" },
        preferred_specialty: { type: "string", description: "Preferred specialty" },
        visit_preference: { type: "string", description: "in-person Fairmont Ridge, Alder Bay, or telehealth" },
      },
    },
  },
  {
    name: "flag_emergency",
    description: "Flag a possible emergency for staff. Tell the caller to hang up and call 911 first.",
    parameters: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Why this may be an emergency" },
      },
      required: ["reason"],
    },
  },
];

const listed = await eleven("/v1/convai/tools");
const existing = Array.isArray(listed.body?.tools) ? listed.body.tools : [];
const byName = new Map(
  existing.map((t) => [t.tool_config?.name || t.name, t.id || t.tool_id]),
);

const toolIds = [];
for (const tool of CLIENT_TOOLS) {
  const tool_config = {
    type: "client",
    name: tool.name,
    description: tool.description,
    expects_response: true,
    parameters: tool.parameters,
  };
  let id = byName.get(tool.name);
  if (!id) {
    const created = await eleven("/v1/convai/tools", {
      method: "POST",
      body: JSON.stringify({ tool_config }),
    });
    if (!created.ok) {
      console.error("Create tool failed", tool.name, created.status, JSON.stringify(created.body).slice(0, 800));
      process.exit(1);
    }
    id = created.body?.id || created.body?.tool_id;
    console.log("Created tool", tool.name, id);
  } else {
    const updated = await eleven(`/v1/convai/tools/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ tool_config }),
    });
    if (!updated.ok) {
      console.error("Update tool failed", tool.name, updated.status, JSON.stringify(updated.body).slice(0, 800));
      process.exit(1);
    }
    console.log("Updated tool", tool.name, id);
  }
  if (id) toolIds.push(id);
}

const existingBuiltIn =
  promptCfg.built_in_tools && typeof promptCfg.built_in_tools === "object" ? promptCfg.built_in_tools : {};

const patch = {
  conversation_config: {
    asr: {
      quality: "high",
      provider: asr.provider || "scribe_realtime",
      keywords: [
        ...new Set([
          ...(Array.isArray(asr.keywords) ? asr.keywords : []),
          "Gura",
          "Fairmont Ridge",
          "Alder Bay",
          "Harborline",
        ]),
      ],
    },
    turn: {
      turn_eagerness: "normal",
      turn_timeout: 7,
      speculative_turn: false,
      turn_model: "turn_v3",
      silence_end_call_timeout: -1,
      spelling_patience: "auto",
      interruption_ignore_terms: ["um", "uh", "hmm", "hm", "ah", "er", "like", "you know"],
      merge_with_default_ignore_terms: true,
      interruption_ignore_term_languages: ["en"],
    },
    conversation: {
      max_duration_seconds: 1200,
    },
    tts: {
      ...(tts.voice_id ? { voice_id: tts.voice_id } : {}),
      model_id: "eleven_flash_v2",
      optimize_streaming_latency: 3,
      stability: 0.55,
      similarity_boost: 0.8,
      speed: 0.96,
    },
    agent: {
      first_message: FIRST_MESSAGE,
      disable_first_message_interruptions: true,
      prompt: {
        prompt: SPOKEN_PROMPT,
        llm: "gemini-2.0-flash",
        temperature: 0.55,
        max_tokens: 400,
        enable_reasoning_summary: false,
        tool_ids: toolIds,
        built_in_tools: {
          ...existingBuiltIn,
          end_call: null,
          skip_turn: {
            type: "system",
            name: "skip_turn",
            description:
              "Wait silently when the patient is still thinking or mid-answer. Never end the call. Never skip remaining intake questions.",
            params: { system_tool_type: "skip_turn" },
          },
        },
        ...(Array.isArray(knowledge_base) && knowledge_base.length ? { knowledge_base } : {}),
        ...(mcp_server_ids ? { mcp_server_ids } : {}),
        ...(native_mcp_server_ids ? { native_mcp_server_ids } : {}),
        ...(rag ? { rag } : {}),
        ...(timezone ? { timezone } : {}),
        ...(backup_llm_config ? { backup_llm_config } : {}),
      },
    },
  },
};

if (cfg.vad && typeof cfg.vad === "object") {
  patch.conversation_config.vad = {
    ...cfg.vad,
    ...(typeof cfg.vad.silence_threshold_secs === "number"
      ? { silence_threshold_secs: Math.max(cfg.vad.silence_threshold_secs, 1.4) }
      : {}),
    ...(typeof cfg.vad.min_silence_duration_ms === "number"
      ? { min_silence_duration_ms: Math.max(cfg.vad.min_silence_duration_ms, 1200) }
      : {}),
    ...(typeof cfg.vad.end_of_speech_timeout_secs === "number"
      ? { end_of_speech_timeout_secs: Math.max(cfg.vad.end_of_speech_timeout_secs, 1.4) }
      : {}),
  };
}

const updated = await eleven(`/v1/convai/agents/${agentId}`, {
  method: "PATCH",
  body: JSON.stringify(patch),
});

if (!updated.ok) {
  console.error("PATCH agent failed", updated.status, JSON.stringify(updated.body).slice(0, 1500));
  process.exit(1);
}

const after = updated.body?.conversation_config ?? {};
const afterTts = after.tts ?? {};
const afterTurn = after.turn ?? {};
const afterPrompt = after.agent?.prompt ?? {};
console.log("\nAFTER");
console.log(
  JSON.stringify(
    {
      llm: afterPrompt.llm,
      max_tokens: afterPrompt.max_tokens,
      temperature: afterPrompt.temperature,
      tts_model: afterTts.model_id,
      tts_stability: afterTts.stability,
      tts_similarity: afterTts.similarity_boost,
      tts_speed: afterTts.speed,
      optimize_streaming_latency: afterTts.optimize_streaming_latency,
      turn_eagerness: afterTurn.turn_eagerness,
      turn_timeout: afterTurn.turn_timeout,
      speculative_turn: afterTurn.speculative_turn,
      silence_end_call_timeout: afterTurn.silence_end_call_timeout,
      max_duration_seconds: after.conversation?.max_duration_seconds,
      built_in_end_call: afterPrompt.built_in_tools?.end_call ?? null,
      skip_turn: Boolean(afterPrompt.built_in_tools?.skip_turn),
      tool_ids: afterPrompt.tool_ids?.length ?? 0,
      vad: after.vad ?? null,
      prompt_chars: String(afterPrompt.prompt ?? "").length,
      first_message: after.agent?.first_message,
    },
    null,
    2,
  ),
);
console.log("\nPatched agent", agentId);
console.log("Attached tools", toolIds.length);
