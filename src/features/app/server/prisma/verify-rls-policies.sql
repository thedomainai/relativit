-- ============================================
-- RLSポリシーの確認用SQL
-- ============================================
-- 
-- このSQLを実行して、RLSポリシーが正しく適用されているか確認できます
-- ============================================

-- すべてのテーブルのRLS有効化状況を確認
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('User', 'RefreshToken', 'VerificationCode', 'Workspace', 'Thread', 'Message', 'AuditLog', 'ApiUsage')
ORDER BY tablename;

-- すべてのRLSポリシーを確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('User', 'RefreshToken', 'VerificationCode', 'Workspace', 'Thread', 'Message', 'AuditLog', 'ApiUsage')
ORDER BY tablename, policyname;

-- 各テーブルのポリシー数を確認
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('User', 'RefreshToken', 'VerificationCode', 'Workspace', 'Thread', 'Message', 'AuditLog', 'ApiUsage')
GROUP BY tablename
ORDER BY tablename;
