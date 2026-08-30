#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "Usage: $0 PROTOMAPS_SOURCE_URL [OUTPUT_FILE]" >&2
  exit 2
fi

if ! command -v pmtiles >/dev/null 2>&1; then
  echo "The pmtiles CLI is required: https://docs.protomaps.com/pmtiles/cli" >&2
  exit 1
fi

source_url=$1
output_file=${2:-morton-burleigh.pmtiles}

if [[ -e "$output_file" ]]; then
  echo "Refusing to overwrite existing file: $output_file" >&2
  exit 1
fi

# The 2025 Census county extent is -102.097197,46.284414 to
# -100.075229,47.327685. Pad it slightly so labels and roads do not disappear
# at the archive edge. PMTiles extracts tile-aligned bounds, not county polygons.
pmtiles extract \
  "$source_url" \
  "$output_file" \
  --bbox=-102.15,46.23,-100.02,47.38

pmtiles show "$output_file"
