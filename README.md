# ICP Learning Project

Internet Computer Protocol (ICP) とMotoko言語の学習プロジェクト

## 📝 プロジェクト概要
ICP（Internet Computer）上で動作する「継続カウンター」アプリを開発。
dfxのバージョン問題、Motokoの型システム、Cycles Walletの設定など、
実際の開発で遭遇した課題と解決策を詳細に記録しています。

## 🎯 学習目的
- ブロックチェーン技術（ICP）の理解
- Motoko言語によるスマートコントラクト開発
- 分散型アプリケーション（dApp）の実装

## 🛠️ 技術スタック
- **Backend**: Motoko (Canister Smart Contract)
- **Frontend**: JavaScript, HTML/CSS
- **Platform**: Internet Computer Protocol (ICP)
- **Deployment**: ICP Mainnet

## 🔑 主な技術的特徴
- リバースガスモデルの実装（ユーザーのガス代負担なし）
- オンチェーンデータ永続化
- フロントエンド・バックエンド両方をオンチェーンで運用

## 📚 学んだこと
- ブロックチェーンベースのアプリケーション設計
- Motoko言語の基本文法とCanisterの仕組み
- ICP特有のリバースガスモデル
- 分散型ホスティング

## ✅ 解決済みの課題

**カウンター値が意図せず +2 される問題** — 原因を特定して解決

原因は非同期処理の重複ではなく、`index.js` が 2 回実行されていたことでした。
テンプレート `index.html` に自前で書いた `<script src="index.js"></script>` に加えて、
HtmlWebpackPlugin が同じバンドルを自動注入していたため、同一スクリプトが 2 回評価され、
クリックリスナーが二重登録されて `increment()` が 2 回呼ばれていました。
（本番の配信 HTML に `<script src="index.js">` が 2 個並んでいることで確認）

→ テンプレート側の `<script>` タグを削除し、注入に一本化しました。

**フロントエンドにカウンター用スタイルが無かった問題** — 解決

`style.css` の中身が ToDo アプリ時代の残骸（`#add-task` / `.delete-btn` / `li`）で、
カウンター用のルールが 1 行も存在しませんでした。

→ 全面的に書き直し、置き場所を `src/todo_app_frontend/assets/` へ移しました。
このディレクトリは `dfx.json` の assets ソースとしてキャニスタールートへ配信されるため、
webpack のコピー設定に依存せず確実に届きます。

## 🌐 デモ
https://iqjbc-7aaaa-aaaaj-qnnsa-cai.icp0.io/

## 💡 関連リンク
- **Gas Top Up で使ったサイト**: https://www.icptopup.com/

---

## ICP シンプルアプリ開発 - 記録 (Motoko & Vanilla JS)

Internet Computer (ICP) は、Web アプリケーションを完全にオンチェーンで構築・実行できる革新的なプラットフォームです。しかし、その新しさゆえに、開発プロセスには独自の課題や予期せぬ落とし穴が存在します。

この記事では、シンプルな Web アプリ「継続カウンター」を Motoko (バックエンド) と Vanilla JS (フロントエンド) で開発しようとした際に、筆者 (と AI アシスタント) が実際に直面した数々のエラーとその解決策、そしてそこから得られた教訓を、具体的なコード例やミスの例を交えながら詳細に記録します。

**目標:** 誰でも無料で使える「継続カウンター」を ICP メインネットにデプロイする。

**環境:** Ubuntu (WSL), `dfx`, Node.js, npm

### フェーズ 1: プロジェクト開始と最初の躓き

**1.1. `dfx new` と環境確認の重要性**

意気揚々とプロジェクトを開始。

```bash
dfx new counter_app
# Backend: Motoko, Frontend: Vanilla JS を選択
cd counter_app
```

しかし、この時点で AI アシスタントは重要な確認を怠っていました。それは **Node.js と npm がインストールされているか**どうかです。

最初のデプロイ試行時 (`dfx deploy`) にフロントエンドビルドでエラーが発生。

```
WARN: Node could not be found. Skipping installing the frontend example code.
... (後の npm run build でエラー) ...
```

> **教訓 1:** `dfx new` を実行する前に、`node -v` と `npm -v` で Node.js/npm のインストールを確認する。なければ `sudo apt update && sudo apt install nodejs npm -y` でインストール。

