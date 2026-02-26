#!/bin/bash
# ============================================================
# AureControl - Deploy Script
# ============================================================
# Sobe os containers, aguarda TODOS os servicos ficarem prontos,
# aplica migrations, seed e verifica.
#
# Uso:
#   chmod +x deploy.sh
#   ./deploy.sh              # Deploy completo (sem usuarios)
#   ./deploy.sh --seed-users # Deploy + criar usuarios de teste
# ============================================================
set -e

SEED_USERS=false
if [ "$1" = "--seed-users" ]; then
  SEED_USERS=true
fi

# Carregar .env
if [ ! -f .env ]; then
  echo "ERRO: Arquivo .env nao encontrado!"
  echo "Execute: cp .env.example .env  e preencha os valores."
  exit 1
fi
set -a; source .env; set +a
DB_NAME="${POSTGRES_DB:-postgres}"
API_PORT="${API_PORT:-8000}"

# Helper: executar psql no container db
run_psql() {
  docker-compose exec -T db psql -U postgres -d "$DB_NAME" "$@"
}

# Helper: checar condicao no banco (retorna "t" ou "f")
db_check() {
  run_psql -tAc "$1" 2>/dev/null | tr -d '[:space:]'
}

echo ""
echo "============================================"
echo "  AureControl - Deploy"
echo "============================================"
echo ""

# ──────────────────────────────────────────────
# 1. Build e start dos containers
# ──────────────────────────────────────────────
echo "[1/6] Subindo containers..."
docker-compose up -d --build
echo "  Containers iniciados!"
echo ""

# ──────────────────────────────────────────────
# 2. Aguardar PostgreSQL
# ──────────────────────────────────────────────
echo "[2/6] Aguardando PostgreSQL..."
TRIES=0
MAX=90
until docker-compose exec -T db pg_isready -U postgres -h localhost > /dev/null 2>&1; do
  TRIES=$((TRIES + 1))
  if [ $TRIES -ge $MAX ]; then
    echo ""
    echo "  ERRO: PostgreSQL nao ficou pronto apos ${MAX} tentativas."
    echo "  Verifique: docker-compose logs db"
    exit 1
  fi
  printf "\r  Aguardando... (%d/%d)" "$TRIES" "$MAX"
  sleep 2
done
echo ""
echo "  PostgreSQL pronto!"
echo ""

# ──────────────────────────────────────────────
# 3. Aguardar GoTrue (Auth) e Storage API
# ──────────────────────────────────────────────
echo "[3/6] Aguardando servicos criarem schemas..."

# 3a. Aguardar GoTrue criar auth.users / auth.identities
echo -n "  GoTrue (auth): "
TRIES=0
while [ $TRIES -lt 120 ]; do
  RESULT=$(db_check "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='auth' AND table_name='identities');")
  if [ "$RESULT" = "t" ]; then
    echo "OK (auth.identities existe)"
    break
  fi
  TRIES=$((TRIES + 1))
  sleep 3
done
if [ "$RESULT" != "t" ]; then
  echo "AVISO: auth.identities nao encontrada apos 6 min"
  echo "  Verifique: docker-compose logs auth"
fi

# 3b. Aguardar Storage API criar storage.objects e storage.foldername()
echo -n "  Storage API: "
TRIES=0
STORAGE_OK=false
while [ $TRIES -lt 120 ]; do
  # Checar se storage.objects existe E storage.foldername() existe
  RESULT=$(db_check "
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema='storage' AND table_name='objects'
    ) AND EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname='storage' AND p.proname='foldername'
    );
  ")
  if [ "$RESULT" = "t" ]; then
    STORAGE_OK=true
    echo "OK (storage.objects + storage.foldername)"
    break
  fi
  TRIES=$((TRIES + 1))
  sleep 3
done
if [ "$STORAGE_OK" != "true" ]; then
  echo "AVISO: storage nao ficou pronto apos 6 min"
  echo "  Verifique: docker-compose logs storage"
  echo "  Migrations que dependem de storage podem falhar."
fi

echo ""

# ──────────────────────────────────────────────
# 4. Aplicar migrations
# ──────────────────────────────────────────────
echo "[4/6] Aplicando migrations..."

# Criar tabela de controle de migrations
run_psql -c \
  "CREATE TABLE IF NOT EXISTS public._migrations_applied (
     filename TEXT PRIMARY KEY,
     applied_at TIMESTAMPTZ DEFAULT NOW()
   );" > /dev/null 2>&1

APPLIED=0
SKIPPED=0
FAILED=0
FAILED_FILES=""

