# CLAUDE.md

こども向けの学習サイト「キマル」（さんすうドリル・しょうぎ・そら・あそび・WBC スカウティング）。
Internet Computer 上で動く。バックエンドは Motoko、フロントは素の JS（webpack）。
詳しい設計と方針は README.md。応答・コミットメッセージ・コメントは日本語。

## 構成

- `src/todo_app_backend/main.mo` — バックエンド（カウンターなど。保存量が増えない作り）
- `src/todo_app_frontend/src/` — 画面。機能ごとに `drill*.js` `shogi*.js/.mjs` `sky*.js/.mjs` `asobi*.js` `wbc*.js`、
  ことばは `i18n-*.js`（英語と日本語で同じキー）
- `src/todo_app_frontend/assets/` — CSS・SW・manifest・アイコン（そのまま配る）
- `tests/*.test.mjs` — node だけで回る検算。`e2e/e2e.mjs` — 実ブラウザの通しテスト（391 項目）
- `.github/workflows/ci.yml` — CI。何を確かめているかの正はここ

## 検査の回しかた

クラウド環境（Claude Code on the web）では、最初に一度:

```bash
bash scripts/cloud-setup.sh     # npm ci・dfx・e2e 用 Playwright（約 10 秒）
bash scripts/cloud-check.sh     # CI 相当を全部（node 検算 → replica → ビルド検証 → e2e。約 5 分）
bash scripts/cloud-check.sh --quick   # node の検算だけ（数十秒）
```

個別に回すとき: `node tests/<name>.test.mjs`、e2e は `node e2e/e2e.mjs http://$(dfx canister id todo_app_frontend).localhost:4943/`。
画面を変えたら e2e まで回す。ことばを足したら `i18n-keys`、画面の文字を変えたら `no-emoji` が落ちないか見る。

クラウド環境で分かっている落とし穴（スクリプトで手当て済み）:
- dfx の公式インストーラ（dfxvm）はプロキシ越しで失敗する → tarball を curl で落とす
- `e2e.mjs` の `import "playwright"` は環境の Playwright が見えない → node_modules に symlink。`npx playwright install` はしない
- Node から `*.localhost` が引けない → `/etc/hosts` に足す

## 守ること

- **配備しない。** `scripts/deploy.sh` は人が RPi5 から実行する（配備鍵は外に出さない）。`--network ic` の dfx コマンドも打たない
- **こどものデータを外に出さない。** 記録は `localStorage` だけ。サーバーへ送る処理を足さない
- **外部の CDN・フォント・画像を読み込まない。** すべて自前
- **画面に絵文字を出さない**（端末によって豆腐になる）。顔などは自前の SVG（`faces.js`）。コメント中の 🔴 ⚠️ は可
- アクセス解析は GA4 だけ、本番ホストでだけ動く（`analytics.js`）。CI・ローカルでは 1 本も送らない
- 見やすさは数で担保（押すところ 44px 以上・コントラスト基準・320〜1280px で横あふれ 0）。e2e が全数検査する
- TypeScript 7 は ts-loader が使えないので上げない（Dependabot で止めている）

## コミット

`feat(wbc): …` `fix(drill): …` `chore(deps): …` の形で、要約は日本語。
