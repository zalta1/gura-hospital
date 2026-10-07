import { useNavigate } from "@tanstack/react-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { formatHospitalDateTime } from "@/lib/portal/availability";
import { LOCAL_BOOKING_EVENT, cancelSharedAppointment, rescheduleSharedAppointment } from "@/lib/portal/local-store";
import { DOCTOR_REPLIES, SUPPORT_REPLIES } from "@/lib/patient-portal/demoPatientMorgan";
import {
  buildSnapshot,
  loadSharedAppointments,
  unreadNotifications,
} from "@/lib/patient-portal/data";
import { translate } from "@/lib/patient-portal/i18n";
import {
  clearDemoState,
  clearPatientSession,
  defaultDemoState,
  readDemoState,
  readPatientSession,
  writeDemoState,
} from "@/lib/patient-portal/session";
import {
  MORGAN_PATIENT_ID,
  type ApptStatus,
  type DemoState,
  type FollowUpAnswers,
  type PortalAppointment,
  type PortalSnapshot,
} from "@/lib/patient-portal/types";

type Status = "loading" | "ready" | "error";

type PortalContextValue = {
  status: Status;
  error: string | null;
  retry: () => void;
  snapshot: PortalSnapshot | null;
  state: DemoState;
  largeText: boolean;
  setLargeText: (value: boolean) => void;
  language: "en" | "es";
  setLanguage: (value: "en" | "es") => void;
  t: (key: string) => string;
  typingDoctorId: string | null;
  sendMessage: (doctorId: string, body: string, attachmentName?: string) => void;
  markThreadRead: (doctorId: string) => void;
  markDoseTaken: (medicationId: string, key: string, taken: boolean) => void;
  requestRefill: (medicationId: string) => void;
  submitFollowUp: (checkInId: string, answers: FollowUpAnswers) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  cancelAppointment: (id: string) => void;
  rescheduleAppointment: (id: string, datetime: string) => Promise<void>;
  payStatement: (id: string) => void;
  requestCorrection: (note: string) => void;
  sendSupport: (body: string) => void;
  resetDemo: () => void;
  signOut: () => void;
  unreadNotificationCount: number;
};

const PortalContext = createContext<PortalContextValue | null>(null);

