"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function idFrom(storage: Storage, key: string) {
  let value = storage.getItem(key);
  if (!value) {
    value = randomId();
    storage.setItem(key, value);
  }
  return value;
}

function referrerParts() {
  if (!document.referrer) return { referrerHost: null, referrerPath: null };
  try {
    const url = new URL(document.referrer);
    return {
      referrerHost: url.hostname.toLowerCase(),
      referrerPath: url.origin === location.origin ? url.pathname : null,
    };
  } catch {
    return { referrerHost: null, referrerPath: null };
  }
}

export default function AnalyticsBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || pathname.startsWith("/api")) return;

    try {
      const visitorId = idFrom(localStorage, "fc_visitor_id");
      const sessionId = idFrom(sessionStorage, "fc_session_id");
      const referrer = referrerParts();
      const params = new URLSearchParams(location.search);
      const payload = JSON.stringify({
        path: pathname,
        visitorId,
        sessionId,
        ...referrer,
        utmSource: params.get("utm_source"),
        utmMedium: params.get("utm_medium"),
        utmCampaign: params.get("utm_campaign"),
      });

      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/analytics", new Blob([payload], { type: "application/json" }));
      } else {
        fetch("/api/analytics", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {}
  }, [pathname]);

  return null;
}
