import {notFound} from "next/navigation";
import Link from "next/link";
import {getReferralByCode,query} from "@/lib/db";
import {hashToken,safeEqualHex} from "@/lib/security";
import {money} from "@/lib/format";
import SourcePostForm from "@/components/SourcePostForm";
import {config} from "@/lib/config";

export const dynamic="force-dynamic";

export default async function Page({params,searchParams}:{params:Promise<{code:string}>,searchParams:Promise<{key?:string}>}){
  const{code}=await params,{key}=await searchParams;
  if(!key)notFound();
  const auth=await query<{manage_secret_hash:string|null}>("SELECT manage_secret_hash FROM referrals WHERE code=$1",[code]);
  if(!auth.rows[0]?.manage_secret_hash||!safeEqualHex(auth.rows[0].manage_secret_hash,hashToken(key)))notFound();
  let r=await getReferralByCode(code);
  if(!r)notFound();

  if(r.stripe_account_id&&process.env.STRIPE_SECRET_KEY){
    try{
      const {stripe}=await import("@/lib/stripe");
      const a=await stripe().accounts.retrieve(r.stripe_account_id);
      const enabled=Boolean(a.payouts_enabled&&a.charges_enabled!==false);
      if(enabled!==r.payouts_enabled){
        await query("UPDATE referrals SET payouts_enabled=$2 WHERE id=$1",[r.id,enabled]);
        r={...r,payouts_enabled:enabled};
      }
    }catch{}
  }

  const rainmaker=r.global_approved>=config.rainmakerThreshold;
  const shareText=encodeURIComponent("I earned "+money(r.paid_cents)+" through FirstCustomer referrals for "+r.company_name+". Proof is on the public ledger.");
  return <main className="narrow page-pad">
    <div className="page-heading">
      <span className="eyebrow">Referrer</span>
      <h1>@{r.x_handle}</h1>
      <p>{r.company_name} · {r.headline}</p>
      {rainmaker&&<div className="rainmaker-profile">Rainmaker · {r.global_approved} approved customers</div>}
    </div>
    <div className="stats">
      <div><span>Clicks</span><strong>{r.clicks}</strong></div>
      <div><span>Approved</span><strong>{r.approved_conversions}</strong></div>
      <div><span>Earned</span><strong>{money(r.earned_cents)}</strong></div>
      <div><span>Paid</span><strong>{money(r.paid_cents)}</strong></div>
    </div>
    {r.payout_mode==="stripe"
      ?<div className={r.payouts_enabled?"notice":"warning"}>{r.payouts_enabled?"Stripe payout account ready.":"Complete Stripe onboarding before an automatic reward can be transferred."}</div>
      :<div className="warning">This campaign uses manual payouts. The company is responsible for paying approved rewards.</div>}
    {r.payout_mode==="stripe"&&!r.payouts_enabled&&<form action={"/api/referrals/"+encodeURIComponent(code)+"/payouts?key="+encodeURIComponent(key)} method="post"><button className="button launch-button full">Set up Stripe payouts →</button></form>}
    <div className="share-strip" style={{marginTop:18}}><span>Referral code</span><code>{r.code}</code></div>
    <SourcePostForm code={code} secret={key} current={r.source_post_url || null} />
    {r.paid_cents>0&&<div className="two-actions" style={{marginTop:14}}><Link className="button secondary" href="/ledger">View proof on ledger</Link><a className="button secondary" target="_blank" rel="noreferrer" href={"https://x.com/intent/post?text="+shareText}>Share payout on X</a></div>}
    <p className="fineprint">Keep this dashboard URL private. It controls payout onboarding for this referral.</p>
  </main>;
}
