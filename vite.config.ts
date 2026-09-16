import path from "node:path";
import type { IncomingMessage } from "node:http";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import viteTsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";
import { createElevenLabsSignedUrl, SignedUrlError } from "./src/lib/voice/create-signed-url";
import { sendTwilioSms, TwilioSmsError } from "./src/lib/sms/twilio";
import { placeTwilioColdCall, TwilioVoiceError } from "./src/lib/twilio/cold-call";
import {
  getReminderJob,
  getReminderJobByReminderId,
  processDueReminderJobs,
  scheduleReminderJob,
} from "./src/lib/twilio/reminder-jobs";
import type { ReminderOutboundChannel } from "./src/lib/twilio/reminder-job-types";
import { sendNotificationEmail } from "./src/lib/mail";
import type { SendGmailNotificationInput } from "./src/lib/notifications/gmail-types";

function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function elevenLabsSignedUrlDevPlugin(): Plugin {
  return {
    name: "elevenlabs-signed-url",
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split("?")[0];
        if (pathname !== "/api/elevenlabs/signed-url") {
          next();
          return;
        }
        if (req.method !== "GET" && req.method !== "HEAD") {
          res.statusCode = 405;
          res.end("Method Not Allowed");
          return;
        }
        void createElevenLabsSignedUrl().then(
          (body) => {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(body));
          },
          (err: unknown) => {
            const status = err instanceof SignedUrlError ? err.status : 500;
            const message = err instanceof Error ? err.message : "Could not create a signed URL.";
            res.statusCode = status;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: message }));
          },
        );
      });
    },
  };
}

function twilioSendSmsDevPlugin(): Plugin {
  return {
    name: "twilio-send-sms",
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split("?")[0];
        if (pathname !== "/api/twilio/send-sms") {
          next();
          return;
        }
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method Not Allowed");
          return;
        }
        void (async () => {
          try {
            const raw = await readRequestBody(req);
            const json = (raw ? JSON.parse(raw) : {}) as {
              body?: string;
              reminderId?: string;
              patientId?: string;
            };
            const result = await sendTwilioSms({
              ...(json.body ? { body: json.body } : {}),
            });
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                ok: true,
                sid: result.sid,
                status: result.status,
                to: result.to,
                from: result.from,
                body: result.body,
                reminderId: json.reminderId ?? null,
                patientId: json.patientId ?? null,
              }),
            );
          } catch (err: unknown) {
            const status = err instanceof TwilioSmsError ? err.status : 500;
            const message = err instanceof Error ? err.message : "Could not send SMS.";
            res.statusCode = status;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: false, error: message }));
          }
        })();
      });
    },
  };
}

function twilioColdCallDevPlugin(): Plugin {
  return {
    name: "twilio-cold-call",
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split("?")[0];
        if (pathname !== "/api/twilio/cold-call") {
          next();
          return;
        }
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method Not Allowed");
          return;
        }
        void (async () => {
          try {
            const raw = await readRequestBody(req);
            const json = (raw ? JSON.parse(raw) : {}) as {
              sayText?: string;
              reminderId?: string;
              patientId?: string;
              drugName?: string;
              dose?: string;
              schedule?: string;
            };
            let sayText = json.sayText?.trim();
            if (!sayText && (json.drugName || json.dose || json.schedule)) {
              const parts = [
                "Hello, this is Gura Hospital with a medication reminder.",
                json.drugName ? `Please take ${json.drugName}` : "Please take your prescribed medicine",
                json.dose ? `at a dose of ${json.dose}` : null,
                json.schedule ? `on this schedule: ${json.schedule}` : null,
                "as directed by your doctor. Goodbye.",
              ].filter(Boolean);
              sayText = parts.join(" ");
            }
            const result = await placeTwilioColdCall({
              ...(sayText ? { sayText } : {}),
            });
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                ok: true,
                sid: result.sid,
                status: result.status,
                to: result.to,
                from: result.from,
                sayText: result.instruction,
                instruction: result.instruction,
                reminderId: json.reminderId ?? null,
                patientId: json.patientId ?? null,
              }),
            );
          } catch (err: unknown) {
            const status = err instanceof TwilioVoiceError ? err.status : 500;
            const message = err instanceof Error ? err.message : "Could not place cold call.";
            res.statusCode = status;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: false, error: message }));
          }
        })();
      });
    },
  };
}

