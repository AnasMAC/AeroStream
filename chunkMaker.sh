#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: ./chunk.sh <video_name.mp4>"
  exit 1
fi

BASENAME=$(basename "$1" .mp4)
mkdir -p "$BASENAME"

echo "Starting HLS Stream Copy for $1..."

# Notice we changed -c:v and -c:a to "copy" and removed the profile/level flags
ffmpeg -i "$1" \
  -c:v copy -c:a copy \
  -start_number 0 \
  -hls_time 5 \
  -hls_list_size 0 \
  -hls_segment_filename "$BASENAME/segment_%03d.ts" \
  -f hls \
  "$BASENAME/manifest.m3u8"

echo "Chunking complete! Check the ./$BASENAME/ directory."