#!/bin/sh
# ============================================================
# init-pgbouncer.sh
# Gera o userlist.txt com senhas em texto plano e inicia o PgBouncer.
# Texto plano é necessário para que o PgBouncer calcule o SCRAM-SHA-256
# ao autenticar no PostgreSQL (que usa scram-sha-256 no pg_hba.conf).
# ============================================================
set -e

PASS="${POSTGRES_PASSWORD}"

# Formato: "usuario" "senha_em_texto_plano"
# PgBouncer usa isso para calcular SCRAM-SHA-256 ao conectar no PostgreSQL
cat > /tmp/pgbouncer-userlist.txt << EOF
"postgres" "${PASS}"
"supabase_auth_admin" "${PASS}"
"authenticator" "${PASS}"
"supabase_storage_admin" "${PASS}"
"supabase_admin" "${PASS}"
"supabase_replication_admin" "${PASS}"
"supabase_read_only_user" "${PASS}"
EOF

echo "[PgBouncer] userlist.txt gerado com $(wc -l < /tmp/pgbouncer-userlist.txt) usuários."
echo "[PgBouncer] Iniciando..."

exec pgbouncer /etc/pgbouncer/pgbouncer.ini
