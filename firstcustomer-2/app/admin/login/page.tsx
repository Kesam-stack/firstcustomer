import { redirect } from "next/navigation";
import { adminConfigured, isAdmin } from "@/lib/admin-auth";

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAdmin()) redirect("/admin");
  const { error } = await searchParams;
  const configured = adminConfigured();
  const message = error === "rate"
    ? "Too many attempts. Wait a few minutes."
    : error === "config"
      ? "Admin login is not configured."
      : error === "1"
        ? "Wrong password."
        : "";

  return <main className="narrow page-pad">
    <div className="admin-login">
      <span className="eyebrow">FirstCustomer</span>
      <h1>Admin</h1>
      {!configured && <div className="warning">Set <code>FC_ADMIN_PASSWORD</code> (at least 8 characters) and preferably <code>FC_ADMIN_SECRET</code> on Railway, then redeploy.</div>}
      {message && <div className="error">{message}</div>}
      <form className="launch-console" action="/api/admin/login" method="post">
        <label>
          Password
          <input name="password" type="password" required minLength={8} autoComplete="current-password" disabled={!configured} />
        </label>
        <button className="button launch-button full" disabled={!configured}>Sign in →</button>
      </form>
    </div>
  </main>;
}
