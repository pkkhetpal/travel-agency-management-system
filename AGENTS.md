# TravelDesk agent instructions

## Neon PostgreSQL

This project uses the existing Neon PostgreSQL project as its application database. Do not create a second database or replace the existing Neon project without explicit approval.

### First-time agent setup
- From the repository root, run `npx neon@latest init` in an interactive coding-agent terminal and select the existing Neon project for this application.
- Install Neon's current `neon-postgres` agent skill and hosted Neon MCP server as part of setup. If the CLI offers a plugin for the active coding agent, prefer the official Neon plugin; otherwise install skills and MCP separately.
- Authenticate through Neon's OAuth flow. Never ask the user to paste a Neon API key or database password into chat, source files, commits, or logs.
- If setup has already been completed, refresh the skills with `npx neon@latest skills update` (or the current equivalent shown by `neon --help`).
- The hosted Neon MCP endpoint is `https://mcp.neon.tech/mcp`. Use OAuth where supported. Treat Neon MCP as a development tool: review every requested operation and use least privilege.

### Branch-first database workflow
- Keep the production database branch separate from development and preview branches.
- For each feature, create or select a matching Neon development branch with `neon checkout <feature-name>` alongside the Git feature branch.
- Use the branch-scoped connection string for local/preview work. Never point preview deployments at production data.
- Keep `.env`, `.env.local`, `.neon`, API keys, and database URLs out of Git. Use the hosting provider's encrypted environment variables for deployments.
- Before changing Prisma schema or applying migrations, inspect the active Neon project and branch. Use `neon diff` to review schema differences before applying or merging changes.
- Prefer reviewed Prisma migrations for schema changes. Do not use destructive schema resets or `prisma db push` against production.
- Use `neon inspect db` for read-only diagnostics. Back up or create a Neon branch before risky data changes.
- Never run destructive SQL, drop/truncate tables, delete production data, rotate credentials, or change production branch settings without explicit user approval.

### TravelDesk application rules
- The application uses Prisma with PostgreSQL. Keep `prisma/schema.prisma` as the schema source of truth and preserve tenant isolation by scoping every business-data query to the authenticated `companyId`.
- Do not expose database credentials to the browser. All database access must remain server-side.
- Use Asia/Kolkata as the default agency timezone and INR as the default currency, while preserving per-record currency and exchange-rate snapshots.
- Treat receipts and supplier payments as allocated transactions; do not double-count booking supplier costs and supplier bills.
- Never use sample/demo records as real customer or financial data.
- Do not claim a module is live until its database-backed create, read, update, delete, authorization, and error paths have been tested.
- Do not merge to `main` or promote a deployment to production without explicit user approval.
