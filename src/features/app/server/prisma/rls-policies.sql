-- ============================================
-- Row Level Security (RLS) Policies for Relativit
-- ============================================
-- 
-- このSQLスクリプトは、SupabaseでRLSを有効にした後、
-- Prismaを使っているバックエンド構成において適切なセキュリティポリシーを設定します。
--
-- 重要な注意事項:
-- - Relativitは独自のJWT認証システムを使用しています
-- - Prismaは service_role で接続するため、RLSをバイパスします
-- - これらのポリシーは、将来的にSupabase Authを使う場合や、
--   直接データベースアクセスからの保護を目的としています
--
-- 使用方法:
-- 1. Supabase Dashboard > SQL Editor で実行
-- 2. または、psqlコマンドで実行
-- ============================================

-- ============================================
-- 1. User テーブル
-- ============================================
-- ユーザーは自分の情報のみアクセス可能
-- サービスロール（Prisma）は全アクセス可能

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- サービスロール（Prisma）は全アクセス可能
CREATE POLICY "Service role can access all users"
  ON "User"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 認証されたユーザーは自分の情報のみアクセス可能
CREATE POLICY "Users can access own data"
  ON "User"
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

-- ============================================
-- 2. RefreshToken テーブル
-- ============================================
-- ユーザーは自分のリフレッシュトークンのみアクセス可能

ALTER TABLE "RefreshToken" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can access all refresh tokens"
  ON "RefreshToken"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can access own refresh tokens"
  ON "RefreshToken"
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- ============================================
-- 3. VerificationCode テーブル
-- ============================================
-- ユーザーは自分のメールアドレスの検証コードのみアクセス可能

ALTER TABLE "VerificationCode" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can access all verification codes"
  ON "VerificationCode"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 認証されたユーザーは自分のメールアドレスの検証コードのみアクセス可能
-- 注意: ログイン前の検証コードは userId が null の可能性があるため、
-- メールアドレスでのマッチングも許可
CREATE POLICY "Users can access own verification codes"
  ON "VerificationCode"
  FOR ALL
  TO authenticated
  USING (
    auth.uid()::text = "userId" OR
    (SELECT email FROM "User" WHERE id = auth.uid()::text) = email
  )
  WITH CHECK (
    auth.uid()::text = "userId" OR
    (SELECT email FROM "User" WHERE id = auth.uid()::text) = email
  );

-- ============================================
-- 4. Workspace テーブル
-- ============================================
-- ユーザーは自分のワークスペースのみアクセス可能

ALTER TABLE "Workspace" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can access all workspaces"
  ON "Workspace"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can access own workspaces"
  ON "Workspace"
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- ============================================
-- 5. Thread テーブル
-- ============================================
-- ユーザーは自分のワークスペースのスレッドのみアクセス可能

ALTER TABLE "Thread" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can access all threads"
  ON "Thread"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can access threads in own workspaces"
  ON "Thread"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Workspace"
      WHERE "Workspace".id = "Thread"."workspaceId"
      AND "Workspace"."userId" = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Workspace"
      WHERE "Workspace".id = "Thread"."workspaceId"
      AND "Workspace"."userId" = auth.uid()::text
    )
  );

-- ============================================
-- 6. Message テーブル
-- ============================================
-- ユーザーは自分のスレッドのメッセージのみアクセス可能

ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can access all messages"
  ON "Message"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can access messages in own threads"
  ON "Message"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Thread"
      INNER JOIN "Workspace" ON "Workspace".id = "Thread"."workspaceId"
      WHERE "Thread".id = "Message"."threadId"
      AND "Workspace"."userId" = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Thread"
      INNER JOIN "Workspace" ON "Workspace".id = "Thread"."workspaceId"
      WHERE "Thread".id = "Message"."threadId"
      AND "Workspace"."userId" = auth.uid()::text
    )
  );

-- ============================================
-- 7. AuditLog テーブル
-- ============================================
-- ユーザーは自分の監査ログのみアクセス可能（読み取り専用）

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can access all audit logs"
  ON "AuditLog"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 認証されたユーザーは自分の監査ログのみ読み取り可能
-- 注意: userId が null の可能性があるため、条件を調整
CREATE POLICY "Users can read own audit logs"
  ON "AuditLog"
  FOR SELECT
  TO authenticated
  USING (
    "userId" IS NULL OR
    auth.uid()::text = "userId"
  );

-- 認証されたユーザーは監査ログを作成できない（サービスロールのみ）
-- これは意図的な設計：監査ログはバックエンドからのみ作成される

-- ============================================
-- 8. ApiUsage テーブル
-- ============================================
-- ユーザーは自分のAPI使用状況のみアクセス可能（読み取り専用）

ALTER TABLE "ApiUsage" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can access all API usage"
  ON "ApiUsage"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can read own API usage"
  ON "ApiUsage"
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = "userId");

-- 認証されたユーザーはAPI使用状況を作成できない（サービスロールのみ）
-- これは意図的な設計：API使用状況はバックエンドからのみ記録される

-- ============================================
-- 完了メッセージ
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies have been created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Summary:';
  RAISE NOTICE '  - Service role (Prisma) can access all data';
  RAISE NOTICE '  - Authenticated users can only access their own data';
  RAISE NOTICE '  - AuditLog and ApiUsage are read-only for users';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Important:';
  RAISE NOTICE '  - Prisma uses service_role which bypasses RLS';
  RAISE NOTICE '  - These policies protect against direct database access';
  RAISE NOTICE '  - Application-level authorization is still required';
  RAISE NOTICE '  - Current auth system uses custom JWT (not Supabase Auth)';
  RAISE NOTICE '  - auth.uid() policies will work when using Supabase Auth';
END $$;
