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

# RPi5 に置いている配備鍵は平文保存のため、dfx が mainnet 向けコマンドを警告で止める。
# 鍵を RPi5 の外へ出さない方針なのでここで明示的に黙らせる。
export DFX_WARNING=-mainnet_plaintext_identity

# RPi5 は glibc 2.36 なので dfx 0.32 は起動できない（GLIBC_2.38/2.39 not found）。
# dfxvm の入り口が PATH の先にいると そちらを掴むので、動く版が ~/.local/bin にあれば そちらを使う。
if ! dfx --version >/dev/null 2>&1 && [ -x "$HOME/.local/bin/dfx" ]; then
  PATH="$HOME/.local/bin:$PATH"
  export PATH
  echo "==> PATH の dfx が起動できないので $HOME/.local/bin/dfx を使います（$(dfx --version)）"
fi

BACKEND_ID="ifoqp-6iaaa-aaaaj-qnnrq-cai"
BACKEND="todo_app_backend"
FRONTEND="todo_app_frontend"
SITE="https://iqjbc-7aaaa-aaaaj-qnnsa-cai.icp0.io/"

# 実行に使う identity。RPi5 から動かすときは KIMARU_IDENTITY=kimaru-deploy を渡す。
# 渡し忘れると default identity になり、アセット canister には controller とは別に
# Prepare/Commit 権限が要るので「Caller does not have Prepare permission」で落ちる
# （2026-08-27 に踏んだ）。配備鍵が入っている機械では既定でそれを使う。
IDENTITY="${KIMARU_IDENTITY:-}"
if [ -z "$IDENTITY" ] && dfx identity list 2>/dev/null | grep -qx "kimaru-deploy"; then
  IDENTITY="kimaru-deploy"
  echo "==> identity: kimaru-deploy（KIMARU_IDENTITY 未指定のため）"
fi
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
  if [ -t 0 ]; then
    printf "続けるなら yes と入力してください: "
    read -r answer
  else
    # ssh 越しなど端末が無いときは環境変数で明示させる（黙って作り直さない）
    answer="${KIMARU_RESET_CONFIRM:-}"
  fi
  [ "$answer" = "yes" ] || { echo "中止しました"; exit 1; }
fi

echo "==> 依存をインストール"
npm ci

echo "==> 前回ビルドの残骸を掃除（webpack に output.clean が無いため）"
rm -rf dist

echo "==> バックエンドの 型宣言を 作る"
# clone したての ときは src/declarations/ が 無く（生成物なので git に 置いて いない）、
# webpack が その 参照を 解けずに こける（Cannot resolve declarations/todo_app_backend）。
dfxx generate "$BACKEND"

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
    # EOP（enhanced orthogonal persistence）の canister は、保存データを引き継ぐことを
    # 明示しないと upgrade が拒否される（Missing upgrade option）
    echo "==> バックエンドを upgrade（保存データは引き継ぐ）"
    dfxx canister install "$BACKEND" --network ic --mode upgrade --wasm-memory-persistence keep
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
