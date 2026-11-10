# Database implementation

- Database target: PostgreSQL.
- Starter DDL: [schema.sql](schema.sql).
- Base currency: INR.
- Use migrations in a framework-appropriate migration tool; do not rely on manually editing production schema.
- Do not run the starter SQL against production without review.

## Important

The current SQL file is a **starter schema**. The implementation team must complete:
- all foreign-key references and table dependencies,
- role/user permission model,
- company and financial-year scoping,
- indexes and uniqueness rules,
- allocation constraints and transactional locking,
- invoice numbering concurrency,
- guest/booking document access controls,
- detailed booking type tables,
- soft deletion and audit controls,
- migration and rollback scripts,
- automated tests.

Financial types must be NUMERIC. Never use floating point for money.

The application must ensure supplier bill costs are not double-counted with booking cost estimates in package profitability reports.
