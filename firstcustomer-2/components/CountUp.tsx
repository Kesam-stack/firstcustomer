"use client";

import { useEffect, useState } from "react";
import { money } from "@/lib/format";

export default function CountUp({ cents, moneyFormat = true }: { cents: number; moneyFormat?: boolean }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!cents) {
      setValue(0);
      return;
    }
    const start = performance.now();
    const duration = 700;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(cents * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [cents]);
  return <>{moneyFormat ? money(value) : value.toLocaleString("en-US")}</>;
}
