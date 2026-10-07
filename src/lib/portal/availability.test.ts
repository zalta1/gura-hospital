import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AvailabilityError,
  HOSPITAL_TIME_ZONE,
  addCalendarDays,
  commitBooking,
  createWindowIn,
  deleteWindowIn,
  generateSlotStarts,
  hospitalClock,
  hospitalLocalToUtc,
  listFreeSlots,
  reserveActiveSlot,
  updateWindowIn,
  weekdayMon1,
  type AvailabilityWindow,
  type BusyAppointment,
} from "./availability.ts";

const AMARA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const CALLUM = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const TZ = HOSPITAL_TIME_ZONE;
const CREATED = "2026-01-01T05:00:00.000Z";

function windowFor(partial: Partial<AvailabilityWindow> & Pick<AvailabilityWindow, "id" | "weekday" | "startTime" | "endTime" | "visitType">): AvailabilityWindow {
  return {
    doctorId: AMARA,
    date: null,
    location: partial.visitType === "in_person" ? "Fairmont Ridge" : null,
    recurring: true,
    recurrenceEndDate: null,
    createdAt: CREATED,
    ...partial,
  };
}

function amaraWeek(): AvailabilityWindow[] {
  return [
    windowFor({ id: "mon", weekday: 1, startTime: "09:00", endTime: "13:00", visitType: "in_person" }),
    windowFor({ id: "tue", weekday: 2, startTime: "14:00", endTime: "17:00", visitType: "telehealth", location: null }),
    windowFor({ id: "wed", weekday: 3, startTime: "09:00", endTime: "13:00", visitType: "in_person" }),
    windowFor({ id: "thu", weekday: 4, startTime: "14:00", endTime: "17:00", visitType: "telehealth", location: null }),
    windowFor({ id: "fri", weekday: 5, startTime: "09:00", endTime: "13:00", visitType: "in_person" }),
  ];
}

function nextDate(weekday: number, from = "2026-10-04") {
  let cursor = from;
  for (let i = 0; i < 14; i += 1) {
    if (weekdayMon1(cursor) === weekday) return cursor;
    cursor = addCalendarDays(cursor, 1);
  }
  throw new Error(`No weekday ${weekday}`);
}

function iso(date: string, time: string) {
  const instant = hospitalLocalToUtc(date, time, TZ);
  if (!instant) throw new Error(`${date} ${time} does not exist`);
  return instant.toISOString();
}

const monday = nextDate(1);
const now = new Date("2026-10-03T16:00:00.000Z");

describe("slot generation", () => {
  it("steps every 30 minutes and drops a short remainder", () => {
    const slots = generateSlotStarts(monday, "09:00", "13:00", TZ);
    assert.deepEqual(
      slots.map((slot) => hospitalClock(slot, TZ)),
      ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30"],
    );
    assert.equal(generateSlotStarts(monday, "09:00", "09:20", TZ).length, 0);
    assert.equal(generateSlotStarts(monday, "09:00", "10:00", TZ).map((slot) => hospitalClock(slot, TZ)).join(","), "09:00,09:30");
  });

  it("converts Eastern standard and daylight time to UTC", () => {
    assert.equal(iso("2026-01-15", "09:00"), "2026-01-15T14:00:00.000Z");
    assert.equal(iso("2026-07-15", "09:00"), "2026-07-15T13:00:00.000Z");
    assert.equal(iso("2026-10-31", "09:00"), "2026-10-31T13:00:00.000Z");
    assert.equal(iso("2026-11-01", "09:00"), "2026-11-01T14:00:00.000Z");
  });

  it("skips the missing hour on the spring-forward day", () => {
    const clocks = generateSlotStarts("2026-03-08", "01:00", "04:00", TZ).map((slot) => hospitalClock(slot, TZ));
    assert.deepEqual(clocks, ["01:00", "03:00", "03:30"]);
    assert.equal(iso("2026-03-08", "01:00"), "2026-03-08T06:00:00.000Z");
    assert.equal(iso("2026-03-08", "03:00"), "2026-03-08T07:00:00.000Z");
    assert.equal(hospitalLocalToUtc("2026-03-08", "02:30", TZ), null);
  });

  it("does not offer a fall-back slot whose real length is not 30 minutes", () => {
    const clocks = generateSlotStarts("2026-11-01", "01:00", "03:00", TZ).map((slot) => hospitalClock(slot, TZ));
    assert.ok(clocks.includes("01:00"));
    assert.ok(!clocks.includes("01:30"));
    assert.ok(clocks.includes("02:00"));
    for (const slot of generateSlotStarts("2026-11-01", "01:00", "03:00", TZ)) {
      const start = new Date(slot).getTime();
      const endClock = hospitalClock(new Date(start + 30 * 60000).toISOString(), TZ);
      assert.notEqual(endClock, hospitalClock(slot, TZ));
    }
  });
});

