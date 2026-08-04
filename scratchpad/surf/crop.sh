#!/bin/zsh
# crop.sh <src> <x> <y> <w> <h> <out> [scale]
src=$1; x=$2; y=$3; w=$4; h=$5; out=$6; sc=${7:-1}
ffmpeg -y -loglevel error -i "$src" -vf "crop=${w}:${h}:${x}:${y},scale=iw*${sc}:ih*${sc}:flags=neighbor" "$out"
echo "$out"
