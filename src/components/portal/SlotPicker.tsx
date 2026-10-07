import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  addCalendarDays,
  formatHospitalTime,
  hospitalDateFromIso,
  hospitalToday,
  type FreeSlot,
} from "@/lib/portal/availability";
import { fetchFreeSlots } from "@/lib/portal/availability-api";
import { AVAILABILITY_EVENT } from "@/lib/portal/availability-store";
import { LOCAL_BOOKING_EVENT } from "@/lib/portal/local-store";
import { cn } from "@/lib/utils";

type VisitChoice = "in-person" | "alder-bay" | "telehealth" | "any";

type AvailabilityState = {
  status: "loading" | "error" | "empty" | "ready";
  count: number;
};

function matchesVisit(slot: FreeSlot, visit: VisitChoice) {
  if (visit === "any") return true;
  if (visit === "telehealth") return slot.visitType === "telehealth";
  if (visit === "alder-bay") return slot.visitType === "in_person" && /alder/i.test(slot.location ?? "");
  return slot.visitType === "in_person" && !/alder/i.test(slot.location ?? "");
}

function civilLabel(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)));
}

export function SlotPicker({
  doctorId,
  visit,
  selectedStartsAt,
  onSelect,
  onAvailability,
}: {
  doctorId: string;
  visit: VisitChoice;
  selectedStartsAt: string | null;
  onSelect: (slot: FreeSlot) => void;
  onAvailability?: (state: AvailabilityState) => void;
}) {
  const queryClient = useQueryClient();
  const onAvailabilityRef = useRef(onAvailability);
  onAvailabilityRef.current = onAvailability;
  const [mounted, setMounted] = useState(false);
  const [day, setDay] = useState("");
  const from = mounted ? hospitalToday() : "";
  const to = from ? addCalendarDays(from, 13) : "";

  useEffect(() => {
    setMounted(true);
  }, []);

  const query = useQuery({
    queryKey: ["free-slots", doctorId, from, to],
    queryFn: () => fetchFreeSlots(doctorId, from, to),
    enabled: Boolean(doctorId && from && to),
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!doctorId) return;
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["free-slots", doctorId] });
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("visibilitychange", refresh);
    window.addEventListener(LOCAL_BOOKING_EVENT, refresh);
    window.addEventListener(AVAILABILITY_EVENT, refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("visibilitychange", refresh);
      window.removeEventListener(LOCAL_BOOKING_EVENT, refresh);
      window.removeEventListener(AVAILABILITY_EVENT, refresh);
    };
  }, [doctorId, queryClient]);

  const slots = (query.data ?? []).filter((slot) => matchesVisit(slot, visit));
  const dates = from ? Array.from({ length: 14 }, (_, index) => addCalendarDays(from, index)) : [];
  const counts = new Map(dates.map((date) => [date, slots.filter((slot) => hospitalDateFromIso(slot.startsAt) === date).length]));
  const activeDay = day && (counts.get(day) ?? 0) > 0 ? day : (dates.find((date) => (counts.get(date) ?? 0) > 0) ?? "");
  const daySlots = slots.filter((slot) => hospitalDateFromIso(slot.startsAt) === activeDay);

  useEffect(() => {
    if (!mounted || query.isLoading) {
      onAvailabilityRef.current?.({ status: "loading", count: 0 });
      return;
    }
    if (query.isError) {
      onAvailabilityRef.current?.({ status: "error", count: 0 });
      return;
    }
    onAvailabilityRef.current?.({ status: slots.length === 0 ? "empty" : "ready", count: slots.length });
  }, [mounted, query.isError, query.isLoading, slots.length]);

  if (!mounted || query.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading openings…</p>;
  }

  if (query.isError) {
    return (
      <div className="space-y-3" role="alert">
        <p className="text-sm text-destructive">Openings could not be loaded. Refresh and try again.</p>
        <Button type="button" size="sm" variant="outlineNavy" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        No openings right now
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Dates">
        {dates.map((date) => {
          const count = counts.get(date) ?? 0;
          const selected = date === activeDay;
          return (
            <button
              key={date}
              type="button"
              disabled={count === 0}
              aria-pressed={selected}
              aria-label={`${civilLabel(date)}, ${count === 0 ? "no openings" : `${count} openings`}`}
              onClick={() => setDay(date)}
              className={cn(
                "min-w-24 shrink-0 rounded-md border px-3 py-2 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-not-allowed disabled:opacity-40",
                selected ? "border-gold bg-gold/15 text-primary" : "border-border bg-card text-primary",
              )}
            >
              <span className="block font-medium">{civilLabel(date)}</span>
              <span className="text-muted-foreground">{count === 0 ? "Full" : `${count} open`}</span>
            </button>
          );
        })}
      </div>
      <div role="radiogroup" aria-label="Open times" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {daySlots.map((slot) => {
          const selected = selectedStartsAt === slot.startsAt;
          const place = slot.visitType === "telehealth" ? "Telehealth" : slot.location || "In person";
          return (
            <button
              key={slot.startsAt}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${formatHospitalTime(slot.startsAt)} ${place}`}
              onClick={() => onSelect(slot)}
              className={cn(
                "h-11 rounded-md border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                selected ? "border-gold bg-gold/20 font-medium text-primary" : "border-border bg-card text-primary hover:border-primary",
              )}
            >
              {formatHospitalTime(slot.startsAt)}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Times are Eastern Time at Fairmont Ridge.</p>
    </div>
  );
}