describe("bookable slots", () => {
  const windows = amaraWeek();

  it("removes a confirmed 11:00 slot and leaves 11:30", () => {
    const eleven = iso(monday, "11:00");
    const appointments: BusyAppointment[] = [
      {
        id: "appt-1",
        doctorId: AMARA,
        startsAt: eleven,
        status: "confirmed",
        patientName: "Morgan Ellis",
        patientId: "patient-1",
      },
    ];
    const free = listFreeSlots({
      doctorId: AMARA,
      from: monday,
      to: monday,
      windows,
      blocks: [],
      appointments,
      now,
    });
    const clocks = free.map((slot) => hospitalClock(slot.startsAt, TZ));
    assert.ok(!clocks.includes("11:00"));
    assert.ok(clocks.includes("11:30"));
    assert.equal(JSON.stringify(free).includes("Morgan"), false);
    assert.equal(JSON.stringify(free).includes("appt-1"), false);
  });

  it("holds a slot while the appointment is pending", () => {
    const eleven = iso(monday, "11:00");
    const held = commitBooking({
      windows,
      blocks: [],
      appointments: [],
      doctorId: AMARA,
      startsAt: eleven,
      appointmentId: "appt-hold",
      patientName: "Alex Kim",
      patientId: "patient-2",
      now,
    });
    const free = listFreeSlots({
      doctorId: AMARA,
      from: monday,
      to: monday,
      windows,
      blocks: [],
      appointments: held,
      now,
    });
    assert.ok(!free.some((slot) => hospitalClock(slot.startsAt, TZ) === "11:00"));
  });

  it("returns a slot when the appointment is cancelled, rejected, or a no-show", () => {
    const eleven = iso(monday, "11:00");
    for (const status of ["cancelled", "rejected", "no-show", "no_show", "completed"]) {
      const free = listFreeSlots({
        doctorId: AMARA,
        from: monday,
        to: monday,
        windows,
        blocks: [],
        appointments: [
          {
            id: "appt-free",
            doctorId: AMARA,
            startsAt: eleven,
            status,
            patientName: "Morgan Ellis",
            patientId: "patient-1",
          },
        ],
        now,
      });
      assert.ok(
        free.some((slot) => hospitalClock(slot.startsAt, TZ) === "11:00"),
        status,
      );
    }
  });

  it("hides slots inside the lead time", () => {
    const morning = new Date(iso(monday, "09:30"));
    const free = listFreeSlots({
      doctorId: AMARA,
      from: monday,
      to: monday,
      windows,
      blocks: [],
      appointments: [],
      now: morning,
      leadMs: 2 * 60 * 60 * 1000,
    });
    const clocks = free.map((slot) => hospitalClock(slot.startsAt, TZ));
    assert.deepEqual(clocks[0], "11:30");
    assert.ok(!clocks.includes("11:00"));
  });

  it("hides a slot covered by a block", () => {
    const eleven = iso(monday, "11:00");
    const free = listFreeSlots({
      doctorId: AMARA,
      from: monday,
      to: monday,
      windows,
      blocks: [
        {
          id: "block-1",
          doctorId: AMARA,
          startsAt: eleven,
          endsAt: new Date(new Date(eleven).getTime() + 30 * 60000).toISOString(),
          createdAt: CREATED,
        },
      ],
      appointments: [],
      now,
    });
    assert.ok(!free.some((slot) => hospitalClock(slot.startsAt, TZ) === "11:00"));
    assert.ok(free.some((slot) => hospitalClock(slot.startsAt, TZ) === "11:30"));
  });
});

