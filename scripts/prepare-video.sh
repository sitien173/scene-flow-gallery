#!/usr/bin/env bash
# Converts a 9:16 scene-flow render into the published MP4 and WebP poster,
# then prints a manifest entry as JSON on stdout. This script never uploads.
set -euo pipefail

# Byte-order collation for the slug regex and "." as the awk decimal point.
export LC_ALL=C

usage() {
  cat <<'EOF'
Usage: scripts/prepare-video.sh <input> <slug> <poster-time-seconds>

Writes media/<slug>-v<VERSION>.mp4 and media/<slug>-v<VERSION>.webp, and prints
a manifest entry as JSON on stdout. Environment:
  VERSION                 output suffix, positive integer (default 1)
  NEXT_PUBLIC_MEDIA_HOST  bare hostname in the printed URLs (default media.example.com)
EOF
}

die() {
  echo "prepare-video: $*" >&2
  exit 1
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -ne 3 ]]; then
  usage >&2
  exit 2
fi

input="$1"
slug="$2"
poster_time="$3"
version="${VERSION:-1}"
media_host="${NEXT_PUBLIC_MEDIA_HOST:-media.example.com}"

for tool in ffmpeg ffprobe awk; do
  command -v "$tool" >/dev/null 2>&1 || die "required tool not found: $tool"
done

[[ "$slug" =~ ^[a-z0-9-]+$ ]] || die "slug must be lowercase letters, digits, or hyphens: $slug"

case "$input" in
  /*) ;;
  *) input="$PWD/$input" ;;
esac
[[ -f "$input" && -r "$input" ]] || die "input is not a readable regular file: $1"

[[ "$poster_time" =~ ^[0-9]+(\.[0-9]+)?$ ]] || die "poster time must be a non-negative number: $poster_time"
[[ "$version" =~ ^[1-9][0-9]*$ ]] || die "VERSION must be a positive integer: $version"
[[ "$media_host" =~ ^[A-Za-z0-9.-]+$ ]] || die "NEXT_PUBLIC_MEDIA_HOST must be a bare hostname: $media_host"

probe="$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height,sample_aspect_ratio:stream_side_data=rotation -of csv=p=0 "file:$input")" \
  || die "ffprobe failed on input: $1"
[[ -n "$probe" ]] || die "input has no video stream: $1"
IFS=, read -r width height sar_raw side_rot <<<"$probe"
[[ "$width" =~ ^[0-9]+$ && "$height" =~ ^[0-9]+$ ]] || die "could not read video size: $1"
[[ -z "$side_rot" || "$side_rot" =~ ^-?[0-9]+$ ]] || die "could not read rotation: $1"

# ffmpeg applies only the display matrix when it autorotates, so a legacy rotate tag
# with no display matrix would leave the frames unrotated. Reject it instead.
legacy_rot="$(ffprobe -v error -select_streams v:0 -show_entries stream_tags -of default=nw=1 "file:$input" \
  | awk -F= 'tolower($1) == "tag:rotate" { print $2 }')" || die "ffprobe failed to read tags: $1"
if [[ -z "$side_rot" && -n "$legacy_rot" ]]; then
  [[ "$legacy_rot" =~ ^-?[0-9]+$ ]] || die "could not read rotate tag: $1"
  (( legacy_rot % 360 == 0 )) || die "input has a rotate tag that ffmpeg does not apply: $1"
fi

case "$sar_raw" in
  "" | N/A | 0:1 | 0:0) sar_raw=1:1 ;;
esac
[[ "$sar_raw" =~ ^[1-9][0-9]*:[1-9][0-9]*$ ]] || die "could not read sample aspect ratio: $1"
sar_num="${sar_raw%:*}"
sar_den="${sar_raw#*:}"
# A quarter turn transposes the frame, so it also inverts the SAR.
case $(( ${side_rot:-0} % 180 )) in
  90 | -90) disp_w=$height disp_h=$width; swap=$sar_num; sar_num=$sar_den; sar_den=$swap ;;
  *) disp_w=$width disp_h=$height ;;
esac
# Displayed width is disp_w * sar_num / sar_den, so 9:16 means disp_w * sar_num * 16 == disp_h * sar_den * 9.
(( disp_w > 0 && disp_w * sar_num * 16 == disp_h * sar_den * 9 )) || die "input must be 9:16, found ${width}x${height}"

duration="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "file:$input")" \
  || die "ffprobe failed to read duration: $1"
[[ "$duration" =~ ^[0-9]+(\.[0-9]+)?$ ]] || die "input has no numeric duration: $1"
awk -v p="$poster_time" -v d="$duration" 'BEGIN { exit !(p < d) }' \
  || die "poster time $poster_time must be below duration $duration"

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
media_dir="$repo_root/media"
mkdir -p "$media_dir"
tmp_dir="$(mktemp -d "$media_dir/.tmp.XXXXXX")"
trap 'rm -rf "$tmp_dir"' EXIT

echo "encoding ${slug}-v${version}.mp4" >&2
ffmpeg -nostdin -v error -i "file:$input" \
  -map 0:v:0 -map '0:a:0?' \
  -vf "scale=720:1280,setsar=1" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 20 -preset medium \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  "$tmp_dir/video.mp4" >&2

echo "extracting ${slug}-v${version}.webp at ${poster_time}s" >&2
ffmpeg -nostdin -v error -ss "$poster_time" -i "file:$input" \
  -map 0:v:0 -frames:v 1 \
  -vf "scale=720:1280,setsar=1" \
  -c:v libwebp -q:v 80 \
  "$tmp_dir/poster.webp" >&2

# Read the first line only. HDR side data adds trailing fields to the probe line.
[[ -s "$tmp_dir/video.mp4" ]] \
  && IFS=, read -r out_codec out_w out_h _ < <(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height -of csv=p=0 "file:$tmp_dir/video.mp4" 2>/dev/null) \
  && [[ "$out_codec" == h264 && "$out_w" == 720 && "$out_h" == 1280 ]] \
  || die "encoded video failed verification: ${slug}-v${version}.mp4"
[[ -s "$tmp_dir/poster.webp" ]] \
  && IFS=, read -r out_w out_h _ < <(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "file:$tmp_dir/poster.webp" 2>/dev/null) \
  && [[ "$out_w" == 720 && "$out_h" == 1280 ]] \
  || die "no usable poster frame at ${poster_time}s; try an earlier poster time"

mv "$tmp_dir/video.mp4" "$media_dir/$slug-v$version.mp4"
mv "$tmp_dir/poster.webp" "$media_dir/$slug-v$version.webp"

duration_sec="$(awk -v d="$duration" 'BEGIN { printf "%.2f", d }')"
published_at="$(date +%F)"

printf '{\n  "slug": "%s",\n  "title": "TODO",\n  "theme": "dark",\n  "videoUrl": "https://%s/v/%s-v%s.mp4",\n  "posterUrl": "https://%s/v/%s-v%s.webp",\n  "durationSec": %s,\n  "publishedAt": "%s",\n  "lang": "vi",\n  "script": "TODO",\n  "creator": { "name": "TODO" },\n  "sources": { "voice": "self-recorded", "screenRecordings": false }\n}\n' \
  "$slug" "$media_host" "$slug" "$version" "$media_host" "$slug" "$version" "$duration_sec" "$published_at"
