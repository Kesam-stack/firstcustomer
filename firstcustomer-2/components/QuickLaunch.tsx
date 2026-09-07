"use client";

import { FormEvent } from "react";

export default function QuickLaunch({ minimumRewardDollars }: { minimumRewardDollars: number }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const url = String(form.get("productUrl") || "").trim();
    const reward = String(form.get("reward") || minimumRewardDollars);
    const goal = String(form.get("goal") || 10);
    const params = new URLSearchParams({ url, reward, goal });
    location.href = `/create?${params.toString()}`;
  }

  return <form className="board-launch" onSubmit={submit}>
    <label>
      Product URL
      <input name="productUrl" required inputMode="url" placeholder="yourcompany.com" autoComplete="url" />
    </label>
    <label>
      Per customer
      <div className="money-input"><span>$</span><input name="reward" required min={minimumRewardDollars} defaultValue={Math.max(50, minimumRewardDollars)} type="number" /></div>
    </label>
    <label>
      Wanted
      <input name="goal" required min="1" max="10000" defaultValue="10" type="number" />
    </label>
    <button className="button launch-button">List bounty →</button>
  </form>;
}
