FROM node:20-slim

WORKDIR /app

# 必要なライブラリ（openssl）をインストール
RUN apt-get update -y && \
    apt-get install -y openssl libssl-dev ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# 依存関係をコピーしてインストール
COPY package*.json ./
RUN npm ci --only=production

# Prisma schema をコピー（generate に必要）
COPY prisma ./prisma

# Prisma クライアントを生成（バイナリターゲットを明示的に指定）
RUN npx prisma generate

# アプリケーションコードをコピー
COPY . .

# ポートを公開（Cloud RunはPORT環境変数を自動設定）
# アプリケーションは process.env.PORT を使用する（デフォルト: 3001）
EXPOSE 8080

# アプリケーションを起動
# package.jsonのstartスクリプトを使用
CMD ["npm", "start"]
