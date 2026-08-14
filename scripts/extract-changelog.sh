#!/bin/sh
# Extract release notes for a specific version from CHANGELOG.md
# Usage: ./scripts/extract-changelog.sh 26.8.1
set -e

VERSION="$1"

if [ -z "$VERSION" ]; then
  echo "Usage: $0 <version>" >&2
  exit 1
fi

awk "/^## \[${VERSION}\]/{found=1; next} /^## \[/{if(found) exit} found" CHANGELOG.md