**1.2. 不要コードの削除と `dfx.json` の編集ミス**

当初、よりシンプルな構成を目指し、バックエンド (`src/counter_app_backend`) を削除し、フロントエンド (assets Canister) から直接データを読み書きしようと試みました (これは後に間違いだと気づきます)。

その際、`dfx.json` を編集する必要がありました。

```bash
rm -rf src/counter_app_backend
nano dfx.json # backend 定義と frontend の dependencies を削除
```

しかし、JSON ファイルの編集で **コメント (`// ...`) を削除し忘れる**、あるいは**カンマ (`,`) のつけ忘れ・消し忘れ**といった基本的なミスを犯し、`dfx generate` や `dfx deploy` 時に JSON パースエラー (`expected ',' or '}'`, `key must be a string` など) が頻発しました。

ミスの例 (`dfx.json`):
```json
{
  "canisters": {
    "counter_app_frontend": {
      "frontend": { ... },
      "source": [ ... ] // ← 前の行との間にカンマが必要なのに忘れる
      "type": "assets" // ← コメントを残してしまう
    }
  }, ...
}
```

> **教訓 2:** `dfx.json` は厳密な JSON 形式である。コメントは不可。カンマはオブジェクトの最後のキー/値ペアや配列の最後の要素の後には不要、それ以外では必要。編集後は文法チェックツールを使うか、`dfx` コマンドのエラーメッセージを注意深く読む。

---

### フェーズ 2: Motoko バックエンド実装 - 型とライブラリの迷宮

フロントエンドだけで状態を持つのは ICP らしくない、ということで Motoko バックエンドを復活させる方針に転換。シンプルなカウンター機能 (`increment`, `getCount`) を実装します。ここからが本当の戦いの始まりでした。

**2.1. データ構造の選択: 配列 (`Array`) との格闘**

最初は最も単純な Motoko の配列 (`[var Task]` - ToDo アプリからの流用) でカウンターを管理しようとしました。

最初のコード (部分・誤りを含む):
```motoko
actor CounterBackend {
    var tasks : [var Task] = []; // 可変配列 (ToDoの名残)
    // ... increment など ...
    func toggle_completed(id: Nat) {
        // 間違い: C言語風ループ
        for (i in 0 .. tasks.size() - 1) { /* ... */ }
    }
}
```

すぐに `tasks.size()` の箇所で `syntax error [M0001], unexpected token '.'` エラーが発生。Motoko ではメソッド呼び出しではなく `Array.size(tasks)` を使う必要がありました。

修正コード 1:
```motoko
import Array "mo:base/Array";
// ...
    func toggle_completed(id: Nat) {
        let size = Array.size(tasks);
        if (size > 0) {
            // まだ間違い: 範囲指定も直接は使えない
            for (i in 0 .. size - 1) { /* ... */ }
        }
    }
// ...
```

これでもループ部分でエラー。Motoko の `for` はイテレータ用なので、`while` ループに修正。

修正コード 2:
```motoko
import Array "mo:base/Array";
// ...
    func toggle_completed(id: Nat) {
        var i = 0;
        while (i < Array.size(tasks)) { /* ... */ i += 1; }
    }
// ...
```

これで構文エラーは消えましたが、今度は `dfx generate` で `Array.append` や `Array.size` に関する型エラー (`M0098`, `M0091`) が頻発。

```
type error [M0098], cannot implicitly instantiate function ... to argument of type ([var Task], ...)
type error [M0091], immutable array expression cannot produce expected type [var Task]
```

これは、dfx 0.20.1 (安定版にダウングレード後) でも発生し、Motoko の汎用関数が可変配列 (`[var T]`) の型推論をうまく扱えない問題を示唆していました。空の可変配列の初期化 (`[]` vs `[var]`) や、型注釈 (`Array.append<Task>(...)`) を試すも解決せず。

> **教訓 3:** Motoko の配列、特に可変配列と `Array` モジュールの関数の組み合わせは、バージョンによっては型推論が不安定になることがある。基本的な操作でもエラーが出続ける場合は、データ構造の変更を検討する。

**2.2. HashMap / TrieMap と dfx バージョンの闇**

配列がダメなら Map 系だ、ということで `HashMap` を試しました。

