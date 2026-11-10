# TravelDesk — Travel Agency Management System

A simple, cloud-hosted travel operations system for a small B2C travel agency or tour operator (initially 1–10 employees).

## Project decisions

| Area | Decision |
|---|---|
| Business | B2C travel agency / tour operator |
| Platforms | Responsive web application; PWA readiness planned |
| Initial users | 1–10 |
| Travel categories | International, domestic, group, customized, corporate, honeymoon, hotel-only, visa and cruise |
| Base currency | INR, with foreign currencies supported |
| Package structure | One package can contain multiple bookings and suppliers |
| Finance | Package-level receivables and payables; not a full general ledger |
| Tax | GST fields and invoice support; tax treatment requires CA validation |
| Notifications | WhatsApp Business, email and SMS (provider setup pending) |
| Hosting | Cloud deployment planned |

## Repository layout

- `src/` — Next.js application source and shared components.
- `prisma/` — PostgreSQL Prisma schema and database setup notes.
- `docs/` — requirements, architecture, workflows, finance, notifications and testing.
- `database/` — original logical SQL starter.
- `project-management/` — milestones and development tasks.

## Current development status

The `feature/app-foundation` branch contains:
- Responsive dashboard and shared navigation shell.
- Initial module pages for enquiries, quotations, packages, customers, bookings, suppliers, itineraries, finance, reports and settings.
- Next.js 14 / React / TypeScript project configuration.
- Prisma PostgreSQL data model for core operational records.
- Database setup notes and environment variable template.

**Important:** these pages currently use illustrative sample data. Database migrations have not yet been applied; authentication, working create/edit workflows, integrations, automated tests and production deployment are still to be implemented. Do not use this build for live customer or financial records.

## Local development setup

Requirements: Node.js 20 LTS and PostgreSQL 15+.

1. Clone the repository and check out `feature/app-foundation`.
2. Install dependencies: `npm install`.
3. Copy `.env.example` to `.env` and set `DATABASE_URL`.
4. Generate the Prisma client: `npm run db:generate`.
5. Create the initial local migration: `npm run db:migrate -- --name initial`.
6. Start the development server: `npm run dev`.
7. Open `http://localhost:3000`.

See [prisma/README.md](prisma/README.md) for database details and [docs/README.md](docs/README.md) for the product specification.

## Planned implementation sequence

1. Complete database migrations, validation and seed/demo data.
2. Implement secure login, password reset, roles and company isolation.
3. Implement customer and supplier create/edit/detail workflows.
4. Implement enquiry → quotation → package conversion.
5. Implement guests, multiple service bookings, supplier records and itinerary.
6. Implement receipts, supplier bills, payment allocations, currencies and GST invoices.
7. Implement notifications, reports, audit trail and document storage.
8. Run automated tests, security review, deployment, backup/restore and handover.

## Security baseline

Never commit credentials, API keys, production customer data, passport scans, bank details or real invoices. Use environment variables or a secrets manager. Store uploaded travel documents in private object storage with access controls. Enforce company scoping in every database query and test tenant isolation before production.
