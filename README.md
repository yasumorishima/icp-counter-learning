# キマル / Kimaru

**書き換えられない日程調整。** 広告なし、ログイン不要、集計はすべて Internet Computer 上。

Tamper-evident scheduling polls. No ads, no sign-up, and every response is written on-chain.

🌐 https://iqjbc-7aaaa-aaaaj-qnnsa-cai.icp0.io/

---

## なにが違うのか

| | よくある日程調整 | キマル |
|---|---|---|
| 回答の変更 | 上書き。前の回答は消える | **追記**。誰がいつ変えたかが残る |
| 別人による書き換え | 気づけない | **端末タグ**が変わるので画面で分かる |
| アカウント | 必要なことが多い | **不要**（ブラウザが鍵を持つ） |
| 広告・追跡 | あることが多い | **なし**。サーバー自体を持たない |
| 運営が消えたら | データも消える | キャニスターが動く限り残る |

## 仕組み

- **バックエンド**: Motoko キャニスター。調整・回答・履歴を保持する
- **フロントエンド**: Vanilla JS。asset キャニスターから配信される
- **本人確認**: ブラウザ内で Ed25519 鍵を生成し `localStorage` に置く。
  秘密鍵は端末から出ず、主催者かどうかはこの鍵の principal で判定する
- **端末タグ**: principal から導く 4 文字。同じ名前が別の端末から書き換えられると印が付く
- **ガス代**: リバースガスモデル。閲覧者も回答者も費用を負担しない

### 保存の上限（cycles を有界にするため）

| 項目 | 上限 |
|---|---|
| タイトル / 説明 | 100 / 500 文字 |
| 候補 | 20 件（1 件 60 文字） |
| 名前 / コメント | 30 / 200 文字 |
| 1 つの調整の回答 | 600 件 |
| 保存される調整 | 5,000 件 |
| 作成のペース | 1 端末 5 件/時、全体 100 件/時 |
| 保存期間 | 90 日で自動削除 |

匿名 principal からの書き込みは受け付けない。

## 対応言語

英語 / 日本語 / 中国語 / 韓国語 / スペイン語 / ポルトガル語 / フランス語 / ドイツ語 / ロシア語 / アラビア語（RTL）。
`src/todo_app_frontend/src/i18n.js` に 1 ブロック足せば言語を追加できる。

## 開発

```bash
npm ci
dfx start --clean --background
dfx deploy todo_app_backend
dfx generate todo_app_backend
npx webpack --mode development
dfx deploy todo_app_frontend
```

### 動作確認（実ブラウザ）

```bash
node e2e/e2e.mjs http://<frontend-canister-id>.localhost:4943/
```

作成 → 回答 → 変更の履歴 → 別端末からの書き換え検知 → 言語切替 → 明暗切替 →
締め切り → 支援ページ → 携帯幅での横あふれまでを、実際のブラウザで通しで確認する。

## デプロイ

```bash
bash scripts/deploy.sh                  # フロントエンドだけ更新
bash scripts/deploy.sh --backend        # バックエンドも upgrade（データは残る）
bash scripts/deploy.sh --reset-backend  # バックエンドを作り直す（データは消える）
```

`dfx deploy` を直接使わないのは、canister 名を指定しても依存先まで install してしまうため。
必要な dfx は 0.24 以降（`persistent actor` / `transient` 構文のため）。

## このサイトの費用について

サーバー代も広告もなく、キャニスターが計算と保存の費用を cycles で払っている。
残量はサイト内の「支援」ページに出ている。1 兆 cycles = 1 XDR の固定レート。

## 前身

このリポジトリは元々「禁欲カウンター」だった。カウンターはフッターに小さく残してある。
当時の開発記録は [docs/icp-learning-log.md](docs/icp-learning-log.md) に移した。

## ライセンス

MIT
