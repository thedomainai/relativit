# Cloud Run + Firebase デプロイメントガイド

## アーキテクチャ概要

Relativitアプリケーションは以下の構成でデプロイします：

```
┌─────────────────┐
│  Firebase       │  ← フロントエンド (React)
│  Hosting        │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│  Cloud Run      │  ← バックエンド (Node.js/Express)
│  (API Server)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Supabase       │  ← データベース (PostgreSQL)
│  (PostgreSQL)   │
└─────────────────┘
```

## デプロイ手順

### 1. 前提条件

- Google Cloud Platform (GCP) プロジェクトが作成済み
- `gcloud` CLI がインストール済み
- Firebase CLI がインストール済み
- Supabase プロジェクトが作成済み

### クイックスタート（推奨）

デプロイスクリプトを使用すると、簡単にデプロイできます：

```bash
# 1. シークレットの設定
npm run deploy:setup-secrets

# 2. バックエンドのデプロイ
npm run deploy:cloud-run

# 3. フロントエンドのデプロイ（API URL を指定）
npm run deploy:firebase https://relativit-api-xxxxx-xx.a.run.app
```

詳細は [scripts/README.md](../scripts/README.md) を参照してください。

### 手動デプロイ手順

### 2. バックエンド（Cloud Run）のデプロイ

#### 2.1 Dockerfile の作成

`src/features/app/server/Dockerfile` を作成：

```dockerfile
FROM node:20-alpine

WORKDIR /app

# 依存関係をコピーしてインストール
COPY package*.json ./
RUN npm ci --only=production

# アプリケーションコードをコピー
COPY . .

# Prisma クライアントを生成
RUN npx prisma generate

# ポートを公開
EXPOSE 3001

# アプリケーションを起動
CMD ["node", "src/index.js"]
```

#### 2.2 .dockerignore の作成

`src/features/app/server/.dockerignore` を作成：

```
node_modules
npm-debug.log
.env
.env.local
.git
.gitignore
README.md
```

#### 2.3 Cloud Run へのデプロイ

```bash
# GCP プロジェクトを設定
gcloud config set project relativit

# Cloud Run にデプロイ
cd src/features/app/server
gcloud run deploy relativit-api \
  --source . \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-secrets DATABASE_URL=DATABASE_URL:latest \
  --set-secrets JWT_SECRET=JWT_SECRET:latest \
  --set-secrets ENCRYPTION_KEY=ENCRYPTION_KEY:latest \
  --set-secrets RESEND_API_KEY=RESEND_API_KEY:latest \
  --set-env-vars EMAIL_FROM=noreply@relativit.app \
  --set-env-vars CORS_ORIGIN=https://relativit.app \
  --set-env-vars APP_URL=https://relativit.app \
  --set-secrets RELATIVIT_API_KEY=RELATIVIT_API_KEY:latest \
  --set-env-vars RELATIVIT_API_PROVIDER=gemini \
  --set-secrets RELATIVIT_ISSUE_EXTRACTION_API_KEY=RELATIVIT_ISSUE_EXTRACTION_API_KEY:latest \
  --set-env-vars RELATIVIT_ISSUE_EXTRACTION_API_PROVIDER=gemini
```

#### 2.4 シークレットの設定

```bash
# Secret Manager にシークレットを保存
echo -n "your-database-url" | gcloud secrets create DATABASE_URL --data-file=-
echo -n "your-jwt-secret" | gcloud secrets create JWT_SECRET --data-file=-
echo -n "your-encryption-key" | gcloud secrets create ENCRYPTION_KEY --data-file=-
echo -n "your-resend-api-key" | gcloud secrets create RESEND_API_KEY --data-file=-
echo -n "AIzaSyD4xtk9q6-rztP3oQxxrXywz2mVbiY8NnQ" | gcloud secrets create RELATIVIT_API_KEY --data-file=-

# RELATIVIT_ISSUE_EXTRACTION_API_KEY (論点整理用)
echo -n "AIzaSyD4xtk9q6-rztP3oQxxrXywz2mVbiY8NnQ" | gcloud secrets create RELATIVIT_ISSUE_EXTRACTION_API_KEY --data-file=-
```

### 3. フロントエンド（Firebase Hosting）のデプロイ

#### 3.1 firebase.json の作成

プロジェクトルートに `firebase.json` を作成：

