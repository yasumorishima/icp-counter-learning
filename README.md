# さんすうドリル 1〜6年

[![CI](https://github.com/yasumorishima/icp-counter-learning/actions/workflows/ci.yml/badge.svg)](https://github.com/yasumorishima/icp-counter-learning/actions/workflows/ci.yml)

小学 1〜6年の 算数を、その場で解いて すぐ丸がつく ドリル。
**広告なし、登録なし、記録は端末の中だけ。** 電波が無くても つかえます。

Free arithmetic practice for Japanese elementary school (grades 1–6).
No ads, no sign-up, and every learning record stays on the child's own device.

🌐 https://iqjbc-7aaaa-aaaaj-qnnsa-cai.icp0.io/

---

## なにができるか

| | |
|---|---|
| **36 単元** | 全学年 6 単元ずつ。たし算・ひき算・九九（段ごと）・時計・わり算・分数・小数・がい数・面積・角度・割合・平均・体積・比・速さ・円の面積・場合の数 など |
| **きょうの 1まい** | その日ごとに 決まった 10 問。同じ日なら 何度ひらいても 同じ、日が変われば 変わる |
| **タイムアタック** | 60 びょうで 何問とけるか。学年ごとに さいこう記録 |
| **チャレンジ** | なつやすみ（7/21〜8/31）や 30日。毎日 1まい やって、さいごに **印刷できる しょうじょう** |
| **つづく仕組み** | ★とレベル、連続日数、今月のカレンダー、にがてな単元の出し直し |
| **きろく** | なまえごとに 6人まで。書き出し / よみこみ で 端末を移せる |

## 大事にしていること

- **こどものデータを 外に出さない。** 問題は 端末の中で作り、記録も `localStorage` だけ。
  サーバーに送るものは ありません
- **外の部品を 読み込まない。** フォント・音・かみふぶきまで 自前。外部の CDN も 追跡もゼロ
- **電波が無くても つかえる。** いちど ひらけば、そのあとは オフラインで 解けます
- **見やすさは 数で担保する。** 文字の大きさ 3 段、押すところは 44px 以上、
  明るい画面と 暗い画面の 両方で コントラスト基準（大きい字 3:1・ふつう 4.5:1）を
  CI が 毎回 全数検査します

## 動かしているところ

HTML・JavaScript・データの すべてが Internet Computer 上の キャニスターで 動いています。
サーバー代を 払う会社が いないので、消えることも 売られることも ありません。
キャニスター自身が 計算と保存の費用（cycles）を払い、**残りは 支援ページに 年数で 表示**しています。

**保存量が増えない作り**なので、使う人が増えても 費用は ほぼ 変わりません
（問題も記録も 端末の中で完結し、2 回目からは キャッシュから 表示されます）。

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
node e2e/e2e.mjs http://$(dfx canister id todo_app_frontend).localhost:4943/
```

作成〜採点〜記録の通し、きょうの 1まい の 日替わり、タイムアタック、チャレンジと しょうじょう、
オフラインで 解けること、押すところの 大きさ、明暗それぞれの コントラスト全数、
390px で 横あふれ 0px まで、**70 項目**を 実ブラウザで 確かめます。

### CI

push と PR のたびに 上を すべて実行します（鍵は 使いません）。
**反映は CI からは行いません**（配備鍵を GitHub に置かないため。`scripts/deploy.sh` を 人が実行します）。

## デプロイ

```bash
bash scripts/deploy.sh                  # フロントエンドだけ更新
bash scripts/deploy.sh --backend        # バックエンドも upgrade（データは残る）
bash scripts/deploy.sh --reset-backend  # バックエンドを作り直す（データは消える）
```

`dfx deploy` を直接使わないのは、**canister 名を指定しても依存先まで install してしまう**ため。

配備に使う identity は `KIMARU_IDENTITY` で指定します。

```bash
KIMARU_IDENTITY=kimaru-deploy bash scripts/deploy.sh
```

配備鍵は 平文で保存されているため dfx が メインネット向けのコマンドを 警告で止めますが、
`scripts/deploy.sh` の中で `DFX_WARNING` を設定してあるので 追加の操作は要りません。

端末を持たない環境（ssh 越しなど）から バックエンドを作り直すときは、確認を 環境変数で明示します。

```bash
KIMARU_RESET_CONFIRM=yes bash scripts/deploy.sh --reset-backend
```

### 初めて その identity で配備するとき

アセットキャニスターは controller とは別に 権限を持っています。
controller に加えただけでは `Caller does not have Prepare permission` で止まるので、
一度だけ Prepare と Commit を渡します。

```bash
dfx --identity kimaru-deploy canister --network ic call iqjbc-7aaaa-aaaaj-qnnsa-cai grant_permission '(record { to_principal = principal "<配備する principal>"; permission = variant { Prepare } })'
dfx --identity kimaru-deploy canister --network ic call iqjbc-7aaaa-aaaaj-qnnsa-cai grant_permission '(record { to_principal = principal "<配備する principal>"; permission = variant { Commit } })'
```

### dfx のバージョン

| 環境 | 使える dfx | 理由 |
|---|---|---|
| 一般 | 0.24 以降 | `persistent actor` / `transient` 構文 |
| Raspberry Pi 5 (Debian bookworm) | **0.29.2 まで** | 0.32 は glibc 2.38/2.39 を要求し、bookworm の 2.36 では起動しない |

## 前身

このリポジトリは 「禁欲カウンター」→「キマル（日程調整）」を経て いまの形になりました。
カウンターは フッターに 小さく残してあります。
当時の開発記録は [docs/icp-learning-log.md](docs/icp-learning-log.md) にあります。

## ライセンス

MIT
