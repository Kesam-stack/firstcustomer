import { config } from "@/lib/config";

export async function sendTransactionalEmail(args: {
  to: string;
  subject: string;
  html: string;
  idempotencyKey?: string;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false as const, reason: "not_configured" as const };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
      ...(args.idempotencyKey ? { "Idempotency-Key": args.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from: config.emailFrom,
      to: [args.to],
      subject: args.subject,
      html: args.html,
    }),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    console.error("Email send failed", response.status, detail);
    return { sent: false as const, reason: "provider_error" as const };
  }

  const data = (await response.json()) as { id?: string };
  return { sent: true as const, id: data.id || null };
}
