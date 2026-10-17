# Kikapu

The chama treasurer's desk, and each member's own position. In the Celestara repository this app lives in `chama-ai/`. On [Kikapu-Intelligence](https://github.com/kamauSft/Kikapu-Intelligence) it is the repository root. Run the commands below from the directory that contains `package.json`.

Money is integer cents. Rates are basis points (`1000` = 10% per month). `lib/finance` does the maths. The screens only read those results.

## What a chama sees

The front door has two entrances. Peter the treasurer opens the October meeting: who paid, who to chase, the lending pool, and unmatched M-Pesa receipts. Amina the member opens only her money, her months, her loan, and her statement. She is turned away from the treasurer's register.

- **Treasurer** — this month's register, the chase list, and receipts still unmatched.
- **Members** — savings, loan, fines, and arrears for every member. A member cannot open this.
- **Contributions** — members by month, marked paid, late, missed, or not due.
- **Loans** — open, waiting, repaid, and declined.
- **Statement** — a running balance a member can print. Officials can open another member's statement. A member cannot.
- **Value** — minutes handed back, on-time rate against the old register, and the month's price for officials.

Umoja Savings Group is loaded from May 2025 through 16 October 2026. Later calendar dates still open that picture, so the demo does not invent arrears for months that were never seeded.

## Price

Free is KES 0. Standard is the higher of KES 500 and KES 30 an active member. Pro is the higher of KES 1,000 and KES 60 an active member. Umoja has 19 active members: Standard KES 570, Pro KES 1,140.

## Demo logins

Every seeded member uses PIN **2580**.

| Person | Role | Phone | Lands on |
|---|---|---|---|
| Grace Wanjiku Mwangi | Chair | 0712 345 001 | Desk, after the SMS code |
| Peter Otieno Omondi | Treasurer | 0712 345 002 | Desk, after the SMS code |
| Amina Hassan Bakari | Member | 0712 345 005 | Her own position |

With `DEMO_OTP_VISIBLE=true`, the login screen shows the official's SMS code. Turn the flag off before any real deployment.

## Run it

```bash
cp .env.example .env
npm install
npx prisma db push
npm run seed
npm run dev
```

Open http://localhost:3000.

```bash
npm test
npm run test:coverage
```

`lib/finance` is held at 100% line, branch, function, and statement coverage.

## What is enforced

- Every chama-scoped query on the extended Prisma client requires a tenant context. A member can load their own position and statement. The desk, member list, contribution grid, and loan book require an official. A platform admin can see billing, and chama financial rows only when `supportAccess` is set.
- Contributions, repayments, expenses, and the audit log cannot be edited or deleted through that client. Corrections are new reversal rows.
- Postgres row-level security for the same tables is in `prisma/rls.sql`. Local development uses SQLite, which cannot apply that file. Point `DATABASE_URL` at Postgres and run the SQL as the migration owner before production traffic. The application role must not bypass RLS.
- PINs are Argon2id. Five failed attempts lock the phone for 15 minutes. Officials need a 5-minute SMS code. Sessions idle out after 30 minutes, and a member can revoke every device.
- The audit log is append-only and hash-chained. The position page reports whether the chain still verifies.
