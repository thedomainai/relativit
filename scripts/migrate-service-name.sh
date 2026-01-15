#!/bin/bash

# Cloud Run サービス名を server から relativit-api に移行するスクリプト
# 使用方法: ./scripts/migrate-service-name.sh

# set -e をコメントアウト（エラー時にスクリプトを続行するため）
# set -e

PROJECT_ID="relativit"
OLD_SERVICE_NAME="server"
NEW_SERVICE_NAME="relativit-api"
REGION="asia-northeast1"

echo "🔄 Cloud Run サービス名を移行します..."
echo "  旧サービス名: $OLD_SERVICE_NAME"
echo "  新サービス名: $NEW_SERVICE_NAME"
echo ""

# プロジェクト設定
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
  echo "📝 プロジェクトを $PROJECT_ID に設定します..."
  gcloud config set project $PROJECT_ID
fi

# 既存のサービスを確認
echo "🔍 既存のサービスを確認中..."
OLD_SERVICE_EXISTS=$(gcloud run services describe $OLD_SERVICE_NAME --region=$REGION --format='value(metadata.name)' 2>/dev/null || echo "")
NEW_SERVICE_EXISTS=$(gcloud run services describe $NEW_SERVICE_NAME --region=$REGION --format='value(metadata.name)' 2>/dev/null || echo "")

if [ -n "$NEW_SERVICE_EXISTS" ]; then
  echo "✅ 新しいサービス ($NEW_SERVICE_NAME) は既に存在します"
  echo ""
  if [ -n "$OLD_SERVICE_EXISTS" ]; then
    read -p "古いサービス ($OLD_SERVICE_NAME) を削除しますか？ (y/N): " DELETE_OLD
    if [[ "$DELETE_OLD" =~ ^[Yy]$ ]]; then
      echo "🗑️  古いサービスを削除中..."
      if gcloud run services delete $OLD_SERVICE_NAME --region=$REGION --quiet 2>/dev/null; then
        echo "✅ 古いサービスを削除しました"
      else
        echo "⚠️  古いサービスの削除に失敗しました（既に削除されている可能性があります）"
      fi
    else
      echo "⏭️  古いサービスの削除をスキップしました"
    fi
  else
    echo "ℹ️  古いサービス ($OLD_SERVICE_NAME) は見つかりませんでした（既に削除されているか、存在しません）"
  fi
  
  # 新しいサービスのURLを表示
  NEW_SERVICE_URL=$(gcloud run services describe $NEW_SERVICE_NAME --region=$REGION --format='value(status.url)' 2>/dev/null || echo "")
  if [ -n "$NEW_SERVICE_URL" ]; then
    echo ""
    echo "📡 現在のサービスURL: $NEW_SERVICE_URL"
    echo ""
    echo "✅ 移行は完了しています。新しいサービス ($NEW_SERVICE_NAME) が使用可能です。"
  fi
  exit 0
fi

if [ -z "$OLD_SERVICE_EXISTS" ]; then
  echo "⚠️  古いサービス ($OLD_SERVICE_NAME) が見つかりません"
  echo "新しいサービス名で直接デプロイしてください:"
  echo "  npm run deploy:cloud-run"
  exit 0
fi

echo "📋 移行手順:"
echo "  1. 新しいサービス名 ($NEW_SERVICE_NAME) でデプロイ"
echo "  2. 動作確認"
echo "  3. 古いサービス ($OLD_SERVICE_NAME) を削除"
echo ""

read -p "新しいサービス名でデプロイを開始しますか？ (y/N): " PROCEED
if [[ ! "$PROCEED" =~ ^[Yy]$ ]]; then
  echo "❌ 移行をキャンセルしました"
  exit 0
fi

# サーバーディレクトリに移動
cd "$(dirname "$0")/../src/features/app/server"

# 新しいサービス名でデプロイ
echo ""
echo "🚀 新しいサービス名 ($NEW_SERVICE_NAME) でデプロイ中..."
gcloud run deploy $NEW_SERVICE_NAME \
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

# 新しいサービスのURLを取得
NEW_SERVICE_URL=$(gcloud run services describe $NEW_SERVICE_NAME --region=$REGION --format='value(status.url)')

echo ""
echo "✅ 新しいサービスがデプロイされました！"
echo "📡 新しいサービスURL: $NEW_SERVICE_URL"
echo ""
echo "📋 次のステップ:"
echo "  1. 新しいサービスが正常に動作するか確認してください"
echo "  2. フロントエンドのAPI URLを更新してください（必要に応じて）"
echo "  3. 動作確認後、以下のコマンドで古いサービスを削除してください:"
echo "     gcloud run services delete $OLD_SERVICE_NAME --region=$REGION"
echo ""
