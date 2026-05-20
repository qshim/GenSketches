#!/usr/bin/env bash
# Convert any .webm files passed as args (or all .webm in cwd) to H.264 .mp4 using ffmpeg.
# Usage:
#   ./webm-to-mp4.sh                 # convert every .webm in current dir
#   ./webm-to-mp4.sh path/to/clip.webm [more.webm ...]
#
# Requirements: ffmpeg (brew install ffmpeg)

set -euo pipefail

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg not found. Install via: brew install ffmpeg" >&2
  exit 1
fi

if [ "$#" -eq 0 ]; then
  shopt -s nullglob
  files=( *.webm )
  if [ "${#files[@]}" -eq 0 ]; then
    echo "No .webm files in $(pwd)." >&2
    exit 1
  fi
else
  files=( "$@" )
fi

for in_file in "${files[@]}"; do
  if [ ! -f "$in_file" ]; then
    echo "skip: $in_file (not a file)"
    continue
  fi
  out_file="${in_file%.webm}.mp4"
  echo "→ $in_file  →  $out_file"
  ffmpeg -hide_banner -loglevel error -y \
    -i "$in_file" \
    -c:v libx264 -preset medium -crf 18 \
    -pix_fmt yuv420p \
    -movflags +faststart \
    "$out_file"
done

echo "done."
