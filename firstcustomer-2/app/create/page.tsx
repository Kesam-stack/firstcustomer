import CreateBountyForm from "@/components/CreateBountyForm";

export default function CreatePage() {
  return (
    <main className="shell narrow page-pad">
      <div className="eyebrow">LAUNCH YOUR BOUNTY</div>
      <h1 className="page-title">What is a new customer worth to you?</h1>
      <p className="muted lead">You pay FirstCustomer a $9 launch fee. You keep control of customer verification and pay referrers directly.</p>
      <CreateBountyForm />
    </main>
  );
}
