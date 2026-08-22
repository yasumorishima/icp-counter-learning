# さんすう しょうぎ そら

[![CI](https://github.com/yasumorishima/icp-counter-learning/actions/workflows/ci.yml/badge.svg)](https://github.com/yasumorishima/icp-counter-learning/actions/workflows/ci.yml)

小学 1〜6年の 算数ドリルと、ひとりで あそべる しょうぎと、いまの 星空を そのまま 出す そら。
その場で解いて すぐ丸がつき、しょうぎの 相手も 星の 位置の 計算も この端末の 中で 動いています。
**広告なし、登録なし、記録は端末の中だけ。** 電波が無くても つかえます。

Free arithmetic practice for Japanese elementary school (grades 1–6).
Plus a shogi opponent and a planetarium that computes the real sky, both running entirely in the browser.
No ads, no sign-up, and every record stays on the child's own device.

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
| **しょうぎ** | ひとり用。つよさ 3 だんかい、ヒント・まった・棋譜・つづきから |
| **そら** | いまの 星空を そのまま。6.5 等までの 星 8,404 個・星座・天の川・月・惑星。指で 見まわし、星を 押すと 名前が 出る |
| **ことば** | 英語と 日本語。どの画面からでも 切りかえられ、えらんだ ことばは 端末に のこる。星の 名前も 星座の 名前も ことばに あわせて 変わる |

## しょうぎ

トップの 「なにを する？」で **さんすう / しょうぎ / そら** から えらびます。しょうぎは **ひとり用**で、
相手も この端末の 中で 考えています（通信なし・外部の 部品なし）。

- **つよさ 3 だんかい**（よわい / ふつう / つよい）。読みの 深さと 時間で 変えている
- **きまりは 全部いれた**: 成り（強制も）・持ち駒を 打つ・二歩・打ち歩詰め・
  行き所のない駒・王手放置の禁止・つみ / 手が無い ときの 負け・
  **おなじ ばんめんが 4 かい（千日手）＝引き分け。ただし 王手を かけつづけて いた ほうが
  あれば その ほうの 負け（連続王手の 千日手）**・
  **入玉（24点法）＝玉が あいての じんちに 入り、じんちの 駒が 10 まい 以上、
  31 点以上で 勝ち・24〜30 点で 引き分けに できる**
- **たすけ**: 押した駒の 行ける ますが 光る／その駒の うごきかたを ことばで 出す／
  ヒント（次の 一手を 提案）／まった／棋譜／読み込み直しても つづきから
- 対局の とちゅうも 記録も `localStorage` だけ。サーバーには 送りません

### 指せる手の 最終判断は 外の OSS がする

人が さわる 側（行ける ますの 表示・指す手の 受け付け）は、この中の きまりが 出した 手を
**tsshogi（MIT・sunfish-shogi）に 通してから** 画面に 出します。自分の 実装を 自分で 採点しない ため。

相手の 読みだけは 自前の きまりの まま です。1 手に 何万局面も 調べるので 速さが 要るためで、
実測で **1 局面あたり 自前 0.04ms / tsshogi 1.2ms（33 倍）**、bundle は **+15.2KB（gzip）** でした。
両者が 食い違った ことは 一度も ありません（下記の 突き合わせ）。

**しょうぶの つけかたも 外の OSS が 決めます**。おなじ ばんめんが 4 かい 出た ことは
この中の きまりが 見つけますが、「引き分けか、王手を つづけた ほうの 負けか」の 判決と、
入玉の 申し込みが できるか（じんちの 駒の 数・点数・王手中か・手番か）は tsshogi に 出させます。
画面には **できる ときしか ボタンを 出しません**（申し込んで 負ける みちを 作らない ため）。

### きまりが 正しいことの 確かめかた

駒の うごきと 王手の 判定は、決められた 手数ぶんの 合法手を 数え上げて（perft）
公表値と 突き合わせています。**5 手ぶん 19,861,490 手まで 完全一致**（CI では 4 手ぶん
719,731 手を 毎回）。ほかに 二歩・打ち歩詰め・成りの強制・王手放置・持ち駒の 戻りかたを
局面つきで 検算し、相手の 側も 「1 手詰めを 見つける」「60 手 指しても 反則ゼロ」
「1 手 3 秒いない」を 毎回 見ています。

外の OSS との 突き合わせも CI で 毎回 走ります。**246 局面で 合法手の 集合が 完全一致**、
さらに **200 手ぶん 1 手ごとに 局面ぜんたい（盤・持ち駒・手番）が 一致**することを 確かめています。

```
node tests/shogi-rules.test.mjs     # きまり（perft 4 手ぶんまで）
node tests/shogi-rules.test.mjs 5   # 5 手ぶんまで（時間が かかる）
node tests/shogi-ai.test.mjs        # 相手の 側
node tests/shogi-endings.test.mjs   # おわりかた（千日手の 区別・入玉の しきい値）
node tests/shogi-vs-oss.test.mjs    # 外の OSS（tsshogi）と 全数 突き合わせ

node scripts/make-shogi-fixtures.mjs  # 検査用の 一局を 作り直す（作った 手は 審判に 通してから 書き出す）
node scripts/make-og.mjs              # リンクを 貼った ときに 出る 画像（og.png）を 作り直す
```

## そら

その 時刻に、その 場所で、ほんとうに 頭の 上に ある 空を そのまま 描きます。
指で なぞると 見まわせて、星を 押すと 名前と 明るさが 出ます。

- **星 8,404 個**（肉眼で 見える 6.5 等まで）。出典は **Yale Bright Star Catalogue**（CDS 配布）。
  星の 色は B-V 色指数から 表面温度に 直して 付けているので、青いほど 熱い 星に なります
- **星座の 線・星座の 名前・天の川の 5 階調** は
  [d3-celestial](https://github.com/ofrohn/d3-celestial)（BSD 3-Clause / Olaf Frohn）の データ。
  星座の 名前は 日本語名と ラテン語名（IAU の 正式名）を 持っているので、ことばで 切り替えます
- **星の 固有名は 英語にも 出します**。同梱の 星表は 日本語名しか 持って いないので、
  **IAU Working Group on Star Names (WGSN)** の 決めた 綴り（IAU-CSN）へ 84 個 結びつけました
  （`src/todo_app_frontend/src/sky-names.mjs`）。**名前が 別の星に ついて いないかは、
  英語名ごとに バイエル符号を 書き出して 星表の 実データと 突き合わせます**
  （`tests/sky-names.test.mjs`）
- **出典と ライセンスは サイトからも たどれます**（`/THIRD-PARTY-NOTICES.txt` と、
  そらの 画面の「この 空に ついて」）。**本番の 成果物に 残って いるかを E2E で 毎回 確かめます**
  ＝最小化で コメントが 落ちて 表示が 消える ことが 実際に あったため
- **月は 満ち欠けの 向きまで** 描きます（明るい側が いつも 太陽の 方を 向く）
- **場所**は 日本の 10 都市から えらぶか、端末の 現在地。**日づけと 時こく**も えらべます
  （七夕の 空、生まれた 日の 空、といった 見かたが できます）
- 地図タイルも API も **外から 読みません**。座標を 同梱して この場で 計算するので、電波が 無くても 動きます

### 位置の 計算と、その 確かめかた

計算は すべて自前です（外部ライブラリ 0）。よりどころは
**Jean Meeus, Astronomical Algorithms (2nd ed.)** の 第12章（恒星時）・第21章（歳差）・
第22章（章動と 黄道傾斜）・第25章（太陽）・第47章（月）と、
JPL の *Keplerian Elements for Approximate Positions of the Major Planets*（惑星）。

**自分の 実装を 自分で 採点しない** ため、確かめかたを 二重に しています。

1. `tests/sky-astro.test.mjs` が **本に 答えの 載っている 例題**と 突き合わせます
   （例12.a 恒星時／例21.b 歳差／例25.a 太陽／例47.a 月）。再現の ずれは **1e-7〜1e-6 度**です
2. 惑星は **JPL Horizons（NASA/JPL）** と 直接 突き合わせて 精度を 実測しました。
   2026-08-19 12:00 UT・地心の 見かけ位置で、太陽 5.9 秒角・月 5.5 秒角・水星 6.0・金星 17・
   火星 20・木星 68・天王星 7.4・海王星 59、**最大が 土星の 4.4 分角**。
   これは JPL 近似要素の 既知の 限界で、月の 見かけの 大きさ（30 分角）より 小さく、
   星図の 上では 見分けが つきません

月の 満ち欠けは、**描いた 絵の 画素を 数えて** 確かめています（輝面比 0.4407 に対し 計算値 0.4419）。

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
320〜1280px で 横あふれ 0px、しょうぎの つみ・千日手（王手を つづけた ときの 負けも）・
入玉の 申し込み（できる とき / たりない とき / 相手が 申し込む とき）、
そらの 見まわし・ちかづく・星を 押して 名前が 出ること・出すものの 切り替え・時間送り、
英語に した ときに 日本語が のこって いないか（画面ごとに 総なめ）・ことばを 変えても
えらんだ 日時が 消えないこと・読み込み直しても のこること、
リンクを 貼った ときの 画像（絶対 URL・大きさ・実物が 配られて いること）まで、
**189 項目**を 実ブラウザで 確かめます。

画面が なくても できる 検算（node）は **197 項目**です。
しょうぎの きまり 25／あいて 11／終わりかた 39、そらの 計算 29／星の 名前 93。

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

このリポジトリの コードは **MIT**。

同梱している 外の データと 部品は それぞれの 条件に したがい、
**表示は [`src/todo_app_frontend/assets/THIRD-PARTY-NOTICES.txt`](src/todo_app_frontend/assets/THIRD-PARTY-NOTICES.txt)
に 全文を 置いて、サイトからも たどれるように して います**
（そらの 画面の「この 空に ついて」→「くわしい 表示」）。

| もの | 出どころ | 条件 |
|---|---|---|
| 星の 位置・明るさ・色 | Yale Bright Star Catalogue 5th Revised Ed.（Hoffleit &amp; Warren 1991・VizieR/CDS の V/50） | 学術目的の 再配布可 |
| 星座の 線・名前、天の川 | [d3-celestial](https://github.com/ofrohn/d3-celestial)（Olaf Frohn） | BSD 3-Clause |
| しょうぎの きまりの 判定 | [tsshogi](https://github.com/sunfish-shogi/tsshogi) | MIT |

🔴 **最小化は コメントを 落とす**ので、表示を ソースの コメントだけに 頼らない こと。
実ファイルとして 配り、**配られて いるかを E2E が 毎回 確かめます**
（2026-08-19 に 実際に 消えて いたのを 実測で 見つけました）。
