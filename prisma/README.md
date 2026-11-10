# Database setup

The application uses PostgreSQL with Prisma ORM.

## Local setup

1. Install Node.js 20 LTS and PostgreSQL 15 or later.
2. Copy `.env.example` to `.env`.
3. Set `DATABASE_URL` to your local PostgreSQL connection string.
4. Run:

```bash
npm install
npm run db:generate
npm run db:migrate -- --name initial
```

5. Start the application with `npm run dev`.

## Data model notes

- Every operational record belongs to a company; company scoping must be applied in every query.
- Bookings represent individual travel services. A package can contain multiple bookings and suppliers.
- Supplier bills are separate from bookings because a supplier may invoice multiple services together.
- Customer receipts and supplier payments are separate records. Supplier payments can be allocated across bills.
- Amounts use fixed-precision decimals. Do not use JavaScript floating-point arithmetic for money.
- Currency and exchange-rate snapshots are stored on transactional records where applicable.
- GST invoice calculations and tax treatment require review against the agency's registration and applicable rules before production use.

## Before production

Add and test database migrations, transactional allocation validation, audit history, backup/restore, retention policies and tenant-isolation tests. Do not store passport scans or payment-card data in ordinary application fields.
