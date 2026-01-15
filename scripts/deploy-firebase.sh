#!/bin/bash

# Firebase Hosting デプロイスクリプト
# 使用方法: ./scripts/deploy-firebase.sh [API_URL]

set -e

# API URL の取得
if [ -z "$1" ]; then
  echo "⚠️  API URL が指定されていません"
  echo ""
  echo "使用方法: ./scripts/deploy-firebase.sh <API_URL>"
  echo "例: ./scripts/deploy-firebase.sh https://relativit-api-xxxxx-xx.a.run.app"
  echo ""
  echo "または、環境変数 REACT_APP_API_URL を設定してください"
  exit 1
fi

API_URL="$1"
PROJECT_ID="relativit"

echo "🚀 Relativit フロントエンドを Firebase Hosting にデプロイします..."
echo "📡 API URL: $API_URL"

# プロジェクト設定
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
  echo "📝 プロジェクトを $PROJECT_ID に設定します..."
  gcloud config set project $PROJECT_ID
fi

# Firebase ログイン確認
echo "🔍 Firebase ログイン状態を確認..."
if ! firebase projects:list &>/dev/null; then
  echo "⚠️  Firebase にログインしていません"
  echo "以下のコマンドでログインしてください:"
  echo "  firebase login"
  exit 1
fi

# クライアントディレクトリに移動
cd "$(dirname "$0")/../src/features/app/client"

# 依存関係のインストール
echo ""
echo "📦 依存関係をインストール中..."
npm ci

# 環境変数を設定してビルド
echo ""
echo "🔨 フロントエンドをビルド中..."
REACT_APP_API_URL="$API_URL" npm run build

# ビルドが成功したか確認
if [ ! -d "build" ]; then
  echo "❌ ビルドが失敗しました"
  exit 1
fi

# プロジェクトルートに戻る
cd "$(dirname "$0")/../.."

# Firebase Hosting にデプロイ
echo ""
echo "🚀 Firebase Hosting にデプロイ中..."
firebase deploy --only hosting --project $PROJECT_ID

echo ""
echo "✅ デプロイが完了しました！"
echo ""
echo "🌐 アプリケーションURL: https://$PROJECT_ID.web.app"
echo "  または: https://$PROJECT_ID.firebaseapp.com"
echo ""
