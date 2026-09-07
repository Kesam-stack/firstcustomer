import Link from "next/link";

export default function NotFound() {
  return <main className="shell narrow page-pad center-page">
    <h1>Not found.</h1>
    <p className="muted">This page does not exist, or the campaign is not public yet.</p>
    <div className="two-actions" style={{ justifyContent: "center", marginTop: 18 }}>
      <Link className="button launch-button" href="/">Back to the board</Link>
      <Link className="button" href="/create">List a bounty</Link>
    </div>
  </main>;
}
