# ICP Learning Project

Internet Computer Protocol (ICP) とMotoko言語の学習プロジェクト

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

## 🐛 既知の課題
- カウンター値が意図せず+2される問題（非同期処理の重複実行と推測）
- 今後の改善課題として認識

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

---

*Note: これは新しい技術（ICP/Motoko）の学習を目的とした個人プロジェクトです。*
