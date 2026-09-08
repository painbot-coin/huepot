#!/usr/bin/env bash
# Deploys without serving from a directory that is being rewritten.
#
# A plain `next build` overwrites .next while the old process is still reading
# it, so for a few seconds a page that process has not loaded yet answers with
# a missing-manifest error. Here the build goes to .next-build and the finished
# directory is moved into place in one rename, which the running process does
# not notice: its open handles follow the inode, not the path.
set -euo pipefail

cd "$(dirname "$0")/.."
APP="${1:-huepot}"
STAGE=".next-build"
PREV=".next-prev"

echo "building into $STAGE"
rm -rf "$STAGE"
NEXT_DIST_DIR="$STAGE" npm run build 2>&1 | tail -3

if [ ! -f "$STAGE/BUILD_ID" ]; then
  echo "build produced no BUILD_ID, leaving the running version alone"
  exit 1
fi
echo "build ok: $(cat "$STAGE/BUILD_ID")"

# Stopped before the swap, not after. Leaving it up means the old process
# reads the new build's manifests, does not recognise the BUILD_ID in them, and
# answers with invariant errors — a worse failure than being briefly down,
# because it serves a broken page instead of nothing. One process owns the
# money, so there is no second instance to hand traffic to.
echo "stopping, swapping, starting"
pm2 stop "$APP" >/dev/null 2>&1
rm -rf "$PREV"
if [ -d .next ]; then mv .next "$PREV"; fi
mv "$STAGE" .next
pm2 start "$APP" --update-env >/dev/null 2>&1 || pm2 restart "$APP" --update-env >/dev/null 2>&1
sleep 8

code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/)
if [ "$code" != "200" ]; then
  echo "home answered $code after the swap, rolling back"
  pm2 stop "$APP" >/dev/null 2>&1
  rm -rf .next
  mv "$PREV" .next
  pm2 start "$APP" --update-env >/dev/null 2>&1 || pm2 restart "$APP" --update-env >/dev/null 2>&1
  sleep 8
  echo "rolled back; home now $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/)"
  exit 1
fi

echo "live: $(curl -s http://127.0.0.1:3000/api/auth/providers | head -c 34)"
echo "previous build kept at $PREV"
