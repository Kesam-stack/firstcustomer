"use client";

import { useEffect, useMemo, useState } from "react";

export default function MarketHeat({ value }: { value: number }) {
  const target = useMemo(() => Math.max(50, Math.round(value)), [value]);
  const [display, setDisplay] = useState(50);

  useEffect(() => {
    const start = 50;
    if (target <= start) {
      setDisplay(start);
      return;
    }

    const startedAt = performance.now();
    const duration = 900;

    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (target - start) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return <div className="market-heat">
    <span>Market heat</span>
    <strong>{display}</strong>
    <small><i aria-hidden="true" /> Activity index</small>
  </div>;
}
