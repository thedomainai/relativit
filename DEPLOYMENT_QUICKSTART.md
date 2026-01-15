# デプロイクイックスタートガイド

このガイドでは、Relativit アプリケーションを Cloud Run + Firebase Hosting にデプロイする手順を説明します。

## 前提条件

- Google Cloud Platform (GCP) アカウント
- `gcloud` CLI がインストール済み
- Firebase CLI がインストール済み
- Supabase プロジェクトが作成済み

## ステップ 1: GCP プロジェクトの設定

```bash
# GCP プロジェクトを設定
gcloud config set project relativit

# 必要な API を有効化
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

## ステップ 2: シークレットの設定

Secret Manager に必要なシークレットを設定します：

```bash
npm run deploy:setup-secrets
```

または手動で設定：

```bash
# DATABASE_URL
echo -n "postgresql://postgres:password@host:5432/postgres" | \
  gcloud secrets create DATABASE_URL --data-file=-

# JWT_SECRET (64文字以上)
echo -n "$(openssl rand -base64 64)" | \
  gcloud secrets create JWT_SECRET --data-file=-

# ENCRYPTION_KEY (32バイト)
echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets create ENCRYPTION_KEY --data-file=-

# RESEND_API_KEY
echo -n "your-resend-api-key" | \
  gcloud secrets create RESEND_API_KEY --data-file=-

# RELATIVIT_API_KEY (チャット用)
echo -n "AIzaSyD4xtk9q6-rztP3oQxxrXywz2mVbiY8NnQ" | \
  gcloud secrets create RELATIVIT_API_KEY --data-file=-

# RELATIVIT_ISSUE_EXTRACTION_API_KEY (論点整理用)
echo -n "AIzaSyD4xtk9q6-rztP3oQxxrXywz2mVbiY8NnQ" | \
  gcloud secrets create RELATIVIT_ISSUE_EXTRACTION_API_KEY --data-file=-
```

## ステップ 3: バックエンドのデプロイ

Cloud Run にバックエンド API をデプロイします：

```bash
npm run deploy:cloud-run
```

デプロイが完了すると、API URL が表示されます：
```
📡 サービスURL: https://relativit-api-xxxxx-xx.a.run.app
```

この URL を次のステップで使用します。

## ステップ 4: フロントエンドのデプロイ

Firebase Hosting にフロントエンドをデプロイします：

```bash
# Firebase にログイン（初回のみ）
firebase login

# フロントエンドをデプロイ（API URL を指定）
npm run deploy:firebase https://relativit-api-xxxxx-xx.a.run.app
```

デプロイが完了すると、アプリケーションの URL が表示されます：
```
🌐 アプリケーションURL: https://relativit.web.app
```

## 完了！

アプリケーションが本番環境で利用可能になりました。

## トラブルシューティング

### シークレットが見つからない

`npm run deploy:setup-secrets` を実行して、すべてのシークレットが設定されているか確認してください。

### Cloud Run のデプロイが失敗する

1. GCP プロジェクトが正しく設定されているか確認
2. Cloud Run API が有効になっているか確認
3. Dockerfile が正しく作成されているか確認

### Firebase のデプロイが失敗する

1. Firebase CLI がインストールされているか確認
2. Firebase にログインしているか確認
3. `firebase.json` が正しく設定されているか確認

## 詳細情報

- [Cloud Run + Firebase デプロイメントガイド](./docs/DEPLOYMENT_CLOUD_RUN.md)
- [デプロイスクリプトの README](./scripts/README.md)
