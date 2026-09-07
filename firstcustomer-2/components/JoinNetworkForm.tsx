"use client";

import { FormEvent, useState } from "react";

const categories = ["All", "Software", "Artificial Intelligence", "Fintech", "Consumer", "Marketplace", "Professional Services"];
const channels = ["X", "LinkedIn", "Newsletter", "Community", "Direct introductions", "YouTube / Podcast"];

export default function JoinNetworkForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      displayName: form.get("displayName"),
      email: form.get("email"),
      xHandle: form.get("xHandle"),
      bio: form.get("bio"),
      country: form.get("country"),
      audienceSize: form.get("audienceSize"),
      categories: form.getAll("categories"),
      channels: form.getAll("channels"),
      emailAlerts: form.get("emailAlerts") === "on",
    };

    try {
      const response = await fetch("/api/network/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not join the network");
      location.href = data.dashboardUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return <form className="form-card" onSubmit={submit}>
    <div className="two-col">
      <label>Your name<input name="displayName" required maxLength={80} placeholder="Kevin Ngeno" /></label>
      <label>Email<input name="email" required type="email" placeholder="you@email.com" /></label>
    </div>
    <div className="two-col">
      <label>X handle<input name="xHandle" required maxLength={30} placeholder="@yourhandle" /></label>
      <label>Country <span>(optional)</span><input name="country" maxLength={60} placeholder="United States" /></label>
    </div>
    <label>How do you reach potential customers?<textarea name="bio" maxLength={280} rows={3} placeholder="I write about AI and fintech and make direct introductions to startup teams." /></label>
    <label>Approximate audience / network size <span>(0 is fine — direct introductions count)</span><input name="audienceSize" type="number" min="0" max="1000000000" defaultValue="0" /></label>

    <fieldset className="choice-group"><legend>What do you want to refer?</legend><div className="choice-grid">{categories.map((category) => <label className="choice" key={category}><input type="checkbox" name="categories" value={category} defaultChecked={category === "All"} /><span>{category}</span></label>)}</div></fieldset>
    <fieldset className="choice-group"><legend>Your distribution channels</legend><div className="choice-grid">{channels.map((channel) => <label className="choice" key={channel}><input type="checkbox" name="channels" value={channel} /><span>{channel}</span></label>)}</div></fieldset>
    <label className="inline-check"><input type="checkbox" name="emailAlerts" defaultChecked /> Alert me when a high-fit paid mission enters the network.</label>

    {error && <div className="error">{error}</div>}
    <button className="button primary full" disabled={loading}>{loading ? "Building your mission feed…" : "Join the FirstCustomer Network →"}</button>
    <p className="fineprint">Joining is free. You choose which campaigns to claim. Rewards are earned only on conversions that satisfy the published company criteria.</p>
  </form>;
}
