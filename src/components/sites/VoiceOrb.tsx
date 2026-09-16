import { useEffect, useRef } from "react";

export type VoicePhase = "connecting" | "listening" | "speaking" | "thinking";

type Props = {
  phase: VoicePhase;
  getInputBins: () => Uint8Array;
  getOutputBins: () => Uint8Array;
};

function energy(bins: Uint8Array): number {
  if (!bins.length) return 0;
  let sum = 0;
  for (let i = 0; i < bins.length; i++) sum += bins[i] ?? 0;
  return sum / (bins.length * 255);
}

function centroid(bins: Uint8Array): number {
  let num = 0;
  let den = 0;
  for (let i = 0; i < bins.length; i++) {
    const v = bins[i] ?? 0;
    num += i * v;
    den += v;
  }
  return den > 0 ? num / den / bins.length : 0.3;
}

export function VoiceOrb({ phase, getInputBins, getOutputBins }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    let raf = 0;

    const draw = () => {
      frame += 1;
      const dpr = window.devicePixelRatio || 1;
      const size = 280;
      if (canvas.width !== size * dpr) {
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      const speaking = phase === "speaking";
      const bins = speaking ? getOutputBins() : getInputBins();
      const vol = energy(bins);
      const pitch = centroid(bins);
      const cx = size / 2;
      const cy = size / 2;

      ctx.clearRect(0, 0, size, size);

      const breathe =
        phase === "thinking" || phase === "connecting"
          ? 0.08 + 0.04 * Math.sin(frame / 28)
          : 0;

      const radius = 52 + vol * (speaking ? 58 : 36) + breathe * 80;
      const gold = `rgba(184, 163, 105, ${0.35 + vol * 0.5})`;
      const navy = "rgba(31, 45, 61, 0.95)";

      const glow = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius * 1.7);
      if (speaking) {
        glow.addColorStop(0, `rgba(232, 214, 160, ${0.55 + vol * 0.4})`);
        glow.addColorStop(0.45, gold);
        glow.addColorStop(1, "rgba(31, 45, 61, 0)");
      } else {
        glow.addColorStop(0, `rgba(90, 120, 150, ${0.25 + vol * 0.45})`);
        glow.addColorStop(0.5, `rgba(184, 163, 105, ${0.2 + vol * 0.3})`);
        glow.addColorStop(1, "rgba(31, 45, 61, 0)");
      }
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.65, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = navy;
      ctx.fill();
      ctx.lineWidth = speaking ? 4 + vol * 8 : 2 + vol * 4;
      ctx.strokeStyle = gold;
      ctx.stroke();

      const barCount = 48;
      const step = Math.max(1, Math.floor(bins.length / barCount));
      for (let i = 0; i < barCount; i++) {
        const v = (bins[i * step] ?? 0) / 255;
        const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
        const inner = radius + 6;
        const spike = speaking ? 18 + v * 42 + pitch * 12 : 8 + v * 22;
        const x1 = cx + Math.cos(angle) * inner;
        const y1 = cy + Math.sin(angle) * inner;
        const x2 = cx + Math.cos(angle) * (inner + spike);
        const y2 = cy + Math.sin(angle) * (inner + spike);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = speaking
          ? `rgba(232, 214, 160, ${0.35 + v * 0.65})`
          : `rgba(184, 163, 105, ${0.2 + v * 0.55})`;
        ctx.lineWidth = speaking ? 2.4 : 1.5;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(cx, cy, 10 + vol * 14, 0, Math.PI * 2);
      ctx.fillStyle = speaking ? "rgba(232, 214, 160, 0.95)" : "rgba(184, 163, 105, 0.85)";
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [getInputBins, getOutputBins, phase]);

  return (
    <canvas
      ref={canvasRef}
      className="mx-auto"
      aria-hidden="true"
    />
  );
}
