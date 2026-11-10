# 05 – Development roadmap

Indicative initial timeline: 8–10 weeks for an experienced small team, subject to integration access, design approvals, test feedback and scope control. This is a planning estimate, not a guaranteed delivery promise.

## Phase 0 – Discovery and sign-off (Week 1)
- Review SRS and resolve open decisions.
- Confirm company/invoice details and GST workflow with CA.
- Confirm notification providers and account ownership.
- Produce UI wireframes and ERD.
- Establish environments, coding standards and acceptance tests.

**Gate:** SRS, wireframes, ERD and backlog approved.

## Phase 1 – Platform foundation (Week 2)
- Project scaffold and CI checks.
- Authentication, users, roles and permissions.
- Company settings, numbering service and master data.
- Database migrations and seed/reference data.

**Gate:** Secure sign-in and permission tests pass.

## Phase 2 – Sales workflow (Week 3)
- Customers.
- Enquiries and follow-ups.
- Quotations, versioning, PDF and status.
- Conversion into package.

**Gate:** Enquiry-to-package workflow passes.

## Phase 3 – Package operations (Weeks 4–5)
- Package workspace.
- Guests and room assignments.
- Flight, hotel, tours, transfer, visa and cruise records.
- Supplier master and booking-supplier allocations.
- Booking status history and document links.

**Gate:** Multiple bookings and multiple suppliers under one package demonstrated.

## Phase 4 – Finance and tax (Week 6)
- Customer receipts and allocation.
- Supplier bills and allocation.
- Supplier payments and allocation.
- Unallocated advances, refunds/reversals.
- Currency history and INR equivalents.
- GST configuration and invoice output.

**Gate:** Reconciliation tests pass and tax format is CA-reviewed.

## Phase 5 – Itinerary and communication (Week 7)
- Itinerary editor and revision history.
- PDF output and document centre.
- WhatsApp, email and SMS provider adapters.
- Templates, scheduling, webhooks and delivery logs.

**Gate:** End-to-end document and messaging test passes.

## Phase 6 – Reports and release readiness (Week 8)
- Dashboard and core operational/financial reports.
- Excel/PDF export.
- Responsive/PWA refinements.
- Security, performance and accessibility checks.

## Phase 7 – UAT, deployment and handover (Weeks 9–10)
- User acceptance test with representative packages.
- Bug fixes and regression.
- Production cloud setup, TLS, secrets and monitoring.
- Automated backup and restore drill.
- Employee training and user guide.
- Source code, migration, deployment and integration handover.

**Gate:** Acceptance checklist signed; open defects documented.

## Suggested team

- Product owner/business representative: 1 part-time.
- UI/UX designer: 1 part-time during discovery.
- Full-stack/backend developer: 1–2.
- Frontend developer: 1 (may be combined with full-stack role).
- QA tester: 1 part-time, increasing near UAT.
- Cloud/DevOps support: part-time.
- CA/tax reviewer: required for GST review.

## Scope control

Any new feature or change after sign-off must include:
- Description and reason.
- Screens/modules affected.
- Database/API impact.
- Security/tax/privacy impact.
- Effort and schedule effect.
- Approval by product owner before implementation.
