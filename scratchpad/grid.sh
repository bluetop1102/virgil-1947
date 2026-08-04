#!/bin/zsh
# grid.sh <src.png> <outdir> — 300x300 표본 9개를 잘라 2배로 확대한다.
# 심사 검증 조건: 프레임 어느 300×300 영역을 잘라도 2차 디테일이 2종 이상 보일 것.
SRC=$1; OUT=${2:-scratchpad/grid}
mkdir -p $OUT
i=0
for Y in 120 620 1120; do
  for X in 220 1120 2020; do
    sips -c 300 300 --cropOffset $Y $X "$SRC" --out "$OUT/g$i.png" >/dev/null 2>&1
    sips -z 600 600 "$OUT/g$i.png" --out "$OUT/g$i.png" >/dev/null 2>&1
    echo "$OUT/g$i.png  (x=$X y=$Y)"
    i=$((i+1))
  done
done
