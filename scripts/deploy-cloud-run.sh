#!/bin/bash

# Cloud Run デプロイスクリプト
# 使用方法: ./scripts/deploy-cloud-run.sh

set -e

echo "🚀 Relativit API を Cloud Run にデプロイします..."

# プロジェクト設定
PROJECT_ID="relativit"
SERVICE_NAME="relativit-api"
REGION="asia-northeast1"

# 現在のプロジェクトを確認
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
  echo "⚠️  現在のプロジェクト: $CURRENT_PROJECT"
  echo "📝 プロジェクトを $PROJECT_ID に設定します..."
  gcloud config set project $PROJECT_ID
fi

# Cloud Run API が有効か確認
echo "🔍 Cloud Run API の有効化を確認..."
gcloud services enable run.googleapis.com --project=$PROJECT_ID 2>/dev/null || true

# サーバーディレクトリに移動
cd "$(dirname "$0")/../src/features/app/server"

# 環境変数の確認
echo ""
echo "📋 必要な環境変数とシークレット:"
echo "  - DATABASE_URL (Secret Manager)"
echo "  - JWT_SECRET (Secret Manager)"
echo "  - ENCRYPTION_KEY (Secret Manager)"
echo "  - RESEND_API_KEY (Secret Manager)"
echo "  - RELATIVIT_API_KEY (Secret Manager)"
echo ""

# シークレットの存在確認
echo "🔐 Secret Manager のシークレットを確認..."
SECRETS=("DATABASE_URL" "JWT_SECRET" "ENCRYPTION_KEY" "RESEND_API_KEY" "RELATIVIT_API_KEY")
MISSING_SECRETS=()

for SECRET in "${SECRETS[@]}"; do
  if ! gcloud secrets describe $SECRET --project=$PROJECT_ID &>/dev/null; then
    MISSING_SECRETS+=("$SECRET")
    echo "  ⚠️  $SECRET が見つかりません"
  else
    echo "  ✅ $SECRET が存在します"
  fi
done

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
  echo ""
  echo "❌ 以下のシークレットが設定されていません:"
  for SECRET in "${MISSING_SECRETS[@]}"; do
    echo "  - $SECRET"
  done
  echo ""
  echo "以下のコマンドでシークレットを設定してください:"
  echo ""
  for SECRET in "${MISSING_SECRETS[@]}"; do
    echo "  echo -n 'your-$SECRET-value' | gcloud secrets create $SECRET --data-file=-"
  done
  echo ""
  exit 1
fi

# Cloud Run にデプロイ
echo ""
echo "🚀 Cloud Run にデプロイ中..."
gcloud run deploy $SERVICE_NAME \
  --source . \
  --platform managed \
  --region $REGION \
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
  --set-env-vars RELATIVIT_ISSUE_EXTRACTION_API_PROVIDER=gemini \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10

# デプロイされたサービスのURLを取得
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')

echo ""
echo "✅ デプロイが完了しました！"
echo ""
echo "📡 サービスURL: $SERVICE_URL"
echo ""
echo "次のステップ:"
echo "  1. フロントエンドの環境変数 REACT_APP_API_URL を $SERVICE_URL に設定"
echo "  2. フロントエンドをビルドして Firebase Hosting にデプロイ"
echo ""
