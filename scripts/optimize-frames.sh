#!/usr/bin/env bash
# Converts raw-frames/scene-N/* into desktop and mobile WebP sets.
# Desktop: public/frames at 1920x1080, quality 88 by default.
# Mobile: public/frames-m at 1280x720, quality 80.
#
# Handles ANY file names and mixed formats (png, jpg, jpeg, webp), e.g.
#   scene-1: ezgif-frame-001.png ...
#   scene-2: frame_000_delay-0.042s.webp ...
# Files are sorted in natural order (by the number in the name) and renamed
# to f_0001.webp, f_0002.webp ... so every scene ends up uniform.
#
# All frames in each set are forced to the SAME size (16:9) using
# "cover" scaling + center crop, so scenes with slightly different
# resolutions or aspect ratios still line up with no jumps.
#
# Requires: ffmpeg
# Usage:  bash scripts/optimize-frames.sh [desktop-width] [desktop-height] [desktop-quality]
#   defaults: 1920 1080 88; mobile defaults: 1280 720 80

set -euo pipefail

W="${1:-1920}"
H="${2:-1080}"
QUALITY="${3:-88}"
MOBILE_W=1280
MOBILE_H=720
MOBILE_QUALITY=80
IN="raw-frames"
OUT="public/frames"
OUT_MOBILE="public/frames-m"

command -v ffmpeg >/dev/null || { echo "ffmpeg not found. Install it first."; exit 1; }
[ -d "$IN" ] || { echo "Folder $IN not found."; exit 1; }

mkdir -p "$OUT"
mkdir -p "$OUT_MOBILE"
manifest='{"scenes":['
first=1

for dir in $(ls -d "$IN"/scene-* | sort -V); do
  name=$(basename "$dir")
  id=${name#scene-}
  mkdir -p "$OUT/$name"
  mkdir -p "$OUT_MOBILE/$name"
  rm -f "$OUT/$name"/*.webp
  rm -f "$OUT_MOBILE/$name"/*.webp

  # Collect frame paths (png/jpg/jpeg/webp), natural sort, preserving spaces.
  mapfile -d '' -t files < <(find "$dir" -maxdepth 1 -type f \( \
    -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' \
  \) -print0 | sort -zV)
  [ ${#files[@]} -gt 0 ] || { echo "No frames in $dir, skipping"; continue; }

  i=1
  for f in "${files[@]}"; do
    printf -v n "%04d" "$i"
    ffmpeg -loglevel error -y -i "$f" \
      -vf "scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${H}" \
      -frames:v 1 \
      -c:v libwebp -quality "$QUALITY" -compression_level 6 \
      "$OUT/$name/f_${n}.webp"
    ffmpeg -loglevel error -y -i "$f" \
      -vf "scale=${MOBILE_W}:${MOBILE_H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${MOBILE_W}:${MOBILE_H}" \
      -frames:v 1 \
      -c:v libwebp -quality "$MOBILE_QUALITY" -compression_level 6 \
      "$OUT_MOBILE/$name/f_${n}.webp"
    i=$((i+1))
  done

  count=$((i-1))
  echo "$name: $count frames"
  [ $first -eq 0 ] && manifest+=','
  manifest+="{\"id\":$id,\"dir\":\"$name\",\"mobileDir\":\"$name\",\"count\":$count}"
  first=0
done

manifest+=']}'
echo "$manifest" > "$OUT/manifest.json"
cp "$OUT/manifest.json" "$OUT_MOBILE/manifest.json"

echo "Done. Manifest: $OUT/manifest.json"
du -sh "$OUT" "$OUT_MOBILE"
