#!/usr/bin/env bash
# AMO source archive: firefox-extension/ + common/ (+ README at zip root).
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$REPO/browser-control-mcp-firefox-source.zip"

cd "$REPO"
rm -f "$OUT"

zip -r "$OUT" common \
  -x 'common/node_modules/*' 'common/dist/*' '*/.DS_Store'

zip -r "$OUT" firefox-extension \
  -x 'firefox-extension/node_modules/*' 'firefox-extension/dist/*' \
     'firefox-extension/.nx/*' 'firefox-extension/SOURCE_CODE_README.txt' '*/.DS_Store'

zip -j "$OUT" firefox-extension/SOURCE_CODE_README.txt

echo "Created $OUT"
