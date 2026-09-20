#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ ! -f tools/Inspector/bin/Debug/net10.0/Inspector.dll ]; then
 node tools/prepare-assets.cjs
fi
dotnet tools/Inspector/bin/Debug/net10.0/Inspector.dll "$@"
