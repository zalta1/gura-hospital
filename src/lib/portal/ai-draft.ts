/**
 * First-pass clinical draft for clinician edit only.
 * Never send this text to patients. It is not a diagnosis and is not part of
 * the record until a doctor saves and explicitly approves it.
 */
export function draftClinicalReport({
  patientName,
  reason,
  visitType,
}: {
  patientName: string;
  reason: string;
  visitType: string;
}): { diagnosis: string; notes: string; vitals: string } {
  const visitLabel = visitType.replaceAll("_", " ");
  const complaint = reason.trim() || "unspecified chief complaint";

  return {
    diagnosis: `[AI DRAFT — clinician review required] Working impression related to: ${complaint}. This is not a diagnosis and must not be shared with the patient.`,
    notes: [
      "AI DRAFT — for clinician edit only. Not sent to patients.",
      "",
      `Patient: ${patientName}`,
      `Visit type: ${visitLabel}`,
      `Chief complaint: ${complaint}`,
      "",
      "History: [edit]",
      "Exam: [edit]",
      "Assessment: [edit]",
      "Plan: [edit]",
      "",
      "Replace every placeholder before saving. Click Approve only after you have verified the note.",
    ].join("\n"),
    vitals: JSON.stringify(
      {
        source: "ai_draft",
        bp: "",
        hr: "",
        temp: "",
        spo2: "",
        note: "Placeholder vitals — replace with measured values. AI draft only.",
      },
      null,
      2,
    ),
  };
}
