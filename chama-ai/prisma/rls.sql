-- Postgres row-level security for Chama AI.
-- SQLite (local dev) cannot enforce this file. Apply it after deploying to Postgres.
-- The app also filters every tenant query in lib/tenancy/extension.ts.
--
-- Inside each request transaction:
--   SELECT set_config('app.current_chama_id', '<chama id>', true);
--   SELECT set_config('app.person_id', '<person id>', true);
--   SELECT set_config('app.role', '<CHAIR|TREASURER|SECRETARY|MEMBER|AUDITOR>', true);
--   SELECT set_config('app.platform_role', '<SUPER_ADMIN or empty>', true);
--
-- Run this as the migration owner. The application role must not own the tables,
-- and must not be BYPASSRLS, so FORCE ROW LEVEL SECURITY still applies to it.

CREATE OR REPLACE FUNCTION chama_support_access_active(target_chama text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "SupportAccess" s
    WHERE s."chamaId" = target_chama
      AND s."revokedAt" IS NULL
      AND s."startsAt" <= CURRENT_TIMESTAMP
      AND s."expiresAt" > CURRENT_TIMESTAMP
  );
$$;

-- Sensitive chama records. A platform admin sees them only during support access.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'Membership', 'Contribution', 'Loan', 'LoanInstallment', 'LoanRepayment', 'Guarantor',
    'Fine', 'Expense', 'WelfareClaim', 'Meeting', 'Poll', 'Vote', 'SavingsGoal',
    'MpesaTransaction', 'Approval', 'AuditLog', 'AgentRun', 'Message', 'Notification',
    'ValueMetric', 'PendingAction', 'SupportAccess'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (
         "chamaId" = current_setting(''app.current_chama_id'', true)
         OR (
           current_setting(''app.platform_role'', true) = ''SUPER_ADMIN''
           AND chama_support_access_active("chamaId")
         )
       ) WITH CHECK ("chamaId" = current_setting(''app.current_chama_id'', true))',
      table_name
    );
  END LOOP;
END $$;

-- Billing is visible to the platform owner without opening a chama's books.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['Subscription', 'Invoice', 'UsageCounter']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS billing_isolation ON %I', table_name);
    EXECUTE format(
      'CREATE POLICY billing_isolation ON %I USING (
         "chamaId" = current_setting(''app.current_chama_id'', true)
         OR current_setting(''app.platform_role'', true) = ''SUPER_ADMIN''
       ) WITH CHECK (
         "chamaId" = current_setting(''app.current_chama_id'', true)
         OR current_setting(''app.platform_role'', true) = ''SUPER_ADMIN''
       )',
      table_name
    );
  END LOOP;
END $$;

ALTER TABLE "Chama" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Chama" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chama_isolation ON "Chama";
CREATE POLICY chama_isolation ON "Chama"
  USING (
    "id" = current_setting('app.current_chama_id', true)
    OR current_setting('app.platform_role', true) = 'SUPER_ADMIN'
  )
  WITH CHECK (
    "id" = current_setting('app.current_chama_id', true)
    OR current_setting('app.platform_role', true) = 'SUPER_ADMIN'
  );

ALTER TABLE "Person" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Person" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS person_isolation ON "Person";
CREATE POLICY person_isolation ON "Person"
  USING (
    "id" = current_setting('app.person_id', true)
    OR current_setting('app.platform_role', true) = 'SUPER_ADMIN'
    OR EXISTS (
      SELECT 1 FROM "Membership" m
      WHERE m."personId" = "Person"."id"
        AND m."chamaId" = current_setting('app.current_chama_id', true)
        AND current_setting('app.role', true) IN ('CHAIR', 'TREASURER', 'SECRETARY', 'AUDITOR')
    )
  );

ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS session_isolation ON "Session";
CREATE POLICY session_isolation ON "Session"
  USING ("personId" = current_setting('app.person_id', true));

ALTER TABLE "OtpChallenge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OtpChallenge" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS otp_isolation ON "OtpChallenge";
CREATE POLICY otp_isolation ON "OtpChallenge"
  USING ("personId" = current_setting('app.person_id', true));
