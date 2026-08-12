#!/usr/bin/env bash
#
# キマルを Internet Computer メインネットへデプロイする。
#
#   bash scripts/deploy.sh                  フロントエンドだけ更新（既定）
#   bash scripts/deploy.sh --backend        バックエンドも upgrade する（保存データは残る）
#   bash scripts/deploy.sh --reset-backend  バックエンドを作り直す（保存データは消える）
#
# 既定でフロントエンドだけにしているのは、`dfx deploy` が canister 名を指定しても
# 依存先まで install してしまい、意図せずバックエンドの状態を触るのを避けるため。
#
set -euo pipefail

BACKEND_ID="ifoqp-6iaaa-aaaaj-qnnrq-cai"
BACKEND="todo_app_backend"
FRONTEND="todo_app_frontend"
SITE="https://iqjbc-7aaaa-aaaaj-qnnsa-cai.icp0.io/"

# 実行に使う identity。RPi5 から動かすときは KIMARU_IDENTITY=kimaru-deploy を渡す
IDENTITY="${KIMARU_IDENTITY:-}"
dfxx() {
  if [ -n "$IDENTITY" ]; then dfx --identity "$IDENTITY" "$@"; else dfx "$@"; fi
}

mode="frontend"
case "${1:-}" in
  "") ;;
  --backend) mode="backend" ;;
  --reset-backend) mode="reset" ;;
  *) echo "使い方: bash scripts/deploy.sh [--backend|--reset-backend]" >&2; exit 2 ;;
esac

cd "$(dirname "$0")/.."

if [ "$mode" = "reset" ]; then
  echo "!! バックエンドを作り直します。保存されている調整と回答はすべて消えます。"
  printf "続けるなら yes と入力してください: "
  read -r answer
  [ "$answer" = "yes" ] || { echo "中止しました"; exit 1; }
fi

echo "==> 依存をインストール"
npm ci

echo "==> 前回ビルドの残骸を掃除（webpack に output.clean が無いため）"
rm -rf dist

echo "==> フロントエンドをビルド（network=ic）"
DFX_NETWORK=ic CANISTER_ID_TODO_APP_BACKEND="$BACKEND_ID" npx webpack --mode production

echo "==> 生成物を検証"
tags="$(grep -c '<script' dist/todo_app_frontend/index.html)"
if [ "$tags" -ne 1 ]; then
  echo "    NG: index.html の script タグが ${tags} 個。1 個であるべき" >&2
  exit 1
fi
grep -q 'ic0.app' dist/todo_app_frontend/index.js || { echo "    NG: バンドルが ic0.app を向いていない" >&2; exit 1; }
grep -q "$BACKEND_ID" dist/todo_app_frontend/index.js || { echo "    NG: バンドルに backend canister id が無い" >&2; exit 1; }
echo "    OK: script タグ 1 個 / ic0.app / backend canister id"

echo "==> ビルド"
dfxx build --network ic "$FRONTEND"

case "$mode" in
  backend)
    echo "==> バックエンドを upgrade"
    dfxx canister install "$BACKEND" --network ic --mode upgrade
    ;;
  reset)
    echo "==> バックエンドを作り直し"
    dfxx canister install "$BACKEND" --network ic --mode reinstall --yes
    ;;
esac

echo "==> フロントエンドを更新"
dfxx canister install "$FRONTEND" --network ic --mode upgrade

echo "==> 稼働確認"
dfxx canister --network ic call "$BACKEND_ID" health '()' --query

echo
echo "完了: ${SITE}"
