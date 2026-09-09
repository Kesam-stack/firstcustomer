"use client";

import { useState } from "react";

type Block = { text: string; composeUrl?: string };
type Card = { id: string; title: string; note?: string; blocks: Block[] };

export default function PromoteConsole({ cards }: { cards: Card[] }) {
  const [copied, setCopied] = useState("");

  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((k) => (k === key ? "" : k)), 1500);
    } catch {
      setCopied("");
    }
  }

  return <div className="promote-console">
    {cards.map((card) => <section key={card.id} className="promote-card">
      <div className="promote-card-head">
        <h3>{card.title}</h3>
        {card.note && <p>{card.note}</p>}
      </div>
      {card.blocks.map((block, index) => {
        const key = `${card.id}-${index}`;
        const rows = Math.min(16, Math.max(3, block.text.split("\n").length + 1));
        return <div key={key} className="promote-block">
          <textarea className="promote-text" readOnly rows={rows} value={block.text} />
          <div className="promote-actions">
            <button type="button" className="button" onClick={() => copy(key, block.text)}>
              {copied === key ? "Copied" : "Copy"}
            </button>
            {block.composeUrl && <a className="button secondary" href={block.composeUrl} target="_blank" rel="noreferrer">Open in X composer</a>}
          </div>
        </div>;
      })}
    </section>)}
  </div>;
}
