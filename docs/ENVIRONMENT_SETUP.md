# 環境設定ガイド

## クイックスタート

### 開発環境のセットアップ

1. リポジトリをクローン:
   ```bash
   git clone <repository-url>
   cd relativity
   ```

2. 環境変数ファイルを作成:
   ```bash
   cd src/features/app/server
   cp .env.example .env
   ```

3. `.env`ファイルを編集して、実際の値を設定:
   ```env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres?sslmode=require"
   RESEND_API_KEY=your-resend-api-key
   # その他の必要な環境変数
   ```

4. 依存関係をインストール:
   ```bash
   npm run install:all
   ```

5. データベースをセットアップ:
   ```bash
   npm run db:push
   ```

6. 開発サーバーを起動:
   ```bash
   npm run dev
   ```

## 環境変数の説明

### 必須の環境変数

| 変数名 | 説明 | 開発環境 | 本番環境 |
|--------|------|----------|----------|
| `DATABASE_URL` | PostgreSQL接続文字列 | Supabase開発用 | Supabase本番用 |
| `JWT_SECRET` | JWT署名用のシークレット | 開発用の簡単な値 | 強力なランダム文字列 |
| `ENCRYPTION_KEY` | 暗号化キー | 開発用の簡単な値 | 強力なランダム文字列 |
| `RESEND_API_KEY` | Resend APIキー | 開発用キー | 本番用キー |

### オプションの環境変数

| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| `PORT` | サーバーポート | 3001 |
| `NODE_ENV` | 実行環境 | development |
| `EMAIL_FROM` | 送信元メールアドレス | 開発: `onboarding@resend.dev` |
| `CORS_ORIGIN` | CORS許可オリジン | `http://localhost:3000` |
| `APP_URL` | アプリケーションURL | `http://localhost:3000` |
| `DEMO_MODE` | デモモード | `false` |
| `RELATIVIT_API_KEY` | 試用モード用APIキー | - |
| `RELATIVIT_API_PROVIDER` | 試用モード用プロバイダー | `anthropic` |

## 環境ごとの設定例

### 開発環境（.env）

```env
NODE_ENV=development
PORT=3001

DATABASE_URL="postgresql://postgres:password@localhost:5432/postgres"
JWT_SECRET=dev-secret-key-minimum-64-characters-for-development-only
ENCRYPTION_KEY=dev-encryption-key-32-bytes

# 開発環境ではEMAIL_FROMを設定しない（自動的にonboarding@resend.devが使用される）
RESEND_API_KEY=re_xxxxxxxxxxxxx

CORS_ORIGIN=http://localhost:3000
APP_URL=http://localhost:3000

DEMO_MODE=false
```

### 本番環境（.env.production）

```env
NODE_ENV=production
PORT=3001

DATABASE_URL="postgresql://postgres:strong-password@production-host:5432/postgres?sslmode=require"
JWT_SECRET=[openssl rand -base64 64 で生成]
ENCRYPTION_KEY=[openssl rand -base64 32 で生成]

EMAIL_FROM=noreply@relativit.app
RESEND_API_KEY=re_production_key

CORS_ORIGIN=https://relativit.app
APP_URL=https://relativit.app

DEMO_MODE=false

RELATIVIT_API_KEY=sk-ant-api03-xxxxx
RELATIVIT_API_PROVIDER=anthropic
```

## シークレットの生成方法

### JWT_SECRETの生成

```bash
openssl rand -base64 64
```

### ENCRYPTION_KEYの生成

```bash
openssl rand -base64 32
```

## トラブルシューティング

### 環境変数が読み込まれない

1. `.env`ファイルが`src/features/app/server/`ディレクトリにあるか確認
2. サーバーを再起動（環境変数は起動時に読み込まれます）
3. `dotenv`パッケージがインストールされているか確認

### データベース接続エラー

1. `DATABASE_URL`が正しい形式か確認
2. パスワードに特殊文字（`@`など）が含まれている場合、URLエンコードする
3. Supabaseの場合、Session Poolerの接続文字列を使用しているか確認

### メール送信エラー

1. 開発環境: `EMAIL_FROM`を未設定にして、自動的にテスト用メールアドレスを使用
2. 本番環境: `EMAIL_FROM`に認証済みドメインを設定
3. Resendダッシュボードでドメインが認証されているか確認
