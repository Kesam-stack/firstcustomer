import { query } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function attemptAutomaticPayout(conversionId:string){
  const r=await query<any>(`SELECT c.id,c.reward_cents,c.payout_status,b.company_name,b.stripe_customer_id,b.stripe_payment_method_id,b.platform_fee_bps,b.payout_mode,r.id referral_id,r.stripe_account_id,r.payouts_enabled FROM conversion_claims c JOIN bounties b ON b.id=c.bounty_id JOIN referrals r ON r.id=c.referral_id WHERE c.id=$1`,[conversionId]);
  const row=r.rows[0]; if(!row) throw new Error("Conversion not found");
  if(row.payout_status==="paid") return {status:"paid"};
  if(row.payout_mode!=="stripe" || !process.env.STRIPE_SECRET_KEY){await query("UPDATE conversion_claims SET payout_status='not_configured' WHERE id=$1",[conversionId]);return {status:"not_configured"};}
  if(!row.stripe_customer_id||!row.stripe_payment_method_id){await query("UPDATE conversion_claims SET payout_status='payment_pending', payout_error='Company payment method is not ready' WHERE id=$1",[conversionId]);return {status:"payment_pending"};}
  if(!row.stripe_account_id||!row.payouts_enabled){await query("UPDATE conversion_claims SET payout_status='payment_pending', payout_error='Referrer payout account is not ready' WHERE id=$1",[conversionId]);return {status:"payment_pending"};}
  const fee=Math.ceil(row.reward_cents*row.platform_fee_bps/10000);
  await query("UPDATE conversion_claims SET payout_status='processing', platform_fee_cents=$2,payout_error=NULL WHERE id=$1",[conversionId,fee]);
  try{
    const pi=await stripe().paymentIntents.create({amount:row.reward_cents+fee,currency:"usd",customer:row.stripe_customer_id,payment_method:row.stripe_payment_method_id,off_session:true,confirm:true,description:`FirstCustomer reward for ${row.company_name}`,metadata:{conversion_id:conversionId,kind:"referral_reward"}});
    const charge=typeof pi.latest_charge==="string"?pi.latest_charge:null;
    if(!charge) throw new Error("Payment succeeded without a charge reference");
    const transfer=await stripe().transfers.create({amount:row.reward_cents,currency:"usd",destination:row.stripe_account_id,source_transaction:charge,transfer_group:`fc_${conversionId}`,metadata:{conversion_id:conversionId}});
    await query("UPDATE conversion_claims SET payout_status='paid',stripe_payment_intent_id=$2,stripe_transfer_id=$3,paid_at=NOW(),payout_error=NULL WHERE id=$1",[conversionId,pi.id,transfer.id]);
    await query("UPDATE referrals SET paid_cents=paid_cents+$2 WHERE id=$1",[row.referral_id,row.reward_cents]);
    await query("INSERT INTO payout_events(conversion_id,event_type,detail) VALUES($1,'paid',$2)",[conversionId,transfer.id]);
    return {status:"paid",transferId:transfer.id};
  }catch(e){const message=e instanceof Error?e.message:"Automatic payout failed";await query("UPDATE conversion_claims SET payout_status='failed',payout_error=$2 WHERE id=$1",[conversionId,message.slice(0,500)]);await query("INSERT INTO payout_events(conversion_id,event_type,detail) VALUES($1,'failed',$2)",[conversionId,message.slice(0,500)]);return {status:"failed",error:message};}
}
