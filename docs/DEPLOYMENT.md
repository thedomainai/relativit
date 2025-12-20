# デプロイメントガイド

## 環境の分離

本プロジェクトでは、環境変数を使用して開発環境と本番環境を分離しています。

## 環境変数の管理

### 1. 環境変数ファイル

- **`.env`** - 実際の環境変数（GitHubにコミットしない）
- **`.env.example`** - 環境変数のテンプレート（GitHubにコミットする）

### 2. 環境ごとの設定

#### 開発環境（Development）

```env
# .env (開発環境用)
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?sslmode=require"

# Security (開発用の簡単な値でも可)
JWT_SECRET=dev-secret-key-minimum-64-characters-for-development-only
ENCRYPTION_KEY=dev-encryption-key-32-bytes

# Email (開発環境ではResendのテスト用メールアドレスを自動使用)
# EMAIL_FROMは未設定でOK（自動的にonboarding@resend.devが使用される）
RESEND_API_KEY=your-resend-api-key

# CORS
CORS_ORIGIN=http://localhost:3000
APP_URL=http://localhost:3000

# Demo mode (開発用)
DEMO_MODE=false

# Relativit Trial Mode (開発用テスト)
RELATIVIT_API_KEY=your-test-api-key
RELATIVIT_API_PROVIDER=anthropic
```

#### 本番環境（Production）

```env
# .env (本番環境用)
NODE_ENV=production
PORT=3001

# Database (本番用の接続文字列)
DATABASE_URL="postgresql://postgres:[PRODUCTION-PASSWORD]@[PRODUCTION-HOST]:5432/postgres?sslmode=require"

# Security (本番用の強力な値)
# 生成方法: openssl rand -base64 64
JWT_SECRET=[強力な64文字以上のランダム文字列]
# 生成方法: openssl rand -base64 32
ENCRYPTION_KEY=[32バイトのランダム文字列]

# Email (本番環境では認証済みドメインを使用)
EMAIL_FROM=noreply@relativit.app
RESEND_API_KEY=your-production-resend-api-key

# CORS (本番用のドメイン)
CORS_ORIGIN=https://relativit.app
APP_URL=https://relativit.app

# Demo mode (本番では無効)
DEMO_MODE=false

# Relativit Trial Mode (本番用)
RELATIVIT_API_KEY=your-production-api-key
RELATIVIT_API_PROVIDER=anthropic
```

## 環境変数の設定方法

### ローカル開発環境

1. `.env.example`をコピーして`.env`を作成:
   ```bash
   cd src/features/app/server
   cp .env.example .env
   ```

2. `.env`ファイルを編集して、実際の値を設定

3. サーバーを起動:
   ```bash
   npm run dev:server
   ```

### 本番環境（例: Heroku, Vercel, Railway等）

#### Herokuの場合

```bash
# 環境変数を設定
heroku config:set NODE_ENV=production
heroku config:set DATABASE_URL="postgresql://..."
heroku config:set JWT_SECRET="..."
heroku config:set ENCRYPTION_KEY="..."
heroku config:set EMAIL_FROM="noreply@relativit.app"
heroku config:set RESEND_API_KEY="..."
heroku config:set CORS_ORIGIN="https://relativit.app"
heroku config:set APP_URL="https://relativit.app"
```

#### Vercelの場合

1. Vercelダッシュボード → Project Settings → Environment Variables
2. 各環境変数を追加

#### Railwayの場合

1. Railwayダッシュボード → Variables
2. 各環境変数を追加

## 環境ごとの動作の違い

### 開発環境（NODE_ENV=development）

- メール送信: `EMAIL_FROM`が未設定の場合、自動的に`onboarding@resend.dev`を使用
- エラーハンドリング: 詳細なエラーメッセージを表示
- CORS: `http://localhost:3000`を許可
- ログ: 詳細なデバッグログを出力

### 本番環境（NODE_ENV=production）

- メール送信: `EMAIL_FROM`で指定された認証済みドメインを使用（必須）
- エラーハンドリング: ユーザー向けの簡潔なエラーメッセージ
- CORS: 指定された本番ドメインのみ許可
- ログ: 本番用のログレベル

## セキュリティのベストプラクティス

1. **`.env`ファイルは絶対にGitHubにコミットしない**
   - `.gitignore`に既に含まれていますが、確認してください

2. **本番環境のシークレットは強力な値を使用**
   - `JWT_SECRET`: 最低64文字のランダム文字列
   - `ENCRYPTION_KEY`: 32バイトのランダム文字列

3. **環境変数のローテーション**
   - 定期的にシークレットを更新
   - 漏洩が疑われる場合は即座に更新

4. **アクセス制御**
   - 本番環境の環境変数へのアクセスを制限
   - 最小権限の原則に従う

## トラブルシューティング

### 環境変数が読み込まれない

1. `.env`ファイルが正しい場所にあるか確認（`src/features/app/server/.env`）
2. サーバーを再起動（環境変数は起動時に読み込まれます）
3. `dotenv`パッケージがインストールされているか確認

### 本番環境でメールが送信されない

1. `EMAIL_FROM`が設定されているか確認
2. Resendダッシュボードでドメインが認証されているか確認
3. `NODE_ENV=production`が設定されているか確認

### CORSエラーが発生する

1. `CORS_ORIGIN`が正しいドメインに設定されているか確認
2. 本番環境では`https://`を使用しているか確認