```motoko
import HashMap "mo:base/HashMap";
import Nat "mo:base/Nat";
// ...
    // 最初の試み (エラー M0050: 引数が足りない)
    // var tasks : HashMap.HashMap<Nat, Task> = HashMap.HashMap<Nat, Task>(0);
    // 次の試み (エラー M0072: Nat.hash が存在しない!?)
    // var tasks : HashMap.HashMap<Nat, Task> = HashMap.HashMap<Nat, Task>(0, Nat.equal, Nat.hash);
// ...
```

dfx 0.25.1 環境では、`HashMap` の初期化で「ハッシュ関数が必要 (M0050)」と「指定された `Nat.hash` が存在しない (M0072)」という矛盾したエラーが発生。`TrieMap` でも同様の問題 (`field empty does not exist` や `field put does not exist`) が発生。

これが、**dfx のバージョン (特にベータ版や最新直後) とライブラリの互換性問題**である可能性に気づく大きなきっかけとなりました。

**解決策:** dfx を安定版 (0.20.1) にダウングレード。

> **教訓 4:** 原因不明の型エラーやライブラリ関数エラーが続く場合、dfx のバージョンを疑う。安定版へのダウングレードや、キャッシュクリア (`dfx cache delete`) を試す価値がある。AI アシスタントも、この可能性をもっと早く指摘すべきでした。

**2.3. 最終的なバックエンドコード (不変配列 + map/filter)**

安定版 dfx にしても `Array` モジュールと可変配列の相性が悪かったため、最終的に**不変配列 (`[Task]`)** をベースとし、更新処理は `Array.map` (トグル用) と `Array.filter` (削除用、今回はカウンターなので不要だが) を使って新しい配列を生成・再代入する関数型スタイルに落ち着きました。

```motoko
// 最終的なカウンター用コード (抜粋)
import Nat "mo:base/Nat";
import Array "mo:base/Array"; // map, filter を使うなら必要

actor CounterBackend {
    var count : Nat = 0; // 結局カウンターだけになった
    public func increment() : async () { count += 1; };
    public query func getCount() : async Nat { return count; };
}
```

(最終的にカウンターだけになったため、配列すら不要になりましたが、ToDo の場合はこのスタイルが有効でした)

> **教訓 5:** Motoko では、状態の更新時に新しい不変データ構造を生成して再代入する関数型スタイルの方が、型エラーが少なく、コードが簡潔になる場合がある (`map`, `filter` の活用)。

---

### フェーズ 3: フロントエンド連携とデバッグ

バックエンドが（紆余曲折を経て）完成し、いよいよフロントエンドとの連携とデプロイです。

**3.1. Webpack と環境変数**

Webpack でフロントエンドをビルドする際、`webpack.config.js` の設定が重要です。

- **ES Modules vs CommonJS:** `webpack.config.js` は Node.js で実行されるため、`import` 文を使いたい場合は `package.json` に `"type": "module"` を追加するか、`webpack.config.js` を `require` を使う CommonJS 形式で書く必要があります (CommonJS 形式で解決)。
- **Canister ID の注入:** メインネットデプロイ時にバックエンド Canister ID をフロントエンドに伝える必要があります。`dfx deploy --network ic` は `CANISTER_ID_<canister_name>` という環境変数を設定します。Webpack では `webpack.DefinePlugin` や `dotenv-webpack` を使ってこれを `process.env` 経由で JavaScript コードに渡します。参照する環境変数名 (`process.env.CANISTER_ID_TODO_APP_BACKEND` など) を正確に合わせる必要があります (ここでミスが発生し修正)。

**3.2. アセットの重複と `.ic-assets.json5`**

`dfx deploy` は `dfx.json` の `"source"` と Webpack の出力先 (`dist`) の両方からアセットをアップロードしようとすることがあります。

- Webpack の `CopyPlugin` で `src/assets` を `dist` にコピーする設定があると、`dfx.json` の `source` 設定と重複し、`Asset with key '...' defined at ... and ...` エラーが発生します (今回発生)。`CopyPlugin` を削除して解決。
- 古い dfx で生成された `.ic-assets.json5` ファイルが残っていると、新しい (またはダウングレードした) dfx では互換性がなく `unknown field 'security_policy'` エラーが発生します (今回発生)。`src` と `dist` の両方から削除して解決。