```json
{
  "hosting": {
    "public": "src/features/app/client/build",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

#### 3.2 環境変数の設定

React アプリケーションで Cloud Run の URL を使用するように設定：

`src/features/app/client/.env.production` を作成：

```env
REACT_APP_API_URL=https://relativit-api-xxxxx-xx.a.run.app
```

#### 3.3 ビルドとデプロイ

```bash
# フロントエンドをビルド
cd src/features/app/client
npm install
npm run build

# Firebase Hosting にデプロイ
cd ../../../
firebase deploy --only hosting
```

### 4. GitHub Actions での自動デプロイ

`.github/workflows/deploy-production.yml` を更新：

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]
    tags:
      - 'v*'

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: relativit
      
      - name: Authenticate to Google Cloud
        run: gcloud auth activate-service-account --key-file=${{ secrets.GCP_SA_KEY }}
      
      - name: Deploy to Cloud Run
        run: |
          cd src/features/app/server
          gcloud run deploy relativit-api \
            --source . \
            --platform managed \
            --region asia-northeast1 \
            --allow-unauthenticated \
            --set-env-vars NODE_ENV=production \
            --set-env-vars PORT=3001 \
            --set-secrets DATABASE_URL=DATABASE_URL:latest \
            --set-secrets JWT_SECRET=JWT_SECRET:latest \
            --set-secrets ENCRYPTION_KEY=ENCRYPTION_KEY:latest \
            --set-secrets RESEND_API_KEY=RESEND_API_KEY:latest \
            --set-env-vars EMAIL_FROM=noreply@relativit.app \
            --set-env-vars CORS_ORIGIN=https://relativit.app \
            --set-env-vars APP_URL=https://relativit.app \
            --set-secrets RELATIVIT_API_KEY=RELATIVIT_API_KEY:latest \
            --set-env-vars RELATIVIT_API_PROVIDER=gemini \
            --set-secrets RELATIVIT_ISSUE_EXTRACTION_API_KEY=RELATIVIT_ISSUE_EXTRACTION_API_KEY:latest \
            --set-env-vars RELATIVIT_ISSUE_EXTRACTION_API_PROVIDER=gemini

  deploy-frontend:
    runs-on: ubuntu-latest
    needs: deploy-backend
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd src/features/app/client
          npm ci
      
      - name: Build
        run: |
          cd src/features/app/client
          npm run build
        env:
          REACT_APP_API_URL: ${{ secrets.REACT_APP_API_URL }}
      
      - name: Deploy to Firebase Hosting
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: relativit
```

## コスト見積もり

### Cloud Run
- **無料枠**: 月間 200万リクエスト、360,000 GB秒、180,000 vCPU秒
- **従量課金**: リクエスト数と実行時間に応じて課金
- **推定コスト**: 小規模なアプリケーションで月額 $5-20

### Firebase Hosting
- **無料枠**: 月間 10GB の転送、360MB のストレージ
- **従量課金**: 超過分は $0.15/GB
- **推定コスト**: 小規模なアプリケーションで月額 $0-5

### Supabase
- **無料枠**: 500MB データベース、2GB バンド幅
- **従量課金**: プランに応じて
- **推定コスト**: 小規模なアプリケーションで月額 $0-25

## セキュリティ設定

### 1. CORS の設定

Cloud Run のバックエンドで、Firebase Hosting のドメインからのリクエストのみを許可：

```javascript
// src/features/app/server/src/index.js
const cors = require('cors');

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://relativit.app',
  credentials: true
}));
```

### 2. 環境変数の管理

機密情報は Secret Manager を使用し、環境変数には含めない。

### 3. HTTPS の強制

Firebase Hosting と Cloud Run は自動的に HTTPS を提供します。

## トラブルシューティング

### Cloud Run のデプロイが失敗する

1. Dockerfile が正しく作成されているか確認
2. 環境変数とシークレットが正しく設定されているか確認
3. Cloud Run API が有効になっているか確認

### Firebase Hosting のデプロイが失敗する

1. `firebase.json` が正しく設定されているか確認
2. `firebase login` でログインしているか確認
3. ビルドが成功しているか確認

### CORS エラーが発生する

1. `CORS_ORIGIN` 環境変数が正しく設定されているか確認
2. Cloud Run の URL が正しいか確認
3. フロントエンドの API URL が正しく設定されているか確認