function twilioReminderSchedulerDevPlugin(): Plugin {
  return {
    name: "twilio-reminder-scheduler",
    configureServer(server: ViteDevServer) {
      const timer = setInterval(() => {
        void processDueReminderJobs().catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          server.config.logger.error(`[twilio-reminder-scheduler] ${message}`);
        });
      }, 10_000);
      timer.unref?.();

      server.httpServer?.once("close", () => clearInterval(timer));

      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split("?")[0];

        if (pathname === "/api/twilio/schedule-reminder") {
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end("Method Not Allowed");
            return;
          }
          void (async () => {
            try {
              const raw = await readRequestBody(req);
              const json = (raw ? JSON.parse(raw) : {}) as {
                reminderId?: string;
                patientId?: string;
                medicationPlanId?: string | null;
                channel?: ReminderOutboundChannel;
                scheduledTime?: string;
                drugName?: string;
                dose?: string;
                schedule?: string;
              };
              if (!json.reminderId || !json.patientId || !json.channel || !json.scheduledTime) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    ok: false,
                    error: "reminderId, patientId, channel, and scheduledTime are required.",
                  }),
                );
                return;
              }
              if (json.channel !== "sms" && json.channel !== "cold_call") {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ ok: false, error: "channel must be sms or cold_call." }));
                return;
              }
              const job = await scheduleReminderJob({
                reminderId: json.reminderId,
                patientId: json.patientId,
                medicationPlanId: json.medicationPlanId ?? null,
                channel: json.channel,
                scheduledTime: json.scheduledTime,
                ...(json.drugName ? { drugName: json.drugName } : {}),
                ...(json.dose ? { dose: json.dose } : {}),
                ...(json.schedule ? { schedule: json.schedule } : {}),
              });
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ ok: true, job }));
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : "Could not schedule reminder.";
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ ok: false, error: message }));
            }
          })();
          return;
        }

        if (pathname === "/api/twilio/reminder-job") {
          if (req.method !== "GET" && req.method !== "HEAD") {
            res.statusCode = 405;
            res.end("Method Not Allowed");
            return;
          }
          const url = new URL(req.url ?? "/", "http://localhost");
          const jobId = url.searchParams.get("jobId");
          const reminderId = url.searchParams.get("reminderId");
          const job = jobId
            ? getReminderJob(jobId)
            : reminderId
              ? getReminderJobByReminderId(reminderId)
              : null;
          if (!job) {
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: false, error: "Job not found." }));
            return;
          }
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: true, job }));
          return;
        }

        next();
      });
    },
  };
}

function gmailNotificationDevPlugin(): Plugin {
  return {
    name: "gmail-notification",
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split("?")[0];
        if (pathname !== "/api/notifications/send-gmail") {
          next();
          return;
        }
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method Not Allowed");
          return;
        }
        void (async () => {
          try {
            const raw = await readRequestBody(req);
            const json = (raw ? JSON.parse(raw) : {}) as SendGmailNotificationInput;
            const { type, to, bookingId, ...data } = json;
            const result = await sendNotificationEmail(type, to, data, { bookingId });
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(result));
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Could not send email.";
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: false, status: "failed", error_message: message }));
          }
        })();
      });
    },
  };
}

export default defineConfig({
  resolve: {
    alias: {
      "@/components/site": path.resolve(__dirname, "src/components/sites"),
    },
  },
  server: {
    port: 3000,
    // Windows resolves localhost to 127.0.0.1 first; default Vite bind was IPv6-only (::1).
    host: true,
    strictPort: true,
    proxy: {
      "/api": {
        target: process.env["VITE_API_PROXY"] ?? "http://127.0.0.1:8000",
        changeOrigin: true,
        bypass(req) {
          const pathname = req.url?.split("?")[0] ?? "";
          if (
            pathname.startsWith("/api/elevenlabs") ||
            pathname.startsWith("/api/twilio") ||
            pathname.startsWith("/api/notifications")
          ) {
            return req.url;
          }
          return undefined;
        },
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/ws": {
        target: process.env["VITE_API_PROXY"] ?? "http://127.0.0.1:8000",
        ws: true,
        changeOrigin: true,
      },
    },
  },
  plugins: [
    elevenLabsSignedUrlDevPlugin(),
    twilioSendSmsDevPlugin(),
    twilioColdCallDevPlugin(),
    twilioReminderSchedulerDevPlugin(),
    gmailNotificationDevPlugin(),
    viteTsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart(),
    nitro(),
    viteReact(),
    tailwindcss(),
  ],
});
