#!/bin/bash

# Secret Manager にシークレットを設定するスクリプト
# 使用方法: ./scripts/setup-secrets.sh

set -e

PROJECT_ID="relativit"

echo "🔐 Relativit のシークレットを Secret Manager に設定します..."
echo ""

# プロジェクト設定
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
  echo "📝 プロジェクトを $PROJECT_ID に設定します..."
  gcloud config set project $PROJECT_ID
fi

# Secret Manager API を有効化
echo "🔍 Secret Manager API の有効化を確認..."
gcloud services enable secretmanager.googleapis.com --project=$PROJECT_ID 2>/dev/null || true

echo ""
echo "以下のシークレットを設定します:"
echo "  1. DATABASE_URL - PostgreSQL データベース接続文字列"
echo "  2. JWT_SECRET - JWT トークンの署名用シークレット（64文字以上）"
echo "  3. ENCRYPTION_KEY - データ暗号化用キー（32バイト）"
echo "  4. RESEND_API_KEY - Resend メールサービスの API キー"
echo "  5. RELATIVIT_API_KEY - Relativit トライアルモード用の API キー"
echo ""

# 各シークレットの設定
declare -A SECRETS
SECRETS[DATABASE_URL]="PostgreSQL データベース接続文字列"
SECRETS[JWT_SECRET]="JWT トークンの署名用シークレット（64文字以上）"
SECRETS[ENCRYPTION_KEY]="データ暗号化用キー（32バイト）"
SECRETS[RESEND_API_KEY]="Resend メールサービスの API キー"
SECRETS[RELATIVIT_API_KEY]="Relativit トライアルモード用の API キー（チャット用）"
SECRETS[RELATIVIT_ISSUE_EXTRACTION_API_KEY]="論点整理用の API キー（Relativit管理）"

for SECRET_NAME in "${!SECRETS[@]}"; do
  DESCRIPTION="${SECRETS[$SECRET_NAME]}"
  
  # 既存のシークレットを確認
  if gcloud secrets describe $SECRET_NAME --project=$PROJECT_ID &>/dev/null; then
    echo "⚠️  $SECRET_NAME は既に存在します"
    read -p "  更新しますか？ (y/N): " UPDATE
    if [[ ! "$UPDATE" =~ ^[Yy]$ ]]; then
      echo "  ⏭️  スキップします"
      continue
    fi
  fi
  
  echo ""
  echo "📝 $SECRET_NAME を設定します"
  echo "   説明: $DESCRIPTION"
  read -sp "   値を入力してください: " SECRET_VALUE
  echo ""
  
  if [ -z "$SECRET_VALUE" ]; then
    echo "  ⚠️  値が空のためスキップします"
    continue
  fi
  
  # シークレットを作成または更新
  if gcloud secrets describe $SECRET_NAME --project=$PROJECT_ID &>/dev/null; then
    echo -n "$SECRET_VALUE" | gcloud secrets versions add $SECRET_NAME --data-file=- --project=$PROJECT_ID
    echo "  ✅ $SECRET_NAME を更新しました"
  else
    echo -n "$SECRET_VALUE" | gcloud secrets create $SECRET_NAME --data-file=- --project=$PROJECT_ID
    echo "  ✅ $SECRET_NAME を作成しました"
  fi
done

echo ""
echo "✅ シークレットの設定が完了しました！"
echo ""
echo "次のステップ:"
echo "  ./scripts/deploy-cloud-run.sh を実行して Cloud Run にデプロイ"
echo ""
