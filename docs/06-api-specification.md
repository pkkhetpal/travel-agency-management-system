# 06 – Initial REST API specification

This is a proposed API surface. Final request/response JSON schemas, validation rules and OpenAPI document must be produced by the implementing team.

## Conventions

- Prefix: `/api/v1`.
- JSON requests/responses.
- Authentication required except login/health endpoints.
- Server-side authorization on every operation.
- UUID identifiers.
- Pagination: `page`, `page_size`; bounded page size.
- Filters and sorting must be allow-listed.
- Standard error structure: `{ "error": { "code": "...", "message": "...", "details": [] } }`.
- Use idempotency keys for payment recording, invoice issue and provider webhook processing.
- Use optimistic concurrency/version fields for editable records where appropriate.

## Suggested endpoint groups

| Resource | Endpoints |
|---|---|
| Auth | POST /auth/login, POST /auth/logout, POST /auth/password/forgot, POST /auth/password/reset |
| Users | GET/POST /users, GET/PATCH /users/{id}, GET/PUT /roles/{id} |
| Customers | GET/POST /customers, GET/PATCH /customers/{id} |
| Enquiries | GET/POST /enquiries, GET/PATCH /enquiries/{id}, POST /enquiries/{id}/followups |
| Quotations | GET/POST /quotations, GET/PATCH /quotations/{id}, POST /quotations/{id}/send, POST /quotations/{id}/accept |
| Packages | GET/POST /packages, GET/PATCH /packages/{id}, POST /packages/{id}/confirm, POST /packages/{id}/complete |
| Guests | GET/POST /packages/{id}/guests, GET/PATCH /guests/{id} |
| Bookings | GET/POST /packages/{id}/bookings, GET/PATCH /bookings/{id}, POST /bookings/{id}/status |
| Suppliers | GET/POST /suppliers, GET/PATCH /suppliers/{id} |
| Receipts | GET/POST /receipts, POST /receipts/{id}/allocations |
| Supplier bills | GET/POST /supplier-bills, POST /supplier-bills/{id}/allocations |
| Supplier payments | GET/POST /supplier-payments, POST /supplier-payments/{id}/allocations |
| Currencies | GET /currencies, GET/POST /exchange-rates |
| Invoices | GET/POST /invoices, POST /invoices/{id}/issue, POST /invoices/{id}/credit-notes |
| Itineraries | GET/POST /packages/{id}/itinerary-days, PATCH /itinerary-days/{id} |
| Documents | GET/POST /documents, GET /documents/{id}/download-url |
| Notifications | GET/POST /notifications, GET/POST /notification-templates |
| Reports | GET /reports/dashboard, GET /reports/receivables, GET /reports/payables, GET /reports/profitability |

## Important API rules

1. Never accept a client-supplied INR total without recalculating/validating it server-side.
2. Check allocation balances within a database transaction and lock affected rows.
3. Invoice sequence allocation must be concurrency-safe.
4. Do not permit edits to issued invoice snapshots; use reversal/credit workflows.
5. Validate currency codes, exchange-rate direction and positive rates.
6. Authorize access to guest/passport documents separately.
7. Do not expose raw cloud-storage keys; return short-lived signed URLs after permission check.
8. Validate webhook signatures and deduplicate provider event IDs.
9. Avoid logging credentials, passport data, bank details or full message content containing sensitive data.
10. Publish a versioned OpenAPI 3 specification before frontend integration.