describe("windows", () => {
  it("rejects an overlapping window for the same doctor", () => {
    const windows = amaraWeek();
    assert.throws(
      () =>
        createWindowIn(
          windows,
          AMARA,
          {
            date: null,
            weekday: 2,
            startTime: "15:00",
            endTime: "16:00",
            visitType: "telehealth",
            location: null,
            recurring: true,
            recurrenceEndDate: null,
          },
          now,
        ),
      (error: unknown) => error instanceof AvailabilityError && error.code === "overlap",
    );
  });

  it("rejects a past one-off date and an end time that is not after the start", () => {
    assert.throws(
      () =>
        createWindowIn(
          [],
          AMARA,
          {
            date: "2026-10-01",
            weekday: null,
            startTime: "09:00",
            endTime: "13:00",
            visitType: "in_person",
            location: "Fairmont Ridge",
            recurring: false,
            recurrenceEndDate: null,
          },
          now,
        ),
      (error: unknown) => error instanceof AvailabilityError && error.code === "validation",
    );
    assert.throws(
      () =>
        createWindowIn(
          [],
          AMARA,
          {
            date: monday,
            weekday: null,
            startTime: "13:00",
            endTime: "09:00",
            visitType: "in_person",
            location: "Fairmont Ridge",
            recurring: false,
            recurrenceEndDate: null,
          },
          now,
        ),
      (error: unknown) => error instanceof AvailabilityError && /after the start/.test(error.message),
    );
  });

  it("refuses to delete or shrink a window that still has a booked visit", () => {
    const windows = amaraWeek();
    const eleven = iso(monday, "11:00");
    const appointments: BusyAppointment[] = [
      {
        id: "appt-1",
        doctorId: AMARA,
        startsAt: eleven,
        status: "pending",
        patientName: "Morgan Ellis",
        patientId: "patient-1",
      },
    ];
    assert.throws(
      () => deleteWindowIn(windows, AMARA, "mon", appointments, now),
      (error: unknown) =>
        error instanceof AvailabilityError &&
        error.code === "has_appointments" &&
        error.affected[0]?.patientName === "Morgan Ellis",
    );
    assert.throws(
      () =>
        updateWindowIn(
          windows,
          AMARA,
          "mon",
          {
            date: null,
            weekday: 1,
            startTime: "09:00",
            endTime: "11:00",
            visitType: "in_person",
            location: "Fairmont Ridge",
            recurring: true,
            recurrenceEndDate: null,
          },
          appointments,
          now,
        ),
      (error: unknown) => error instanceof AvailabilityError && error.code === "has_appointments",
    );
    const shrunk = updateWindowIn(
      windows,
      AMARA,
      "mon",
      {
        date: null,
        weekday: 1,
        startTime: "09:00",
        endTime: "12:00",
        visitType: "in_person",
        location: "Fairmont Ridge",
        recurring: true,
        recurrenceEndDate: null,
      },
      appointments,
      now,
    );
    assert.equal(shrunk.find((item) => item.id === "mon")?.endTime, "12:00");
  });
});

describe("double booking", () => {
  it("lets the first pending hold win and rejects the second", () => {
    const windows = amaraWeek();
    const eleven = iso(monday, "11:00");
    const first = commitBooking({
      windows,
      blocks: [],
      appointments: [],
      doctorId: AMARA,
      startsAt: eleven,
      appointmentId: "first",
      patientName: "Morgan Ellis",
      patientId: "p1",
      now,
    });
    assert.throws(
      () =>
        commitBooking({
          windows,
          blocks: [],
          appointments: first,
          doctorId: AMARA,
          startsAt: eleven,
          appointmentId: "second",
          patientName: "Alex Kim",
          patientId: "p2",
          now,
        }),
      (error: unknown) => error instanceof AvailabilityError && error.code === "taken",
    );
    assert.equal(first.length, 1);
  });

  it("rejects the second reserve of the same doctor and start", () => {
    const held = new Set<string>();
    const eleven = iso(monday, "11:00");
    reserveActiveSlot(held, AMARA, eleven);
    assert.throws(
      () => reserveActiveSlot(held, AMARA, eleven),
      (error: unknown) => error instanceof AvailabilityError && error.code === "taken",
    );
    reserveActiveSlot(held, CALLUM, eleven);
    assert.equal(held.size, 2);
  });
});

describe("authorization", () => {
  it("rejects a doctor changing another doctor's window", () => {
    const windows = amaraWeek();
    assert.throws(
      () =>
        createWindowIn(
          [],
          CALLUM,
          {
            doctorId: AMARA,
            date: monday,
            weekday: null,
            startTime: "09:00",
            endTime: "10:00",
            visitType: "telehealth",
            location: null,
            recurring: false,
            recurrenceEndDate: null,
          },
          now,
        ),
      (error: unknown) => error instanceof AvailabilityError && error.code === "forbidden",
    );
    assert.throws(
      () => deleteWindowIn(windows, CALLUM, "mon", [], now),
      (error: unknown) => error instanceof AvailabilityError && error.code === "forbidden",
    );
    assert.equal(windows.length, 5);
  });
});
