#!/bin/sh
set -eu
cd "$(dirname "$0")"
echo 'Open http://127.0.0.1:8765 in your browser. Close this window to stop the server.'
echo '请在浏览器打开 http://127.0.0.1:8765'
echo '关闭这个窗口即可停止网页服务。'
node tools/serve.cjs
