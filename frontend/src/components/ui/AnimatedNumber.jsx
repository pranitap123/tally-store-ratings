import { useEffect, useRef } from 'react';
import { animate, useInView, useReducedMotion } from 'framer-motion';

export function AnimatedNumber({ value, decimals = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    const fmt = (n) => n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    if (reduce) {
      el.textContent = fmt(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 1.2,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (n) => (el.textContent = fmt(n)),
    });
    return () => controls.stop();
  }, [value, decimals, inView, reduce]);

  return (
    <span ref={ref} className="mono">
      {decimals ? (0).toFixed(decimals) : 0}
    </span>
  );
}
