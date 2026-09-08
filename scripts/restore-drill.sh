#!/usr/bin/env bash
# A backup nobody has restored is a guess. This takes the newest snapshot,
# unpacks it somewhere harmless, boots the real application against it on a
# spare port, and asks it questions only a working database can answer.
set -uo pipefail

SNAP_DIR=/root/huepot-backup/snapshots
WORK=/tmp/restore-drill
PORT=3101

cleanup() {
  if [ -n "${APP_PID:-}" ]; then kill "$APP_PID" 2>/dev/null || true; fi
  sleep 1
  rm -rf "$WORK"
}
trap cleanup EXIT

newest=$(ls -1t "$SNAP_DIR"/huepot-*.db.gz 2>/dev/null | head -1)
if [ -z "$newest" ]; then echo "no snapshot to restore"; exit 1; fi
echo "restoring $(basename "$newest")"

rm -rf "$WORK"; mkdir -p "$WORK/data"
gunzip -c "$newest" > "$WORK/data/huepot.db"
echo "  unpacked $(stat -c%s "$WORK/data/huepot.db") bytes"

cd /var/www/huepot
echo "booting the app against the restored copy on port $PORT"
# Chain watcher off: this is a copy of the ledger and it must not touch a chain.
DATABASE_URL="file:$WORK/data/huepot.db" \
  CHAIN_WATCH=0 WITHDRAW_KEY= PRODUCT_MODE=0 PORT=$PORT \
  node node_modules/next/dist/bin/next start -H 127.0.0.1 -p $PORT \
  > "$WORK/app.log" 2>&1 &
APP_PID=$!

for i in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/api/auth/providers" 2>/dev/null || echo 000)
  [ "$code" = "200" ] && break
  sleep 1
done

pass=0; fail=0
ask() { # label, url, jq-ish grep
  local label="$1" url="$2" want="$3"
  local body
  body=$(curl -s --max-time 20 "http://127.0.0.1:$PORT$url" 2>/dev/null)
  if echo "$body" | grep -qE "$want"; then
    echo "  ok   $label"
    pass=$((pass+1))
  else
    echo "  FAIL $label -> $(echo "$body" | head -c 90)"
    fail=$((fail+1))
  fi
}

echo "asking the restored house questions only a real database can answer"
ask "it serves at all"            "/api/auth/providers"            '"version"'
ask "the lobby has its rooms"     "/api/state"                     'classic'
ask "the fairness ledger has rows" "/api/fairness"                 '"settled":[0-9]+'
ask "settled rounds came across"  "/api/fairness"                  '"rounds":\[\{'
ask "takes survived"              "/api/takes"                     '"takes":\['
ask "a room reports live state"   "/api/rooms/classic/state"       '"round"'
ask "the wire kept its headlines" "/api/state"                     '.'

echo "checking the numbers match the live house"
live=$(curl -s --max-time 20 "http://127.0.0.1:3000/api/fairness" | grep -oE '"settled":[0-9]+' | head -1)
copy=$(curl -s --max-time 20 "http://127.0.0.1:$PORT/api/fairness" | grep -oE '"settled":[0-9]+' | head -1)
echo "  live $live vs restored $copy"
if [ -n "$copy" ] && [ "$live" = "$copy" ]; then
  echo "  ok   the restored ledger holds the same number of settled rounds"
  pass=$((pass+1))
else
  echo "  note the live house has settled more rounds since the snapshot, which is expected"
fi

echo ""
if [ "$fail" -eq 0 ]; then
  echo "restore drill passed: $pass checks, the snapshot boots and serves"
else
  echo "restore drill FAILED: $fail of $((pass+fail)) checks"
  echo "--- app log tail ---"
  tail -12 "$WORK/app.log"
  exit 1
fi
