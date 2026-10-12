#!/usr/bin/env bash
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STACK_DIR="${STACK_DIR:-$ROOT/.stack}"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
for p in auth postgrest gateway; do [ -f "$STACK_DIR/$p.pid" ] && kill "$(cat "$STACK_DIR/$p.pid")" 2>/dev/null; rm -f "$STACK_DIR/$p.pid"; done
RUN_AS=(); [ "$(id -u)" = "0" ] && RUN_AS=(setpriv --reuid=nobody --regid=nogroup --clear-groups --)
"${RUN_AS[@]}" "$PGBIN/pg_ctl" -D "$STACK_DIR/pg" -m fast stop >/dev/null 2>&1
if [ "${1:-}" = "--reset" ]; then rm -rf "$STACK_DIR/pg" "$STACK_DIR/logs" "$STACK_DIR/env"; fi
echo "Lokale stack gestopt."
