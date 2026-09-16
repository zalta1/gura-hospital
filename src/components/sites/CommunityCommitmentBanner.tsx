import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

type SliceDef = {
  id: string;
  label: string;
  amountM: number;
  percent: number;
  color: string;
  placement: "inside" | "leader";
  durationMs: number;
};

/** Clockwise from top — animation order. */
const SLICES: SliceDef[] = [
  {
    id: "community",
    label: "Community Services",
    amountM: 165.8,
    percent: 34.9,
    color: "#061F47",
    placement: "inside",
    durationMs: 980,
  },
  {
    id: "charity",
    label: "Charity Care and Bad Debt",
    amountM: 150.2,
    percent: 31.7,
    color: "#F5B400",
    placement: "inside",
    durationMs: 920,
  },
  {
    id: "research",
    label: "Research",
    amountM: 10.1,
    percent: 2.1,
    color: "#D4652F",
    placement: "leader",
    durationMs: 520,
  },
  {
    id: "home-health",
    label: "Home Health Losses",
    amountM: 2.3,
    percent: 0.5,
    color: "#E23B2E",
    placement: "leader",
    durationMs: 420,
  },
  {
    id: "education",
    label: "Health Professions Education",
    amountM: 146.1,
    percent: 30.8,
    color: "#7EB8E8",
    placement: "inside",
    durationMs: 980,
  },
];

const CX = 220;
const CY = 220;
const R_OUTER = 168;
const R_INNER = 78;
const VIEW = 440;
const START_ANGLE = 0; // top, clockwise
const GAP_MS = 140;
const LEADER_DRAW_MS = 380;

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(startAngle: number, endAngle: number) {
  const sweep = endAngle - startAngle;
  if (sweep <= 0.05) return "";
  const large = sweep > 180 ? 1 : 0;
  const s = polar(CX, CY, R_OUTER, startAngle);
  const e = polar(CX, CY, R_OUTER, endAngle);
  const sInner = polar(CX, CY, R_INNER, endAngle);
  const eInner = polar(CX, CY, R_INNER, startAngle);
  return [
    `M ${s.x} ${s.y}`,
    `A ${R_OUTER} ${R_OUTER} 0 ${large} 1 ${e.x} ${e.y}`,
    `L ${sInner.x} ${sInner.y}`,
    `A ${R_INNER} ${R_INNER} 0 ${large} 0 ${eInner.x} ${eInner.y}`,
    "Z",
  ].join(" ");
}

