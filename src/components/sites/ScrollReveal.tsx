import {
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type ScrollRevealProps<T extends ElementType = "div"> = {
  as?: T;
  children: ReactNode;
  className?: string;
  /** Stagger delay in ms (applied as transition-delay). */
  delay?: number;
  /** Fraction of element that must be visible (0–1). Default ~18%. */
  threshold?: number;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

/**
 * Once-only fade/slide-in when the element enters the viewport.
 * Does not replay on scroll-back.
 */
export function ScrollReveal<T extends ElementType = "div">({
  as,
  children,
  className,
  delay = 0,
  threshold = 0.18,
  ...rest
}: ScrollRevealProps<T>) {
  const Comp = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      el.dataset["revealed"] = "true";
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          el.dataset["revealed"] = "true";
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <Comp
      ref={ref}
      className={cn("scroll-reveal", className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </Comp>
  );
}
