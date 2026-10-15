#!/usr/bin/env sh
# Gera as versões reduzidas (latim) da Montserrat embutidas no build de artefato
# do Print Studio (print-studio/web/src/assets/fonts). Requer: pip install fonttools
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$DIR/web/src/assets/fonts"
mkdir -p "$OUT"
for w in Regular SemiBold Bold Black; do
  pyftsubset "$DIR/server/fonts/Montserrat-$w.ttf" \
    --unicodes="U+0020-007E,U+00A0-017F,U+0192,U+02C6,U+02DA,U+02DC,U+2013-2014,U+2018-201E,U+2022,U+2026,U+20AC,U+2122" \
    --layout-features='kern,liga,calt,ccmp,locl,mark,mkmk' --name-IDs='*' --notdef-outline \
    --output-file="$OUT/Montserrat-$w.ttf"
done
cp "$DIR/server/fonts/OFL.txt" "$OUT/OFL.txt"
ls -la "$OUT"
