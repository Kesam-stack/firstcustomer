# FirstCustomer Conversion API

Companies can report conversions programmatically and then approve them from the company dashboard.

## Attribution

Visitors arriving from FirstCustomer are redirected to the company's product with:

- `fc_ref=<referral_code>`
- `utm_source=firstcustomer`
- `utm_medium=referral`
- `utm_campaign=<company-slug>`

Persist `fc_ref` with the visitor/customer record.

## Report a conversion

`POST /api/v1/conversions`

Headers:

```http
Authorization: Bearer fc_live_...
Content-Type: application/json
```

Body:

```json
{
  "campaign": "acme-a1b2c3",
  "referral_code": "ABC123",
  "customer_reference": "crm_customer_9281",
  "event_id": "signup_9281"
}
```

The endpoint is idempotent by `event_id` per campaign. Reported events are recorded as `pending`; the company remains responsible for approval under its published criteria.

## Automatic payout lifecycle

1. Company launches with Stripe and a reusable payment method is saved for off-session rewards.
2. Referrer connects a Stripe Express account.
3. A conversion is reported or manually entered.
4. Company approves it.
5. FirstCustomer charges `reward + platform fee`.
6. The advertised reward is transferred to the connected referrer.
7. The company dashboard records the payout state and Stripe transfer ID.

If either side is not payout-ready, the conversion remains visible as `payment_pending`, `not_configured`, or `failed` rather than being silently treated as paid.