export function PatientPortalProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [state, setState] = useState<DemoState>(defaultDemoState);
  const [shared, setShared] = useState<PortalAppointment[]>([]);
  const [typingDoctorId, setTypingDoctorId] = useState<string | null>(null);
  const replyTimer = useRef<number | null>(null);
  const supportTimer = useRef<number | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const session = readPatientSession();
    if (!session || session.patientId !== MORGAN_PATIENT_ID) {
      setStatus("error");
      setError("This demo session is not linked to a chart.");
      return;
    }
    setPatientId(session.patientId);
    setState(readDemoState());
    hydrated.current = true;
    const started = Date.now();
    void loadSharedAppointments(session.patientId).then((rows) => {
      if (cancelled) return;
      setShared(rows);
      const wait = Math.max(0, 400 - (Date.now() - started));
      window.setTimeout(() => {
        if (!cancelled) setStatus("ready");
      }, wait);
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    if (!hydrated.current || status === "loading") return;
    writeDemoState(state);
  }, [state, status]);

  useEffect(() => {
    return () => {
      if (replyTimer.current) window.clearTimeout(replyTimer.current);
      if (supportTimer.current) window.clearTimeout(supportTimer.current);
    };
  }, []);

  useEffect(() => {
    if (status !== "ready" || !patientId) return;
    const refresh = () => {
      void loadSharedAppointments(patientId).then(setShared);
    };
    window.addEventListener("focus", refresh);
    window.addEventListener(LOCAL_BOOKING_EVENT, refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener(LOCAL_BOOKING_EVENT, refresh);
    };
  }, [patientId, status]);

  const snapshot = useMemo(
    () => (patientId ? buildSnapshot(patientId, state, shared) : null),
    [patientId, state, shared],
  );

  const update = useCallback((recipe: (current: DemoState) => DemoState) => {
    setState((current) => recipe(current));
  }, []);

  const sendMessage = useCallback(
    (doctorId: string, body: string, attachmentName?: string) => {
      const text = body.trim();
      if (!text && !attachmentName) return;
      const now = new Date().toISOString();
      const message = {
        id: `local-msg-${crypto.randomUUID()}`,
        patientId: MORGAN_PATIENT_ID,
        doctorId,
        from: "patient" as const,
        body: text || "Attachment",
        at: now,
        read: true,
        ...(attachmentName ? { attachmentName } : {}),
      };
      update((current) => ({ ...current, extraMessages: [...current.extraMessages, message] }));
      setTypingDoctorId(doctorId);
      if (replyTimer.current) window.clearTimeout(replyTimer.current);
      replyTimer.current = window.setTimeout(() => {
        const replyIndex = Math.floor(Math.random() * DOCTOR_REPLIES.length);
        const reply = {
          id: `local-reply-${crypto.randomUUID()}`,
          patientId: MORGAN_PATIENT_ID,
          doctorId,
          from: "doctor" as const,
          body: DOCTOR_REPLIES[replyIndex] ?? DOCTOR_REPLIES[0] ?? "Thank you, Morgan. I have your note.",
          at: new Date().toISOString(),
          read: false,
        };
        const notice = {
          id: `local-nt-${crypto.randomUUID()}`,
          patientId: MORGAN_PATIENT_ID,
          type: "message" as const,
          title: "New message from your doctor",
          body: "A reply is waiting in Messages.",
          at: new Date().toISOString(),
          href: "/patient/messages",
        };
        update((current) => ({
          ...current,
          extraMessages: [...current.extraMessages, reply],
          extraNotifications: [notice, ...current.extraNotifications],
        }));
        setTypingDoctorId(null);
      }, 1400);
    },
    [update],
  );

  const value = useMemo<PortalContextValue>(() => {
    const language = state.language;
    return {
      status: status === "ready" && !snapshot ? "error" : status,
      error: status === "ready" && !snapshot ? "No chart is available for this session." : error,
      retry: () => {
        setStatus("loading");
        setError(null);
        setAttempt((n) => n + 1);
      },
      snapshot,
      state,
      largeText: state.largeText,
      setLargeText: (largeText) => update((current) => ({ ...current, largeText })),
      language,
      setLanguage: (next) => update((current) => ({ ...current, language: next })),
      t: (key) => translate(language, key),
      typingDoctorId,
      sendMessage,
      markThreadRead: (doctorId) => {
        const ids = snapshot?.messages.filter((message) => message.doctorId === doctorId).map((message) => message.id) ?? [];
        update((current) => {
          const next = [...new Set([...current.readMessageIds, ...ids])];
          if (next.length === current.readMessageIds.length) return current;
          return { ...current, readMessageIds: next };
        });
      },
      markDoseTaken: (_medicationId, key, taken) =>
        update((current) => ({
          ...current,
          takenDoseKeys: taken
            ? [...new Set([...current.takenDoseKeys, key])]
            : current.takenDoseKeys.filter((item) => item !== key),
        })),
      requestRefill: (medicationId) => {
        update((current) => ({
          ...current,
          refillPendingIds: [...new Set([...current.refillPendingIds, medicationId])],
        }));
        toast("Refill request sent", { description: "Status is pending for this demo." });
      },
      submitFollowUp: (checkInId, answers) => {
        update((current) => ({
          ...current,
          completedCheckInIds: [...new Set([...current.completedCheckInIds, checkInId])],
          followUpAnswers: { ...current.followUpAnswers, [checkInId]: answers },
        }));
        toast("Shared with Dr. Velloso for review");
      },
      markNotificationRead: (id) =>
        update((current) => ({
          ...current,
          readNotificationIds: [...new Set([...current.readNotificationIds, id])],
        })),
      markAllNotificationsRead: () => {
        const ids = snapshot?.notifications.map((item) => item.id) ?? [];
        update((current) => ({
          ...current,
          readNotificationIds: [...new Set([...current.readNotificationIds, ...ids])],
        }));
      },
      cancelAppointment: (id) => {
        void cancelSharedAppointment(id);
        update((current) => ({
          ...current,
          appointmentOverrides: {
            ...current.appointmentOverrides,
            [id]: { ...current.appointmentOverrides[id], status: "cancelled" satisfies ApptStatus },
          },
        }));
      },
      rescheduleAppointment: async (id, datetime) => {
        try {
          await rescheduleSharedAppointment(id, datetime);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "That time is no longer open. Choose another opening.");
          throw error;
        }
        update((current) => ({
          ...current,
          appointmentOverrides: {
            ...current.appointmentOverrides,
            [id]: {
              ...current.appointmentOverrides[id],
              datetime,
              timeLabel: formatHospitalDateTime(datetime),
            },
          },
        }));
        toast("Reschedule saved");
      },
      payStatement: (id) => {
        update((current) => ({
          ...current,
          paidStatementIds: [...new Set([...current.paidStatementIds, id])],
        }));
        toast("Demo payment recorded", { description: "No real charge was made." });
      },
      requestCorrection: (note) => {
        update((current) => ({ ...current, correctionNote: note }));
        toast("Correction request received", { description: "A staff member would review this in a live clinic." });
      },
      sendSupport: (body) => {
        const text = body.trim();
        if (!text) return;
        const message = {
          id: `support-${crypto.randomUUID()}`,
          from: "patient" as const,
          body: text,
          at: new Date().toISOString(),
        };
        update((current) => ({ ...current, supportMessages: [...current.supportMessages, message] }));
        if (supportTimer.current) window.clearTimeout(supportTimer.current);
        supportTimer.current = window.setTimeout(() => {
          const reply =
            SUPPORT_REPLIES[Math.floor(Math.random() * SUPPORT_REPLIES.length)] ??
            SUPPORT_REPLIES[0] ??
            "Thanks for writing. Call (555) 210-0000 if you need the hospital.";
          update((current) => ({
            ...current,
            supportMessages: [
              ...current.supportMessages,
              { id: `support-${crypto.randomUUID()}`, from: "support", body: reply, at: new Date().toISOString() },
            ],
          }));
        }, 900);
      },
      resetDemo: () => {
        clearDemoState();
        const next = defaultDemoState();
        next.largeText = state.largeText;
        next.language = state.language;
        setState(next);
        setTypingDoctorId(null);
        toast("Demo data restored");
      },
      signOut: () => {
        clearPatientSession();
        void navigate({ to: "/patient/sign-in" });
      },
      unreadNotificationCount: snapshot ? unreadNotifications(snapshot, state) : 0,
    };
  }, [error, navigate, sendMessage, snapshot, state, status, typingDoctorId, update]);

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePatientPortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error("usePatientPortal must be used within PatientPortalProvider");
  return ctx;
}

export function useSnapshot() {
  const { snapshot } = usePatientPortal();
  if (!snapshot) throw new Error("Patient chart is not loaded");
  return snapshot;
}
