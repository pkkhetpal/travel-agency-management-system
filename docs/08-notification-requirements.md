# 08 – Notification requirements

## Channels

1. WhatsApp Business Platform through an approved provider.
2. Transactional email provider/SMTP service.
3. Indian SMS provider.

The business must own the provider accounts wherever possible. Provider subscriptions and message charges are operating expenses, not assumed to be included in software development.

## Events and recipients

| Event | Recipient |
|---|---|
| New enquiry | Assigned sales employee |
| Follow-up due | Assigned employee |
| Quotation sent | Customer |
| Package confirmed | Customer and operations |
| Receipt recorded | Customer; accounts log |
| Customer payment due | Customer and assigned employee |
| Supplier bill due | Accounts |
| Supplier payment recorded | Supplier, where appropriate |
| Flight/hotel/tour confirmed | Relevant guest/customer |
| Visa status update | Applicant/customer |
| Upcoming departure | Customer and tour manager |
| Itinerary updated/shared | Customer and operations |
| Trip completed | Customer feedback request |

## Template variables

Use an allow-listed variable registry, for example:
- customer_name
- package_id
- package_name
- destination
- travel_start_date
- travel_end_date
- guest_count
- payment_due
- receipt_number
- booking_reference
- itinerary_link
- company_name
- support_phone

Do not allow templates to read arbitrary database fields.

## Message lifecycle

- Draft/template.
- Scheduled.
- Queued.
- Submitted to provider.
- Sent/delivered/read where provider supports it.
- Failed.
- Retried/cancelled.

Persist provider message IDs and callback status. Webhooks must be authenticated, idempotent and replay-safe.

## Consent and privacy

- Record channel-specific customer opt-in and opt-out.
- Follow WhatsApp template/consent requirements and applicable Indian telecom/DLT rules for SMS.
- Support unsubscribe/do-not-contact controls.
- Do not send passport numbers, bank details, full payment credentials or sensitive identity documents in message body.
- Prefer secure, expiring document links with authentication or other suitable access controls.
- Keep communication history but apply a retention policy.

## Reliability

- Retry transient provider errors using bounded backoff.
- Do not retry invalid recipient/template/consent errors indefinitely.
- Avoid duplicate messages using event idempotency keys.
- Provide manual resend with permission and audit record.
- Show provider errors in an operations-friendly screen.
- Keep message sending asynchronous so provider downtime does not block package editing.

## Configuration

Store provider credentials in a secrets manager/environment configuration, not in the database as plaintext or in source control. Separate development/test and production provider accounts.
