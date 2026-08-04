#!/bin/zsh
# crop.sh <src.png> <x> <y> <w> <h> <out.png> [scale]
SRC=$1; X=$2; Y=$3; W=$4; H=$5; OUT=$6; S=${7:-1}
CX=$((X + W / 2)); CY=$((Y + H / 2))
sips -c $H $W --cropOffset $((Y)) $((X)) "$SRC" --out "$OUT" >/dev/null 2>&1
if [ "$S" != "1" ]; then
  sips -z $((H * S)) $((W * S)) "$OUT" --out "$OUT" >/dev/null 2>&1
fi
echo "$OUT"
