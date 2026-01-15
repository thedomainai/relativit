# Supabase RLS (Row Level Security) セットアップガイド

## 概要

このドキュメントでは、Prismaを使っているRelativitバックエンドにおいて、SupabaseのRLS（Row Level Security）を適切に設定する方法を説明します。

## 前提条件

- Supabaseプロジェクトが作成済み
- RLSが有効になっている（Supabase Dashboardで警告が出ている場合）
- Prismaスキーマが適用済み

## RLSポリシーの適用

### 方法1: Supabase Dashboard経由（推奨）

1. Supabase Dashboardにログイン
2. **SQL Editor** を開く
3. `prisma/rls-policies.sql` の内容をコピー＆ペースト
4. **Run** をクリックして実行

### 方法2: psqlコマンド経由

```bash
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?sslmode=require" \
  -f src/features/app/server/prisma/rls-policies.sql
```

## ポリシーの内容

### 1. サービスロール（Prisma）のアクセス

すべてのテーブルで、`service_role`ロールは全データにアクセス可能です。これにより、Prismaを使ったバックエンドアプリケーションは正常に動作します。

```sql
CREATE POLICY "Service role can access all users"
  ON "User"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

### 2. 認証されたユーザーのアクセス

認証されたユーザーは、自分のデータのみアクセス可能です：

- **User**: 自分のユーザー情報のみ
- **RefreshToken**: 自分のリフレッシュトークンのみ
- **VerificationCode**: 自分のメールアドレスの検証コードのみ
- **Workspace**: 自分のワークスペースのみ
- **Thread**: 自分のワークスペースのスレッドのみ
- **Message**: 自分のスレッドのメッセージのみ
- **AuditLog**: 自分の監査ログのみ（読み取り専用）
- **ApiUsage**: 自分のAPI使用状況のみ（読み取り専用）

### 3. 階層的なアクセス制御

`Thread`と`Message`は、`Workspace`を経由してユーザー所有権を確認します：

```sql
-- Thread: Workspace経由でユーザー所有権を確認
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
  );
```

## Prismaとの互換性

### 重要なポイント

1. **Prismaは`service_role`を使用**
   - Prismaは通常、`service_role`で接続するため、RLSをバイパスします
   - これにより、バックエンドアプリケーションは正常に動作します

2. **現在の認証システム**
   - Relativitは独自のJWT認証システムを使用しています
   - Supabase Authは使用していません
   - そのため、`auth.uid()`を使ったポリシーは現在は動作しません
   - しかし、将来的にSupabase Authに移行する場合に備えて設定されています

3. **アプリケーションレベルの認証は必須**
   - RLSはデータベースレベルのセキュリティです
   - アプリケーションレベル（JWT認証など）での認証・認可も必要です
   - 現在の構成では、アプリケーションレベルでの認証・認可に依存しています

4. **直接データベースアクセスの保護**
   - RLSは、Supabaseクライアントライブラリを使った直接アクセスを保護します
   - 将来的にフロントエンドから直接Supabaseにアクセスする場合に有効です
   - サービスロール（Prisma）は常に全データにアクセス可能です

## 接続文字列の確認

Prismaが`service_role`を使用していることを確認：

```env
# 通常の接続（RLSが適用される）
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?sslmode=require"

# サービスロール接続（RLSをバイパス）
# 注意: これは通常不要。Prismaは自動的に適切なロールを使用します
```

## トラブルシューティング

### エラー: "permission denied for table"

- RLSポリシーが正しく適用されているか確認
- Prismaが`service_role`で接続しているか確認
- 接続文字列が正しいか確認

### エラー: "policy violation"

- ポリシーの条件を確認
- `auth.uid()`が正しく設定されているか確認
- Supabaseの認証設定を確認

### ポリシーの確認

`prisma/verify-rls-policies.sql` を実行して、RLSポリシーが正しく適用されているか確認できます：

```sql
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
ORDER BY tablename, policyname;
```

または、`prisma/verify-rls-policies.sql` ファイル全体をSupabase DashboardのSQL Editorで実行してください。

### ポリシーの削除（必要に応じて）

```sql
-- 例: Userテーブルのポリシーを削除
DROP POLICY "Service role can access all users" ON "User";
DROP POLICY "Users can access own data" ON "User";
```

## セキュリティのベストプラクティス

1. **最小権限の原則**
   - ユーザーは必要最小限のデータのみアクセス可能

2. **多層防御**
   - RLS（データベースレベル）
   - JWT認証（アプリケーションレベル）
   - レート制限（APIレベル）

3. **監査ログ**
   - `AuditLog`テーブルでアクセスを記録
   - ユーザーは自分のログのみ閲覧可能

4. **定期的なレビュー**
   - RLSポリシーを定期的にレビュー
   - 不要なアクセス権限を削除

## 参考資料

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Prisma + Supabase Guide](https://www.prisma.io/docs/guides/database/using-prisma-with-supabase)
