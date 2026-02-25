#!/bin/bash
# ============================================================
# Script de inicialização do banco - AureControl
# Aplica migrations em ordem e depois o seed
# Executado automaticamente pelo container db-init
# ============================================================
set -e

echo "=== AureControl DB Init ==="
echo "Aguardando PostgreSQL ficar disponível..."

# Esperar o banco estar pronto
until PGPASSWORD="$POSTGRES_PASSWORD" psql -h db -U postgres -d postgres -c '\q' 2>/dev/null; do
  echo "PostgreSQL ainda não está pronto, aguardando 2s..."
  sleep 2
done

echo "PostgreSQL está pronto!"

# Verificar se já foi inicializado (tabela de controle)
INITIALIZED=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h db -U postgres -d postgres -tAc \
  "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_migrations_applied');" 2>/dev/null || echo "f")

if [ "$INITIALIZED" = "t" ]; then
  echo "Banco já foi inicializado. Verificando novas migrations..."
else
  echo "Primeira inicialização. Criando tabela de controle..."
  PGPASSWORD="$POSTGRES_PASSWORD" psql -h db -U postgres -d postgres -c \
    "CREATE TABLE IF NOT EXISTS public._migrations_applied (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT NOW());"
fi

# Aplicar migrations em ordem
MIGRATION_DIR="/migrations"
APPLIED=0
SKIPPED=0

if [ -d "$MIGRATION_DIR" ]; then
  for f in $(ls "$MIGRATION_DIR"/*.sql 2>/dev/null | sort); do
    filename=$(basename "$f")
    
    # Verificar se já foi aplicada
    ALREADY=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h db -U postgres -d postgres -tAc \
      "SELECT EXISTS (SELECT 1 FROM public._migrations_applied WHERE filename = '$filename');" 2>/dev/null || echo "f")
    
    if [ "$ALREADY" = "t" ]; then
      SKIPPED=$((SKIPPED + 1))
      continue
    fi
    
    echo "Aplicando migration: $filename"
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h db -U postgres -d postgres -f "$f"
    
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h db -U postgres -d postgres -c \
      "INSERT INTO public._migrations_applied (filename) VALUES ('$filename') ON CONFLICT DO NOTHING;"
    
    APPLIED=$((APPLIED + 1))
  done
fi

echo "Migrations: $APPLIED aplicadas, $SKIPPED já existentes."

# Aplicar seed (apenas na primeira inicialização)
if [ "$INITIALIZED" != "t" ] && [ -f "/seed/seed.sql" ]; then
  echo "Aplicando seed data..."
  PGPASSWORD="$POSTGRES_PASSWORD" psql -h db -U postgres -d postgres -f /seed/seed.sql
  echo "Seed aplicado com sucesso!"
fi

echo "=== DB Init concluído ==="
