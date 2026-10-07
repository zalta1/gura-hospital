function escapePdf(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function downloadDemoPdf(filename: string, title: string, lines: string[]) {
  const content = [title, "Demo document. Not a real medical record.", ...lines].slice(0, 18);
  const ops = ["BT", "/F1 14 Tf", "72 740 Td", `(${escapePdf(content[0] ?? "")}) Tj`];
  for (const line of content.slice(1)) {
    ops.push("/F1 11 Tf", "0 -18 Td", `(${escapePdf(line.slice(0, 90))}) Tj`);
  }
  ops.push("ET");
  const stream = ops.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj ${object} endobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  for (const offset of offsets) body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  downloadBlob(filename.endsWith(".pdf") ? filename : `${filename}.pdf`, new Blob([body], { type: "application/pdf" }));
}

function pad(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}${m}${d}T${h}${min}00`;
}

export function downloadIcs(title: string, start: Date, location: string) {
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Gura Hospital//Patient Portal Demo//EN",
    "BEGIN:VEVENT",
    `DTSTART:${pad(start)}`,
    `DTEND:${pad(end)}`,
    `SUMMARY:${title.replace(/\n/g, " ")}`,
    `LOCATION:${location.replace(/\n/g, " ")}`,
    "DESCRIPTION:Demo calendar item from the Gura Hospital patient portal.",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  downloadBlob("gura-appointment.ics", new Blob([ics], { type: "text/calendar" }));
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
