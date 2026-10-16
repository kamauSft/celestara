# Chama AI — Phase 1

Foundation for a multi-tenant savings-group ledger. This phase has the database, tenant isolation, phone-and-PIN sign-in, the deterministic finance engine, and a seeded demo chama. Later phases add the full web app and the agents.

Money is stored as integer cents. Interest rates are basis points (`1000` = 10% per month). The finance functions in `lib/finance` do the maths; nothing in this phase asks a model to calculate a balance.

## Demo logins

Umoja Savings Group, Nairobi. Every seeded member uses PIN **2580**. This is demo data.

| Person | Role | Phone |
|---|---|---|
| Grace Wanjiku Mwangi | Chair | 0712 345 001 |
| Peter Otieno Omondi | Treasurer | 0712 345 002 |
| Amina Hassan Bakari | Member | 0712 345 005 |

Officials also need a one-time SMS code. Locally, with `DEMO_OTP_VISIBLE=true`, the login screen shows that code. Turn the flag off before any real deployment.

The books run from May 2025 through 16 October 2026: 20 members, 15 loans (9 repaid, 4 active, 1 defaulted with guarantors, 1 rejected), fines, expenses, two welfare payouts, monthly meetings, two polls, and three unmatched M-Pesa receipts.

## Run it

```bash
cd chama-ai
cp .env.example .env
npm install
npx prisma db push
npm run seed
npm run dev
```

Open http://localhost:3000 and sign in as Amina. Her page shows savings, loan balance, fines, arrears, and whether the audit chain is intact.

```bash
npm test
npm run test:coverage
```

`lib/finance` is held at 100% line, branch, function, and statement coverage.

## What is enforced

- Every chama-scoped query on the extended Prisma client requires a tenant context. A member can load their own position; another member's records are rejected. A platform admin can see billing, and chama financial rows only when `supportAccess` is set.
- Contributions, repayments, expenses, and the audit log cannot be edited or deleted through that client. Corrections are new reversal rows.
- Postgres row-level security for the same tables is in `prisma/rls.sql`. Local development uses SQLite, which cannot apply that file. Point `DATABASE_URL` at Postgres and run the SQL as the migration owner before production traffic. The application role must not bypass RLS.
- PINs are Argon2id. Five failed attempts lock the phone for 15 minutes. Officials need a 5-minute SMS code. Sessions idle out after 30 minutes, and a member can revoke every device.
- The audit log is append-only and hash-chained. The home page reports whether the chain still verifies.

## Layout

- `prisma/schema.prisma` — tenants, ledger, approvals, audit, agent runs, billing
- `lib/finance` — schedules, arrears, allocation, pool, dividends, reconciliation
- `lib/tenancy` — request context and the Prisma guard
- `lib/auth` — phone, PIN, OTP, sessions
- `prisma/seed-data.ts` — the Umoja story, checked against the loan rules

Phase 2 is the officials' and members' web app: dashboard, contribution grid, loans, fines, expenses, statements, and PDF reports.
