#!/bin/zsh
# c.sh <src.png> <x> <y> <w> <h> <out.png> [scale]  — sips cropOffset 는 중심 기준이다
SRC=$1; X=$2; Y=$3; W=$4; H=$5; OUT=$6; S=${7:-1}
IW=$(sips -g pixelWidth "$SRC" | tail -1 | awk '{print $2}')
IH=$(sips -g pixelHeight "$SRC" | tail -1 | awk '{print $2}')
OX=$(( X - (IW - W) / 2 )); OY=$(( Y - (IH - H) / 2 ))
sips -c $H $W --cropOffset $OY $OX "$SRC" --out "$OUT" >/dev/null 2>&1
if [ "$S" != "1" ]; then sips -z $((H * S)) $((W * S)) "$OUT" --out "$OUT" >/dev/null 2>&1; fi
echo "$OUT"
