# ローカル開発環境セットアップガイド

このドキュメントでは、Relativitアプリケーションをローカル環境で起動・テストする方法を説明します。

## 前提条件

以下のソフトウェアがインストールされている必要があります：

- **Node.js**: 20以上（LTS推奨）
  - 確認方法: `node --version`
  - インストール: [Node.js公式サイト](https://nodejs.org/)
- **npm**: Node.jsに含まれています
  - 確認方法: `npm --version`
- **PostgreSQL**: データベース（Supabaseを使用する場合は不要）
  - ローカルPostgreSQLを使用する場合のみ必要
  - Supabaseを使用する場合は、クラウドデータベースを使用

## セットアップ手順

### 1. リポジトリのクローン（初回のみ）

```bash
git clone <repository-url>
cd relativit
```

### 2. 依存関係のインストール

ルートディレクトリから、すべての依存関係をインストールします：

```bash
npm run install:all
```

このコマンドは以下を実行します：
- `src/features/app/server` の依存関係をインストール
- `src/features/app/client` の依存関係をインストール

### 3. 環境変数の設定

サーバー側の環境変数ファイルを作成します：

```bash
cd src/features/app/server
cp .env.example .env
```

`.env`ファイルを編集して、実際の値を設定します。最低限必要な設定：

```env
# データベース接続
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres?sslmode=require"

# 認証・セキュリティ
JWT_SECRET=dev-secret-key-minimum-64-characters-for-development-only
ENCRYPTION_KEY=dev-encryption-key-32-bytes

# メール送信（Resend）
RESEND_API_KEY=re_xxxxxxxxxxxxx

# CORS設定
CORS_ORIGIN=http://localhost:3000

# アプリケーションURL
APP_URL=http://localhost:3000

# サーバーポート（開発環境）
PORT=3001
NODE_ENV=development
```

詳細な環境変数の説明は [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) を参照してください。

### 4. データベースのセットアップ

Prismaスキーマをデータベースに適用します：

```bash
# ルートディレクトリに戻る
cd ../../../../

# Prismaクライアントを生成
npm run db:generate

# データベーススキーマを適用
npm run db:push
```

**Supabaseを使用する場合：**
- Supabaseダッシュボードから接続文字列を取得
- `.env`の`DATABASE_URL`に設定
- 上記のコマンドを実行

**ローカルPostgreSQLを使用する場合：**
- PostgreSQLを起動
- データベースを作成: `createdb relativit_dev`
- `.env`の`DATABASE_URL`に設定
- 上記のコマンドを実行

### 5. 開発サーバーの起動

#### 方法1: 一括起動（推奨）

ルートディレクトリから、フロントエンドとバックエンドを同時に起動：

```bash
npm run dev
```

このコマンドは以下を起動します：
- **バックエンド**: `http://localhost:3001`
- **フロントエンド**: `http://localhost:3000`

#### 方法2: 個別起動

**バックエンドのみ起動：**
```bash
npm run dev:server
```

**フロントエンドのみ起動：**
```bash
npm run dev:client
```

## 動作確認

### 1. バックエンドの確認

ブラウザまたはcurlで以下にアクセス：

```bash
# ヘルスチェック
curl http://localhost:3001/health

# 期待される応答
# {"status":"ok","timestamp":"..."}
```

### 2. フロントエンドの確認

ブラウザで以下にアクセス：

```
http://localhost:3000
```

ログイン画面が表示されれば成功です。

### 3. API接続の確認

フロントエンドからバックエンドへの接続を確認：

1. ブラウザの開発者ツール（F12）を開く
2. Networkタブを確認
3. フロントエンドでアクションを実行（例: ログイン試行）
4. APIリクエストが`http://localhost:3001/api`に送信されていることを確認

## よくある問題と解決方法

### 問題1: ポートが既に使用されている

**エラーメッセージ:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**解決方法:**
1. 使用中のポートを確認:
   ```bash
   lsof -i :3001  # macOS/Linux
   netstat -ano | findstr :3001  # Windows
   ```
2. プロセスを終了するか、`.env`で別のポートを指定:
   ```env
   PORT=3002
   ```

### 問題2: データベース接続エラー

**エラーメッセージ:**
```
Can't reach database server at ...
```

**解決方法:**
1. `DATABASE_URL`が正しいか確認
2. Supabaseの場合、接続文字列に`?sslmode=require`が含まれているか確認
3. パスワードに特殊文字（`@`など）が含まれている場合、URLエンコードする
4. データベースが起動しているか確認（ローカルPostgreSQLの場合）

### 問題3: 環境変数が読み込まれない

**解決方法:**
1. `.env`ファイルが`src/features/app/server/`ディレクトリにあるか確認
2. サーバーを再起動（環境変数は起動時に読み込まれます）
3. `.env`ファイルの構文エラーがないか確認（コメントは`#`で始める）

### 問題4: CORSエラー

**エラーメッセージ:**
```
Access to fetch at 'http://localhost:3001/api/...' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**解決方法:**
1. `.env`の`CORS_ORIGIN`が`http://localhost:3000`に設定されているか確認
2. サーバーを再起動

### 問題5: Prismaクライアントが生成されていない

**エラーメッセージ:**
```
Cannot find module '@prisma/client'
```

**解決方法:**
```bash
npm run db:generate
```

## 開発時の便利なコマンド

### データベース関連

```bash
# Prismaクライアントを再生成
npm run db:generate

# データベーススキーマを適用（開発用）
npm run db:push

# マイグレーションを作成・適用
npm run db:migrate

# Prisma Studio（データベースGUI）を起動
npm run db:studio
```

### ビルド関連

```bash
# フロントエンドをビルド（本番用）
npm run build:client

# ビルド結果は src/features/app/client/build に出力されます
```

## 開発環境の構成

### ポート番号

- **フロントエンド**: `3000`（React Scriptsのデフォルト）
- **バックエンド**: `3001`（`.env`の`PORT`で変更可能）

### ディレクトリ構造

```
relativit/
├── src/
│   └── features/
│       └── app/
│           ├── client/          # React フロントエンド
│           │   ├── src/
│           │   └── build/        # ビルド出力先
│           └── server/          # Express バックエンド
│               ├── src/
│               ├── prisma/
│               └── .env         # 環境変数ファイル
├── package.json                 # ルートのpackage.json
└── firebase.json                # Firebase設定
```

### 環境変数の場所

- **サーバー側**: `src/features/app/server/.env`
- **クライアント側**: ビルド時に`REACT_APP_API_URL`を設定（`.env`ファイルは使用しない）

## 次のステップ

- [環境変数の詳細設定](./ENVIRONMENT_SETUP.md)
- [本番環境へのデプロイ](./DEPLOYMENT_CLOUD_RUN.md)
- [データベースRLS設定](./RLS_SETUP.md)
