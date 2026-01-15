# GitHub Actions ワークフロー修正のコミット手順

以下のコマンドを実行して、ワークフローの修正をコミット・プッシュしてください：

```bash
cd docs/03_project/00_thedomainai/relativit
git add .gitignore .github/workflows/
git commit -m "Fix CI/CD: Handle missing package-lock.json gracefully

- Update .gitignore to allow package-lock.json (best practice for reproducible builds)
- Modify workflows to use npm install if package-lock.json is missing
- Add debug logging to verify condition checks
- This fixes the 'Install dependencies' step failures in all jobs"
git push origin main
```

## 修正内容

1. `.gitignore`から`package-lock.json`を削除（再現可能なビルドのため）
2. ワークフローで`package-lock.json`の存在をチェック
3. 存在する場合は`npm ci`、存在しない場合は`npm install`を使用
4. デバッグ用のログを追加して、条件分岐が正しく動作することを確認
