#!/usr/bin/env bash
# Draait de migraties en beveiligingstests tegen een tijdelijke lokale PostgreSQL-instantie.
# Vereist: PostgreSQL 15+ (initdb, pg_ctl, psql). Er wordt niets buiten een tijdelijke map aangeraakt.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
export PATH="$PGBIN:$PATH"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-54329}"
cleanup() { pg_ctl -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT

RUN_AS=()
if [ "$(id -u)" = "0" ]; then
  # PostgreSQL weigert als root te draaien; gebruik een gewone systeemgebruiker.
  chown -R nobody "$TMP"
  RUN_AS=(setpriv --reuid=nobody --regid=nogroup --clear-groups --)
fi

"${RUN_AS[@]}" initdb -D "$TMP/data" -U postgres -A trust >/dev/null
"${RUN_AS[@]}" pg_ctl -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" -w start >/dev/null
PSQL=(psql -X -q -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1)

"${PSQL[@]}" -f "$ROOT/supabase/tests/auth-stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "Migratie: $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done
"${PSQL[@]}" -f "$ROOT/supabase/tests/security.test.sql"