/** Slight overshoot then settle. */
function easeOutBack(t: number) {
  const c1 = 1.35;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function clamp01(t: number) {
  return Math.min(1, Math.max(0, t));
}

function formatAmount(m: number) {
  if (m < 10) return `$${m.toFixed(1)}M`;
  if (m < 100) return `$${m.toFixed(1)}M`;
  return `$${m.toFixed(1)}M`;
}

function formatPercent(p: number) {
  return `${p.toFixed(1)}%`;
}

function wrapLabel(label: string, maxChars: number) {
  if (label.length <= maxChars) return { line1: label, line2: "" };
  const words = label.split(" ");
  let line1 = "";
  let line2 = "";
  for (const w of words) {
    const next = line1 ? `${line1} ${w}` : w;
    if (!line2 && next.length <= maxChars) line1 = next;
    else line2 = line2 ? `${line2} ${w}` : w;
  }
  return { line1, line2 };
}

type SliceAnim = {
  progress: number; // 0–1 settled visual fill (may briefly >1 during overshoot, clamped for path)
  amount: number;
  percent: number;
  leader: number; // 0–1 line draw
  labelOpacity: number;
};

const EMPTY_ANIMS: SliceAnim[] = SLICES.map(() => ({
  progress: 0,
  amount: 0,
  percent: 0,
  leader: 0,
  labelOpacity: 0,
}));

export function CommunityCommitmentBanner() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const startedRef = useRef(false);
  const [anims, setAnims] = useState<SliceAnim[]>(EMPTY_ANIMS);
  const [underline, setUnderline] = useState(false);
  const [ctaNudge, setCtaNudge] = useState(false);
  const [mediaLive, setMediaLive] = useState(false);

  const layout = useMemo(() => {
    let cursor = START_ANGLE;
    return SLICES.map((slice) => {
      const start = cursor;
      const sweep = (slice.percent / 100) * 360;
      const end = cursor + sweep;
      cursor = end;
      const mid = (start + end) / 2;
      const rim = polar(CX, CY, R_OUTER + 2, mid);
      const labelPt = polar(CX, CY, (R_OUTER + R_INNER) / 2, mid);
      // Leader anchors toward lower-left for thin slices near the end of the arc.
      const leader =
        slice.placement === "leader"
          ? slice.id === "research"
            ? { labelX: 16, labelY: 372, elbowX: 96, elbowY: 330 }
            : { labelX: 16, labelY: 310, elbowX: 108, elbowY: 278 }
          : null;
      return { ...slice, start, end, sweep, mid, rim, labelPt, leader };
    });
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setAnims(
        SLICES.map((s) => ({
          progress: 1,
          amount: s.amountM,
          percent: s.percent,
          leader: s.placement === "leader" ? 1 : 0,
          labelOpacity: 1,
        })),
      );
      setUnderline(true);
      setMediaLive(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || startedRef.current) continue;
          startedRef.current = true;
          observer.unobserve(el);
          setMediaLive(true);
          void runTimeline(setAnims, setUnderline, setCtaNudge);
        }
      },
      { threshold: 0.22, rootMargin: "0px 0px -6% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="community-commitment"
      className="community-commitment overflow-hidden"
      aria-labelledby="community-commitment-heading"
    >
      <div className="mx-auto grid max-w-[2000px] gap-10 px-6 py-12 lg:grid-cols-[minmax(0,48fr)_minmax(0,52fr)] lg:items-start lg:gap-16 lg:px-12 lg:py-14 xl:gap-20">
        <div className="flex flex-col">
          <h2
            id="community-commitment-heading"
            className="font-sans text-[clamp(2.25rem,5vw,4.25rem)] font-bold leading-[1.05] tracking-tight text-white"
          >
            Committed to our
            <br />
            <span className="text-[#F5B400]">community</span>
          </h2>
          <div
            className={`community-underline mt-5 h-1.5 max-w-[min(100%,34rem)] bg-[#F5B400] ${underline ? "is-drawn" : ""}`}
            aria-hidden
          />
          <p className="mt-8 max-w-xl text-[clamp(1.05rem,2vw,1.55rem)] leading-snug text-white/95">
            More than $400 million is contributed by Gura Hospital to enhance community health.
          </p>

          <div className="relative mx-auto mt-10 w-full max-w-[440px] lg:mx-0">
            <svg
              viewBox={`0 0 ${VIEW} ${VIEW}`}
              className="h-auto w-full"
              role="img"
              aria-label="Animated community benefit allocation chart"
            >
              {/* Empty track */}
              <circle
                cx={CX}
                cy={CY}
                r={(R_OUTER + R_INNER) / 2}
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth={R_OUTER - R_INNER}
              />

              {layout.map((slice, i) => {
                const a = anims[i]!;
                const raw = Math.max(0, a.progress);
                const visualSweep = Math.min(slice.sweep * 1.06, slice.sweep * raw);
                const end = slice.start + Math.min(visualSweep, slice.sweep);
                const d = arcPath(slice.start, end);
                if (!d || a.progress <= 0.001) return null;
                return <path key={slice.id} d={d} fill={slice.color} />;
              })}

              {layout.map((slice, i) => {
                const a = anims[i]!;
                if (slice.placement !== "inside" || a.labelOpacity < 0.05) return null;
                const wrapped = wrapLabel(slice.label, 18);
                const fill = slice.id === "charity" || slice.id === "education" ? "#0A2A5E" : "#FFFFFF";
                return (
                  <g
                    key={`label-${slice.id}`}
                    transform={`translate(${slice.labelPt.x}, ${slice.labelPt.y})`}
                    opacity={a.labelOpacity}
                  >
                    <text textAnchor="middle" fill={fill} className="font-sans" style={{ fontSize: 11, fontWeight: 500 }}>
                      <tspan x="0" dy="-0.9em">
                        {wrapped.line1}
                      </tspan>
                      {wrapped.line2 ? (
                        <tspan x="0" dy="1.15em">
                          {wrapped.line2}
                        </tspan>
                      ) : null}
                    </text>
                    <text textAnchor="middle" fill={fill} className="font-sans" style={{ fontSize: 12, fontWeight: 700 }}>
                      <tspan x="0" dy={wrapped.line2 ? "1.35em" : "1.45em"}>
                        {formatAmount(a.amount)} · {formatPercent(a.percent)}
                      </tspan>
                    </text>
                  </g>
                );
              })}

              {layout.map((slice, i) => {
                const a = anims[i]!;
                if (slice.placement !== "leader" || !slice.leader) return null;
                const L = slice.leader;
                const pathD = `M ${slice.rim.x} ${slice.rim.y} L ${L.elbowX} ${L.elbowY} L ${L.labelX + 100} ${L.labelY - 4}`;
                const len = 160;
                return (
                  <g key={`leader-${slice.id}`} opacity={a.progress > 0.55 ? 1 : 0}>
                    <path
                      d={pathD}
                      fill="none"
                      stroke="rgba(255,255,255,0.55)"
                      strokeWidth="1.25"
                      strokeDasharray={len}
                      strokeDashoffset={len * (1 - a.leader)}
                      strokeLinecap="round"
                    />
                    <circle
                      cx={slice.rim.x}
                      cy={slice.rim.y}
                      r="2.5"
                      fill="#fff"
                      opacity={a.leader}
                    />
                    <g opacity={a.labelOpacity}>
                      <text
                        x={L.labelX}
                        y={L.labelY - 10}
                        fill="#fff"
                        className="font-sans"
                        style={{ fontSize: 11, fontWeight: 500 }}
                      >
                        {slice.label}
                      </text>
                      <text
                        x={L.labelX}
                        y={L.labelY + 6}
                        fill="#fff"
                        className="font-sans"
                        style={{ fontSize: 12, fontWeight: 700 }}
                      >
                        {formatAmount(a.amount)} · {formatPercent(a.percent)}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          <Link
            to="/"
            hash="community-commitment"
            className={`community-cta mt-8 inline-flex items-center gap-2 self-start font-sans text-base font-bold text-white transition-opacity hover:opacity-85 md:text-lg ${ctaNudge ? "is-nudging" : ""}`}
          >
            Learn More About Our Commitment
            <ArrowRight className="community-cta-arrow size-5" aria-hidden />
          </Link>
        </div>

        <div className="flex flex-col lg:pt-2">
          <div
            className={`community-media relative aspect-[780/580] w-full overflow-hidden rounded-3xl bg-black shadow-[0_24px_60px_-28px_rgba(0,0,0,0.55)] ${mediaLive ? "is-live" : ""}`}
          >
            <img
              src="https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=1600&q=80"
              alt=""
              aria-hidden
              className="community-media-bg absolute inset-[-10%] size-[120%] max-w-none object-cover"
            />
            <img
              src="https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=1600&q=80"
              alt="Hands offering care and support in the community"
              className="community-media-subject absolute inset-0 size-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />
          </div>
          <p className="mt-5 max-w-[42rem] font-sans text-[clamp(1.05rem,2vw,1.7rem)] font-bold leading-snug text-white">
            Helping homeless people get the care and love they deserve, for a better society for all.
          </p>
        </div>
      </div>
    </section>
  );
}

async function runTimeline(
  setAnims: Dispatch<SetStateAction<SliceAnim[]>>,
  setUnderline: (v: boolean) => void,
  setCtaNudge: (v: boolean) => void,
) {
  const state: SliceAnim[] = SLICES.map(() => ({
    progress: 0,
    amount: 0,
    percent: 0,
    leader: 0,
    labelOpacity: 0,
  }));

  const publish = () => setAnims(state.map((s) => ({ ...s })));

  for (let i = 0; i < SLICES.length; i++) {
    const slice = SLICES[i]!;
    await animateSlice(i, slice, state, publish);
    if (slice.placement === "leader") {
      await animateLeader(i, state, publish);
    }
    await wait(GAP_MS);
  }

  setUnderline(true);
  await wait(520);
  setCtaNudge(true);
}

function animateSlice(
  index: number,
  slice: SliceDef,
  state: SliceAnim[],
  publish: () => void,
) {
  return new Promise<void>((resolve) => {
    const start = performance.now();
    const tick = (now: number) => {
      const t = clamp01((now - start) / slice.durationMs);
      const eased = easeOutBack(t);
      const countT = easeOutCubic(t);
      state[index] = {
        progress: eased,
        amount: slice.amountM * countT,
        percent: slice.percent * countT,
        leader: state[index]!.leader,
        labelOpacity: clamp01((t - 0.18) / 0.35),
      };
      publish();
      if (t < 1) requestAnimationFrame(tick);
      else {
        state[index] = {
          progress: 1,
          amount: slice.amountM,
          percent: slice.percent,
          leader: state[index]!.leader,
          labelOpacity: 1,
        };
        publish();
        resolve();
      }
    };
    requestAnimationFrame(tick);
  });
}

function animateLeader(index: number, state: SliceAnim[], publish: () => void) {
  return new Promise<void>((resolve) => {
    const start = performance.now();
    const tick = (now: number) => {
      const t = clamp01((now - start) / LEADER_DRAW_MS);
      state[index] = {
        ...state[index]!,
        leader: easeOutCubic(t),
      };
      publish();
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
