"use client";

import { FormEvent, useState } from "react";

export default function SourcePostForm({ code, secret, current }: { code: string; secret: string; current: string | null }) {
  const [url, setUrl] = useState(current || "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch(`/api/referrals/${encodeURIComponent(code)}/source?key=${encodeURIComponent(secret)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sourcePostUrl: url }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return setMessage(data.error || "Could not save");
    setMessage("Saved. This post will appear on the public ledger after a payout.");
  }

  return <form className="source-post" onSubmit={save}>
    <label>
      X post that sent the traffic <span>optional, shown on the ledger after payout</span>
      <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://x.com/you/status/123" />
    </label>
    {message && <p className="fineprint">{message}</p>}
    <button className="tiny-button" disabled={loading}>{loading ? "Saving…" : current ? "Update post" : "Attach post"}</button>
  </form>;
}