for f in $(ls supabase/migrations/*.sql 2>/dev/null | sort); do
  filename=$(basename "$f")

  # Checar se ja foi aplicada
  ALREADY=$(db_check "SELECT EXISTS (SELECT 1 FROM public._migrations_applied WHERE filename = '${filename}');")

  if [ "$ALREADY" = "t" ]; then
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  echo "  -> $filename"

  # Aplicar migration e capturar erro
  ERROR_OUTPUT=$(docker-compose exec -T db psql -U postgres -d "$DB_NAME" -v ON_ERROR_STOP=1 \
    -f "/app-migrations/${filename}" 2>&1)
  EXIT_CODE=$?

  if [ $EXIT_CODE -eq 0 ]; then
    run_psql -c "INSERT INTO public._migrations_applied (filename) VALUES ('${filename}') ON CONFLICT DO NOTHING;" > /dev/null 2>&1
    APPLIED=$((APPLIED + 1))
  else
    echo "     FALHA: $filename"
    echo "     Erro: $(echo "$ERROR_OUTPUT" | grep -i "error" | head -3)"
    FAILED=$((FAILED + 1))
    FAILED_FILES="$FAILED_FILES $filename"
  fi
done

echo ""
echo "  Resultado: $APPLIED aplicadas, $SKIPPED ja existiam, $FAILED falharam"
if [ $FAILED -gt 0 ]; then
  echo "  Falharam:$FAILED_FILES"
fi
echo ""

# ──────────────────────────────────────────────
# 5. Aplicar seed de dados da aplicacao
# ──────────────────────────────────────────────
echo "[5/6] Aplicando seed de dados..."

SEED_DONE=$(db_check "SELECT EXISTS (SELECT 1 FROM public._migrations_applied WHERE filename = '_seed-app.sql');")

if [ "$SEED_DONE" != "t" ]; then
  ERROR_OUTPUT=$(run_psql -v ON_ERROR_STOP=1 -f "/app-seed/seed-app.sql" 2>&1)
  if [ $? -eq 0 ]; then
    run_psql -c "INSERT INTO public._migrations_applied (filename) VALUES ('_seed-app.sql') ON CONFLICT DO NOTHING;" > /dev/null 2>&1
    echo "  Seed aplicado!"
  else
    echo "  Falha ao aplicar seed:"
    echo "  $(echo "$ERROR_OUTPUT" | grep -i "error" | head -3)"
  fi
else
  echo "  Seed ja aplicado anteriormente."
fi
echo ""

# ──────────────────────────────────────────────
# 6. Seed de usuarios de teste (opcional)
# ──────────────────────────────────────────────
if [ "$SEED_USERS" = "true" ]; then
  echo "[6/6] Criando usuarios de teste..."

  # Checar se ja existe
  ALREADY_SEEDED=$(db_check "SELECT EXISTS (SELECT 1 FROM auth.users WHERE id='ee2f5a8c-358a-4e11-b687-8e5b5a60cfae');")

  if [ "$ALREADY_SEEDED" = "t" ]; then
    echo "  Usuarios de teste ja existem."
  else
    # Aguardar profiles table (criada pelas migrations)
    echo -n "  Verificando tabela profiles... "
    TRIES=0
    HAS_PROFILES="f"
    while [ $TRIES -lt 10 ]; do
      HAS_PROFILES=$(db_check "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles');")
      if [ "$HAS_PROFILES" = "t" ]; then
        echo "OK"
        break
      fi
      TRIES=$((TRIES + 1))
      sleep 2
    done

    if [ "$HAS_PROFILES" != "t" ]; then
      echo "AVISO: tabela profiles nao existe. Seed parcial."
    fi

    echo "  Inserindo usuarios..."
    ERROR_OUTPUT=$(run_psql -f "/app-seed/seed-users.sql" 2>&1)
    if [ $? -eq 0 ]; then
      echo "  10 usuarios criados! (senha: Teste@123)"
      echo ""
      echo "  Usuarios:"
      echo "    eng.gabrielsanz@hotmail.com  (master_admin)"
      echo "    admin.tech@teste.com         (admin)"
      echo "    financeiro.tech@teste.com    (financeiro)"
      echo "    gestor.tech@teste.com        (gestor)"
      echo "    colab.tech@teste.com         (colaborador)"
      echo "    admin.inov@teste.com         (admin)"
      echo "    financeiro.inov@teste.com    (financeiro)"
      echo "    colab.inov@teste.com         (colaborador)"
      echo "    juridico@inovacao.com        (juridico)"
      echo "    juridico@techsolutions.com   (juridico)"
    else
      echo "  FALHA ao inserir usuarios:"
      echo "  $(echo "$ERROR_OUTPUT" | grep -i "error" | head -5)"
    fi
  fi
  echo ""
else
  echo "[6/6] Seed de usuarios: pulado (use --seed-users)"
  echo ""
fi

# ──────────────────────────────────────────────
# Verificacao final dos servicos
# ──────────────────────────────────────────────
echo "Verificando servicos..."

# Checar via curl do host (Kong expoe a API)
check_endpoint() {
  local name=$1
  local url=$2
  local tries=0
  echo -n "  $name: "
  while [ $tries -lt 15 ]; do
    if curl -sf "$url" > /dev/null 2>&1; then
      echo "OK"
      return 0
    fi
    tries=$((tries + 1))
    sleep 2
  done
  echo "FALHA ($url)"
  return 1
}

# Verificar Auth via Kong
check_endpoint "Auth" "http://localhost:${API_PORT}/auth/v1/health" || true

# Verificar REST via Kong
check_endpoint "REST" "http://localhost:${API_PORT}/rest/v1/" || true

# Verificar Frontend
check_endpoint "Frontend" "http://localhost:${FRONTEND_PORT:-80}/" || true

echo ""

# ──────────────────────────────────────────────
# Resultado final
# ──────────────────────────────────────────────
IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

echo "============================================"
echo "  Deploy concluido!"
echo "============================================"
echo ""
echo "  Frontend: http://$IP:${FRONTEND_PORT:-80}"
echo "  API:      http://$IP:${API_PORT}"
echo "  Studio:   http://$IP:${STUDIO_PORT:-3333}"
echo ""
echo "  Ver status:  docker-compose ps"
echo "  Ver logs:    docker-compose logs -f [servico]"
echo ""
if [ "$SEED_USERS" = "false" ]; then
  echo "  Para criar usuarios de teste:"
  echo "    ./deploy.sh --seed-users"
fi
echo ""
