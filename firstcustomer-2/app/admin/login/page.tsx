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
        ? "Wrong username or password."
        : "";

  return <main className="narrow page-pad">
    <div className="admin-login">
      <span className="eyebrow">FirstCustomer</span>
      <h1>Admin</h1>
      {!configured && <div className="warning">Set <code>FC_ADMIN_USERNAME</code>, <code>FC_ADMIN_PASSWORD_HASH</code>, and <code>FC_ADMIN_SESSION_SECRET</code> on Railway, then redeploy.</div>}
      {message && <div className="error">{message}</div>}
      <form className="launch-console" action="/api/admin/login" method="post">
        <label>
          Username
          <input name="username" required autoComplete="username" disabled={!configured} />
        </label>
        <label>
          Password
          <input name="password" type="password" required autoComplete="current-password" disabled={!configured} />
        </label>
        <button className="button launch-button full" disabled={!configured}>Sign in →</button>
      </form>
    </div>
  </main>;
}
