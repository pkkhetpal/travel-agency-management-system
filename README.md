# Travel Agency Management System

A simple, cloud-hosted travel operations system for a small B2C travel agency or tour operator (initially 1–10 employees).

## Project decisions

| Area | Decision |
|---|---|
| Business | Tour operator / travel agency |
| Customers | B2C |
| Platforms | Responsive web application + installable PWA |
| Initial users | 1–10 |
| Travel categories | International, domestic, group, customized, corporate, honeymoon, hotel-only, visa and cruise |
| Base currency | INR, with foreign currencies as needed |
| Package structure | One package can contain many bookings and suppliers |
| Finance | Package-level receivables and payables; not a full general ledger |
| Tax | Configurable GST fields and invoice support |
| Notifications | WhatsApp Business, email and SMS |
| Hosting | Cloud |

## Repository layout

- `docs/` — requirements, architecture, UI inventory, API, finance, notifications, testing and delivery plan.
- `database/` — PostgreSQL starter schema and implementation notes.
- `project-management/` — phased work plan, milestones and change control.
- `frontend/`, `backend/`, `mobile-pwa/` — application code locations for implementation.

## Current status

This repository starts with the approved product specification and a logical database starter. It is **not yet a deployed or production-ready application**. The SQL schema is a starting point and must be reviewed, completed with migrations, indexes, constraints and tests before production use.

## Recommended implementation sequence

1. Review and sign off the SRS and data model.
2. Finalize UI wireframes and workflow acceptance criteria.
3. Implement authentication, roles and master data.
4. Implement enquiries, quotations and packages.
5. Implement guests, bookings and suppliers.
6. Implement receipts, supplier bills, allocations, currency and GST.
7. Implement itinerary, documents and notifications.
8. Implement reports, testing, deployment, backups and handover.

## Security baseline

Never commit credentials, API keys, production customer data, passport scans, bank details, or real invoices to this repository. Use environment variables or a secrets manager and private object storage for uploaded documents.

See [Project documentation](docs/README.md) for the specification index.
