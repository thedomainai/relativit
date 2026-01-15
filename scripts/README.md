# デプロイスクリプト

このディレクトリには、Cloud Run と Firebase Hosting へのデプロイを自動化するスクリプトが含まれています。

## スクリプト一覧

### 1. `setup-secrets.sh`

Secret Manager にシークレットを設定します。

```bash
./scripts/setup-secrets.sh
# または
npm run deploy:setup-secrets
```

**設定されるシークレット:**
- `DATABASE_URL` - PostgreSQL データベース接続文字列
- `JWT_SECRET` - JWT トークンの署名用シークレット（64文字以上）
- `ENCRYPTION_KEY` - データ暗号化用キー（32バイト）
- `RESEND_API_KEY` - Resend メールサービスの API キー
- `RELATIVIT_API_KEY` - Relativit トライアルモード用の API キー（チャット用）
- `RELATIVIT_ISSUE_EXTRACTION_API_KEY` - 論点整理用の API キー（Relativit管理）

### 2. `deploy-cloud-run.sh`

バックエンド API を Cloud Run にデプロイします。

```bash
./scripts/deploy-cloud-run.sh
# または
npm run deploy:cloud-run
```

**前提条件:**
- GCP プロジェクトが設定されている
- すべてのシークレットが Secret Manager に設定されている

### 3. `deploy-firebase.sh`

フロントエンドを Firebase Hosting にデプロイします。

```bash
./scripts/deploy-firebase.sh <API_URL>
# 例: ./scripts/deploy-firebase.sh https://relativit-api-xxxxx-xx.a.run.app
# または
npm run deploy:firebase <API_URL>
```

**前提条件:**
- Firebase CLI がインストールされている
- Firebase にログインしている (`firebase login`)
- Cloud Run の API URL が分かっている

## デプロイフロー

### 初回デプロイ

1. **GCP プロジェクトの設定**
   ```bash
   gcloud config set project relativit
   ```

2. **シークレットの設定**
   ```bash
   npm run deploy:setup-secrets
   ```

3. **バックエンドのデプロイ**
   ```bash
   npm run deploy:cloud-run
   ```
   デプロイ後、API URL が表示されます（例: `https://relativit-api-xxxxx-xx.a.run.app`）

4. **フロントエンドのデプロイ**
   ```bash
   npm run deploy:firebase https://relativit-api-xxxxx-xx.a.run.app
   ```

### 更新デプロイ

バックエンドとフロントエンドを個別に更新できます：

```bash
# バックエンドのみ更新
npm run deploy:cloud-run

# フロントエンドのみ更新
npm run deploy:firebase <API_URL>
```

## トラブルシューティング

### シークレットが見つからない

`setup-secrets.sh` を実行して、すべてのシークレットが設定されているか確認してください。

### Cloud Run のデプロイが失敗する

1. GCP プロジェクトが正しく設定されているか確認
2. Cloud Run API が有効になっているか確認
3. Dockerfile が正しく作成されているか確認

### Firebase のデプロイが失敗する

1. Firebase CLI がインストールされているか確認 (`firebase --version`)
2. Firebase にログインしているか確認 (`firebase login`)
3. `firebase.json` が正しく設定されているか確認