**3.3. フロントエンドの謎の挙動「+2 問題」**

デプロイ後、ボタンを1回クリックするとカウンターが2増える現象が発生。

- **原因特定:** ブラウザの開発者ツールコンソールで `console.log` を仕込み、イベントハンドラ内の処理が2回実行されていることを確認。さらに `DOMContentLoaded` イベント自体が2回発火しているログも確認。
- **切り分け:** Candid UI でバックエンド関数を直接呼び出し、正常に +1 されることを確認。問題はフロントエンド側にあると断定。
- **対策:**
  - イベントリスナーの二重登録を疑い `removeEventListener` を試すも効果なし。
  - `DOMContentLoaded` 内に初期化フラグ (`isInitialized`) を設けるも効果なし。
  - **最終的な推測:** ブラウザ拡張機能の影響、または Webpack のビルド設定/HMR の副作用が濃厚。
- **妥協案:** ハッカソン提出期限を考慮し、これを「既知の問題」として README に記載し、UI の文言も「+2 ?」のように変更して提出する方針に決定。

> **教訓 6:** フロントエンドの予期せぬ挙動は、まずブラウザ開発者ツールのコンソールとネットワークタブを確認する。それでも原因不明な場合、ブラウザ拡張機能を無効化してみる、ビルドキャッシュや `dist` を完全に削除してみる、別のブラウザで試す、などの基本的なデバッグ手法が有効。

---

### フェーズ 4: Cycles Wallet とメインネットデプロイの壁

メインネットデプロイには Cycles Wallet が必須です。

- **Wallet 作成のコスト:** `dfx ledger create-canister` で Wallet を作るには、初期費用としてまとまった Cycles (0.5T Cycles 程度) が必要で、それに対応する ICP を `--amount` で指定する必要がある (0.01 ICP では不足しエラー発生)。
- **Wallet コードのインストール:** 作成した Wallet Canister にはコードが入っていません。`dfx wallet upgrade` でコードをインストールする必要があります。
- **set-wallet と upgrade のジレンマ:** Wallet が設定されていないと `upgrade` できず、コードがないと `set-wallet` が（通信試行時に）失敗するという状況に陥ることがありました (dfx 0.20.1 で発生)。
  - **回避策:** NNS Dapp など外部から Wallet Canister に直接 Cycles を送り、`dfx deploy --network ic --with-cycles <amount>` でデプロイを試みるか、今回最終的に成功したように、何らかのタイミングで `set-wallet` が通るのを待ってから `upgrade` する。
- **Identity と NNS Dapp:** dfx で作成した Identity の Principal に直接 ICP を送っても、その Identity を Internet Identity (II) に登録しない限り、NNS Dapp からはその ICP を Cycles に変換できません (ここで混乱が発生)。Cycles を Dapp 経由で管理・チャージするには II 登録が実質的に必要です。

> **教訓 7:** Cycles Wallet の準備は、特に初めての場合、手順が多く躓きやすい。エラーメッセージをよく読み、必要な Cycles 量を確保し、Identity と Wallet の関係、II の必要性を理解しておくことが重要。

---

### まとめと今後の展望

シンプルなカウンターアプリの開発でしたが、dfx のバージョン互換性、Motoko の型システムとライブラリの癖、フロントエンドビルド設定、Cycles Wallet の準備など、多くの課題に直面しました。特に dfx のバージョン問題は、多くの時間を費やす原因となりました。

しかし、これらの問題を一つずつ解決していく過程で、ICP 開発の様々な側面について深く学ぶことができました。エラーメッセージを読み解き、原因を推測し、仮説を立てて検証するというデバッグの基本プロセスが非常に重要であることを再認識しました。

今回の「継続カウンター（+2 仕様）」は完璧ではありませんが、ICP 上で動作する分散型アプリケーションの一例として、価値はあると信じています。

今後の課題としては、まず「+2 問題」の原因を特定し修正すること、そして当初の目標であった Internet Identity によるユーザー別管理機能の実装に再挑戦したいと考えています。

ICP 開発は挑戦しがいのある分野です。この記事が、同じように奮闘する開発者の皆さんの助けとなれば幸いです。

---

*Note: これは新しい技術（ICP/Motoko）の学習を目的とした個人プロジェクトです。*
