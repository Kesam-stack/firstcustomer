# Security notes

This repository is an MVP, not a production-complete marketplace.

## Deliberate boundaries

- FirstCustomer charges only its own $9 launch fee.
- It does not hold, escrow, transmit, or automatically split referral-reward funds.
- Founders verify conversions and pay referrers directly.
- Founder dashboard access uses an opaque high-entropy secret URL in this MVP.

## Before production scale

1. Replace owner-secret URLs with authenticated founder accounts and short-lived sessions.
2. Add rate limiting and bot protection to all mutation endpoints.
3. Add CSRF/origin controls where appropriate.
4. Add email verification and campaign moderation.
5. Add structured audit logs for conversion approvals/reversals.
6. Encrypt or minimize personally identifying data and define retention/deletion controls.
7. Add secret rotation, managed infrastructure, backups, observability, and alerting.
8. Add tests for tenant/owner authorization on every management endpoint.
9. Have counsel review referral, advertising, tax, privacy, and prohibited-category obligations.
10. If platform-managed payouts are ever added, use an appropriate marketplace payments architecture and obtain legal/compliance review before custodying funds.
