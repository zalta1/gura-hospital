import { useState } from "react";
import { LifeBuoy, Send } from "lucide-react";
import { usePatientPortal } from "@/components/patient/PatientPortalProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hospitalInfo } from "@/lib/hospital-data";

export function HelpWidget() {
  const { state, sendSupport, t } = usePatientPortal();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {open ? (
        <section className="w-[min(100vw-2rem,22rem)] border border-border bg-card shadow-float" aria-label={t("helpTitle")}>
          <div className="bg-primary px-4 py-2 text-primary-foreground">
            <h2 className="nav-label">{t("helpTitle")}</h2>
          </div>
          <p className="px-4 pt-3 text-xs text-muted-foreground">
            {hospitalInfo.name} · {hospitalInfo.phone}. This chat is simulated.
          </p>
          <div className="max-h-64 space-y-2 overflow-auto px-4 py-3">
            {state.supportMessages.map((message) => (
              <p
                key={message.id}
                className={
                  message.from === "patient"
                    ? "ml-6 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
                    : "mr-6 rounded-md bg-surface px-3 py-2 text-sm"
                }
              >
                {message.body}
              </p>
            ))}
          </div>
          <form
            className="flex gap-2 border-t border-border p-3"
            onSubmit={(event) => {
              event.preventDefault();
              sendSupport(text);
              setText("");
            }}
          >
            <Input
              value={text}
              onChange={(event) => setText(event.target.value)}
              aria-label="Message to patient support"
              placeholder="Write a message"
            />
            <Button type="submit" size="icon" aria-label="Send support message">
              <Send />
            </Button>
          </form>
        </section>
      ) : null}
      <Button type="button" variant="gold" size="pillLg" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <LifeBuoy /> {t("needHelp")}
      </Button>
    </div>
  );
}
