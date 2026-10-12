#!/usr/bin/env bash
# Start een lokale, Docker-loze Supabase-achtige stack voor end-to-end-tests:
#   PostgreSQL (lokaal geïnstalleerd) + Supabase Auth + PostgREST + gateway/SMTP-opvang (gateway.mjs).
# Gebruik bij voorkeur `supabase start` (Supabase CLI + Docker). Dit script is een terugvaloptie.
# Schrijft de omgevingsvariabelen voor de app naar $STACK_DIR/env.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
STACK_DIR="${STACK_DIR:-$ROOT/.stack}"
BIN="$STACK_DIR/bin"
AUTH_VERSION="${AUTH_VERSION:-v2.180.0}"
POSTGREST_VERSION="${POSTGREST_VERSION:-v13.0.7}"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
export PATH="$PGBIN:$PATH"
PGPORT=54322
JWT_SECRET="local-test-secret-at-least-32-characters-long"
mkdir -p "$BIN" "$STACK_DIR/logs"

if [ ! -x "$BIN/auth" ]; then
  curl -fsSL "https://github.com/supabase/auth/releases/download/$AUTH_VERSION/auth-$AUTH_VERSION-x86.tar.gz" | tar xz -C "$BIN"
fi
if [ ! -x "$BIN/postgrest" ]; then
  curl -fsSL "https://github.com/PostgREST/postgrest/releases/download/$POSTGREST_VERSION/postgrest-$POSTGREST_VERSION-linux-static-x86-64.tar.xz" | tar xJ -C "$BIN"
fi

RUN_AS=()
if [ "$(id -u)" = "0" ]; then RUN_AS=(setpriv --reuid=nobody --regid=nogroup --clear-groups --); fi

if [ ! -d "$STACK_DIR/pg" ]; then
  mkdir -p "$STACK_DIR/pg" && [ "$(id -u)" = "0" ] && chown nobody "$STACK_DIR/pg" "$STACK_DIR/logs"
  "${RUN_AS[@]}" initdb -D "$STACK_DIR/pg" -U postgres -A trust >/dev/null
  FRESH=1
fi
"${RUN_AS[@]}" pg_ctl -D "$STACK_DIR/pg" -o "-p $PGPORT -k /tmp -c listen_addresses=127.0.0.1" -l "$STACK_DIR/logs/pg.log" -w start >/dev/null
PSQL=(psql -X -q -h 127.0.0.1 -p $PGPORT -U postgres -d postgres -v ON_ERROR_STOP=1)

if [ "${FRESH:-0}" = "1" ]; then
  "${PSQL[@]}" <<'SQL'
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role authenticator login noinherit;
grant anon, authenticated, service_role to authenticator;
create role supabase_auth_admin login createrole noinherit;
create schema auth authorization supabase_auth_admin;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
grant create on database postgres to supabase_auth_admin;
alter role supabase_auth_admin set search_path = auth;
SQL
fi

# Auth (GoTrue)
(
  cd "$BIN"
  export GOTRUE_DB_DRIVER=postgres DATABASE_URL="postgres://supabase_auth_admin@127.0.0.1:$PGPORT/postgres?sslmode=disable&search_path=auth"
  export GOTRUE_API_HOST=127.0.0.1 PORT=54329 API_EXTERNAL_URL="http://127.0.0.1:54321/auth/v1"
  export GOTRUE_SITE_URL="${SITE_URL:-http://localhost:3100}" GOTRUE_URI_ALLOW_LIST="http://localhost:3100/**,http://127.0.0.1:3100/**"
  export GOTRUE_JWT_SECRET="$JWT_SECRET" GOTRUE_JWT_EXP=3600 GOTRUE_JWT_AUD=authenticated GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated GOTRUE_JWT_ADMIN_ROLES=service_role
  export GOTRUE_DISABLE_SIGNUP=false GOTRUE_EXTERNAL_EMAIL_ENABLED=true GOTRUE_MAILER_AUTOCONFIRM=false
  export GOTRUE_SMTP_HOST=127.0.0.1 GOTRUE_SMTP_PORT=54325 GOTRUE_SMTP_ADMIN_EMAIL=noreply@localhost GOTRUE_SMTP_SENDER_NAME=Ruimte GOTRUE_SMTP_USER=x GOTRUE_SMTP_PASS=x
  export GOTRUE_MAILER_URLPATHS_CONFIRMATION=/auth/v1/verify GOTRUE_MAILER_URLPATHS_RECOVERY=/auth/v1/verify GOTRUE_MAILER_URLPATHS_EMAIL_CHANGE=/auth/v1/verify GOTRUE_MAILER_URLPATHS_INVITE=/auth/v1/verify
  export GOTRUE_RATE_LIMIT_EMAIL_SENT=1000 GOTRUE_RATE_LIMIT_VERIFY=1000 GOTRUE_RATE_LIMIT_TOKEN_REFRESH=1000 GOTRUE_SECURITY_REFRESH_TOKEN_ROTATION_ENABLED=true
  export GOTRUE_LOG_LEVEL=warn
  nohup ./auth > "$STACK_DIR/logs/auth.log" 2>&1 &
  echo $! > "$STACK_DIR/auth.pid"
)
# Wacht tot Auth zijn migraties heeft uitgevoerd (auth.users bestaat).
for _ in $(seq 1 60); do
  if "${PSQL[@]}" -tAc "select to_regclass('auth.users') is not null" 2>/dev/null | grep -q t; then break; fi
  sleep 0.5
done

if [ "${FRESH:-0}" = "1" ]; then
  for f in "$ROOT"/supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f"; done
fi

# PostgREST
cat > "$STACK_DIR/postgrest.conf" <<CONF
db-uri = "postgres://authenticator@127.0.0.1:$PGPORT/postgres"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "$JWT_SECRET"
server-host = "127.0.0.1"
server-port = 54330
CONF
nohup "$BIN/postgrest" "$STACK_DIR/postgrest.conf" > "$STACK_DIR/logs/postgrest.log" 2>&1 &
echo $! > "$STACK_DIR/postgrest.pid"
nohup node "$HERE/gateway.mjs" > "$STACK_DIR/logs/gateway.log" 2>&1 &
echo $! > "$STACK_DIR/gateway.pid"

ANON=$(node "$HERE/jwt.mjs" "$JWT_SECRET" anon)
SERVICE=$(node "$HERE/jwt.mjs" "$JWT_SECRET" service_role)
cat > "$STACK_DIR/env" <<ENV
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON
SUPABASE_SERVICE_ROLE_KEY_FOR_TESTS=$SERVICE
ENV
for _ in $(seq 1 40); do curl -fsS http://127.0.0.1:54321/auth/v1/health >/dev/null 2>&1 && curl -fsS -o /dev/null http://127.0.0.1:54321/rest/v1/ && break; sleep 0.5; done
echo "Lokale stack draait. Omgevingsvariabelen: $STACK_DIR/env"
