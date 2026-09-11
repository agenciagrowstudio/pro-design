#!/usr/bin/env bash
# Prepara o video do hero para scrubbing por scroll.
# Uso: bash tools/build-video.sh "/caminho/do/master.mp4"
# Recodifica com um keyframe em CADA frame (GOP=1). Sem isso o seek por
# scroll fica travado, porque o navegador precisa voltar ate o keyframe anterior.
set -euo pipefail

SRC="${1:-}"
[ -z "$SRC" ] && { echo "Informe o arquivo de origem."; exit 1; }
[ -f "$SRC" ] || { echo "Arquivo nao encontrado: $SRC"; exit 1; }

FPS=30
LARGURA_MOBILE=1080
OUT_DIR="assets/video"
IMG_DIR="assets/img"
mkdir -p "$OUT_DIR" "$IMG_DIR"

echo "Origem:"
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,nb_frames \
  -show_entries format=duration -of default=noprint_wrappers=1 "$SRC"

echo ""
echo "Gerando versao desktop 1280p @ ${FPS}fps ..."
ffmpeg -y -v error -i "$SRC" -an \
  -vf "fps=${FPS},scale=1280:-2,format=yuv420p" \
  -c:v libx264 -preset slow -crf 25 -g 1 -keyint_min 1 -sc_threshold 0 \
  -movflags +faststart "$OUT_DIR/hero-construction.mp4"

# No celular nao roda video: o seek quadro a quadro nao fica fluido em
# aparelho movel. Ficam duas imagens fixas, o primeiro e o ultimo quadro,
# que e o que mantem a leitura de obra bruta virando casa pronta.
DURACAO=$(ffprobe -v error -select_streams v:0 -show_entries format=duration \
  -of default=noprint_wrappers=1:nokey=1 "$SRC")
FIM=$(awk -v d="$DURACAO" 'BEGIN { printf "%.3f", (d > 0.1 ? d - 0.05 : 0) }')

echo "Gerando as imagens fixas do celular ..."
ffmpeg -y -v error -ss 0 -i "$SRC" -frames:v 1 \
  -vf "scale=${LARGURA_MOBILE}:-2" -q:v 4 "$IMG_DIR/hero-mobile.jpg"
ffmpeg -y -v error -ss "$FIM" -i "$SRC" -frames:v 1 \
  -vf "scale=${LARGURA_MOBILE}:-2" -q:v 4 "$IMG_DIR/offer-mobile.jpg"

echo "Gerando poster ..."
ffmpeg -y -v error -ss 0 -i "$SRC" -frames:v 1 -vf "scale=1600:-2" -q:v 4 "$IMG_DIR/hero-poster.jpg"

echo ""
echo "Pronto:"
ls -lh "$OUT_DIR" "$IMG_DIR/hero-poster.jpg" "$IMG_DIR/hero-mobile.jpg" "$IMG_DIR/offer-mobile.jpg"
