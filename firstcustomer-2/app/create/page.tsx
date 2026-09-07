import CreateBountyForm from "@/components/CreateBountyForm";
import { config, launchFeeDollars, platformFeePercent } from "@/lib/config";

export default function Create() {
  return <main className="narrow page-pad"><div className="page-heading"><span>FOR COMPANIES</span><h1>Launch a customer mission.</h1><p>Define the outcome, reward and eligibility once. FirstCustomer publishes it, routes it through the network, tracks referrals, and records verified conversion economics.</p></div><CreateBountyForm launchFeeDollars={launchFeeDollars} platformFeePercent={platformFeePercent} minimumRewardDollars={config.minimumRewardCents / 100} /></main>;
}
