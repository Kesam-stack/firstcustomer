import { query } from "@/lib/db";
import { config } from "@/lib/config";
import { sendTransactionalEmail } from "@/lib/email";
import { money } from "@/lib/format";

export async function matchCampaignToNetwork(bountyId: string) {
  const result = await query<{ member_id: string; score: number }>(
    `INSERT INTO campaign_matches (bounty_id, member_id, score, reason)
     SELECT b.id,
            m.id,
            (CASE WHEN b.category = ANY(m.categories) THEN 55 WHEN 'All' = ANY(m.categories) OR cardinality(m.categories)=0 THEN 30 ELSE 0 END)
            + CASE WHEN b.payment_verified THEN 20 ELSE 0 END
            + LEAST(20, GREATEST(1, b.reward_cents / 500))
            + CASE WHEN b.created_at >= NOW() - INTERVAL '7 days' THEN 5 ELSE 0 END AS score,
            CASE
              WHEN b.category = ANY(m.categories) THEN 'Matches your ' || b.category || ' interests'
              ELSE 'Open network opportunity'
            END AS reason
       FROM bounties b
       JOIN network_members m ON m.status='active'
      WHERE b.id=$1
        AND b.status='active'
        AND b.network_distribution=TRUE
        AND (cardinality(m.categories)=0 OR b.category = ANY(m.categories) OR 'All' = ANY(m.categories))
     ON CONFLICT (bounty_id, member_id)
     DO UPDATE SET score=EXCLUDED.score, reason=EXCLUDED.reason
     RETURNING member_id,score`,
    [bountyId],
  );

  await query(
    `UPDATE bounties
        SET network_matched_count=(SELECT COUNT(*)::int FROM campaign_matches WHERE bounty_id=$1),
            last_network_match_at=NOW()
      WHERE id=$1`,
    [bountyId],
  );
  return result.rows;
}

export async function matchMemberToCampaigns(memberId: string) {
  const result = await query<{ bounty_id: string; score: number }>(
    `INSERT INTO campaign_matches (bounty_id, member_id, score, reason)
     SELECT b.id,
            m.id,
            (CASE WHEN b.category = ANY(m.categories) THEN 55 WHEN 'All' = ANY(m.categories) OR cardinality(m.categories)=0 THEN 30 ELSE 0 END)
            + CASE WHEN b.payment_verified THEN 20 ELSE 0 END
            + LEAST(20, GREATEST(1, b.reward_cents / 500))
            + CASE WHEN b.created_at >= NOW() - INTERVAL '7 days' THEN 5 ELSE 0 END,
            CASE
              WHEN b.category = ANY(m.categories) THEN 'Matches your ' || b.category || ' interests'
              ELSE 'Open network opportunity'
            END
       FROM network_members m
       JOIN bounties b ON b.status='active' AND b.network_distribution=TRUE AND b.approved_count<b.goal_count
      WHERE m.id=$1
        AND m.status='active'
        AND (cardinality(m.categories)=0 OR b.category = ANY(m.categories) OR 'All' = ANY(m.categories))
     ON CONFLICT (bounty_id, member_id)
     DO UPDATE SET score=EXCLUDED.score, reason=EXCLUDED.reason
     RETURNING bounty_id,score`,
    [memberId],
  );
  return result.rows;
}

export async function distributeCampaign(bountyId: string) {
  const matches = await matchCampaignToNetwork(bountyId);
  const notification = await notifyTopNetworkMatches(bountyId);
  return { matched: matches.length, notified: notification.sent };
}

export async function notifyTopNetworkMatches(bountyId: string) {
  if (!process.env.RESEND_API_KEY || config.networkNotificationLimit === 0) return { sent: 0 };

  const r = await query<{
    email: string;
    display_name: string;
    member_id: string;
    company_name: string;
    headline: string;
    reward_cents: number;
    slug: string;
  }>(
    `SELECT m.email,m.display_name,m.id member_id,b.company_name,b.headline,b.reward_cents,b.slug
       FROM campaign_matches cm
       JOIN network_members m ON m.id=cm.member_id
       JOIN bounties b ON b.id=cm.bounty_id
      WHERE cm.bounty_id=$1 AND cm.status='offered' AND m.email_alerts=TRUE
      ORDER BY cm.score DESC,cm.created_at ASC
      LIMIT $2`,
    [bountyId, config.networkNotificationLimit],
  );

  const results = await Promise.allSettled(
    r.rows.map((row) =>
      sendTransactionalEmail({
        to: row.email,
        subject: `${money(row.reward_cents)} customer mission from ${row.company_name}`,
        idempotencyKey: `campaign-match/${bountyId}/${row.member_id}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#101828">
          <p>Hi ${escapeHtml(row.display_name)},</p>
          <h2 style="margin-bottom:8px">${escapeHtml(row.headline)}</h2>
          <p><strong>${money(row.reward_cents)}</strong> per approved customer.</p>
          <p>This campaign was matched to you by the FirstCustomer Network. The company does not need to post it publicly for you to discover it.</p>
          <p><a href="${config.appUrl}/b/${encodeURIComponent(row.slug)}" style="display:inline-block;background:#155eef;color:white;padding:12px 18px;border-radius:8px;text-decoration:none">View mission</a></p>
        </div>`,
      }),
    ),
  );

  return { sent: results.filter((x) => x.status === "fulfilled" && x.value.sent).length };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] || char);
}
