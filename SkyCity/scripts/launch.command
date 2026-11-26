#!/bin/zsh
set -e

if ! command -v python3 >/dev/null; then
  print -u2 '需要先安装 Python 3，才能启动《云深处》。'
  exit 1
fi

exec python3 "${0:A:h}/tools/play_local.py" "$@"
