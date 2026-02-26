#!/bin/bash
# ============================================================
# AureControl - Deploy Script
# ============================================================
# Sobe os containers, aplica migrations, seed e verifica.
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

echo ""
echo "============================================"
echo "  AureControl - Deploy"
echo "============================================"
echo ""

# ──────────────────────────────────────────────
# 1. Build e start dos containers
# ──────────────────────────────────────────────
echo "[1/5] Subindo containers..."
docker-compose up -d --build
echo "  Containers iniciados!"
echo ""

# ──────────────────────────────────────────────
# 2. Aguardar PostgreSQL
# ──────────────────────────────────────────────
echo "[2/5] Aguardando banco de dados..."
TRIES=0
MAX=90
until docker-compose exec -T db pg_isready -U postgres -h localhost > /dev/null 2>&1; do
  TRIES=$((TRIES + 1))
  if [ $TRIES -ge $MAX ]; then
    echo ""
    echo "  ERRO: Banco nao ficou pronto apos ${MAX} tentativas."
    echo "  Verifique: docker-compose logs db"
    exit 1
  fi
  printf "\r  Aguardando... (%d/%d)" "$TRIES" "$MAX"
  sleep 2
done
echo ""
echo "  Banco de dados pronto!"

# Espera extra para init scripts do supabase/postgres finalizarem
sleep 5
echo ""

# ──────────────────────────────────────────────
# 3. Aplicar migrations
# ──────────────────────────────────────────────
echo "[3/5] Aplicando migrations..."

# Criar tabela de controle de migrations
docker-compose exec -T db psql -U postgres -d "$DB_NAME" -c \
  "CREATE TABLE IF NOT EXISTS public._migrations_applied (
     filename TEXT PRIMARY KEY,
     applied_at TIMESTAMPTZ DEFAULT NOW()
   );" > /dev/null 2>&1

APPLIED=0
SKIPPED=0
FAILED=0

for f in $(ls supabase/migrations/*.sql 2>/dev/null | sort); do
  filename=$(basename "$f")

  # Checar se ja foi aplicada
  ALREADY=$(docker-compose exec -T db psql -U postgres -d "$DB_NAME" -tAc \
    "SELECT EXISTS (SELECT 1 FROM public._migrations_applied WHERE filename = '${filename}');" 2>/dev/null | tr -d '[:space:]')

  if [ "$ALREADY" = "t" ]; then
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  echo "  -> $filename"
  if docker-compose exec -T db psql -U postgres -d "$DB_NAME" -v ON_ERROR_STOP=1 \
    -f "/app-migrations/${filename}" > /dev/null 2>&1; then
    docker-compose exec -T db psql -U postgres -d "$DB_NAME" -c \
      "INSERT INTO public._migrations_applied (filename) VALUES ('${filename}') ON CONFLICT DO NOTHING;" > /dev/null 2>&1
    APPLIED=$((APPLIED + 1))
  else
    echo "     FALHA ao aplicar $filename"
    FAILED=$((FAILED + 1))
  fi
done

echo "  Resultado: $APPLIED aplicadas, $SKIPPED ja existiam, $FAILED falharam"

if [ $FAILED -gt 0 ]; then
  echo "  AVISO: Verifique os logs para as migrations que falharam."
fi
echo ""

# ──────────────────────────────────────────────
# 4. Aplicar seed de dados da aplicacao
# ──────────────────────────────────────────────
echo "[4/5] Aplicando seed de dados..."

SEED_DONE=$(docker-compose exec -T db psql -U postgres -d "$DB_NAME" -tAc \
  "SELECT EXISTS (SELECT 1 FROM public._migrations_applied WHERE filename = '_seed-app.sql');" 2>/dev/null | tr -d '[:space:]')

if [ "$SEED_DONE" != "t" ]; then
  if docker-compose exec -T db psql -U postgres -d "$DB_NAME" -v ON_ERROR_STOP=1 \
    -f "/app-seed/seed-app.sql" > /dev/null 2>&1; then
    docker-compose exec -T db psql -U postgres -d "$DB_NAME" -c \
      "INSERT INTO public._migrations_applied (filename) VALUES ('_seed-app.sql') ON CONFLICT DO NOTHING;" > /dev/null 2>&1
    echo "  Seed aplicado!"
  else
    echo "  Falha ao aplicar seed (pode ja existir os dados)"
  fi
else
  echo "  Seed ja aplicado anteriormente."
fi
echo ""

# ──────────────────────────────────────────────
# 5. Verificar servicos
# ──────────────────────────────────────────────
echo "[5/5] Verificando servicos..."

# Aguardar GoTrue (Auth)
TRIES=0
AUTH_OK=false
echo -n "  Auth: "
while [ $TRIES -lt 40 ]; do
  if docker-compose exec -T auth wget -q --spider http://localhost:9999/health 2>/dev/null; then
    AUTH_OK=true
    break
  fi
  TRIES=$((TRIES + 1))
  sleep 3
done
if [ "$AUTH_OK" = "true" ]; then
  echo "OK"
else
  echo "FALHA (verifique: docker-compose logs auth)"
fi

# Verificar PostgREST
echo -n "  REST: "
TRIES=0
REST_OK=false
while [ $TRIES -lt 10 ]; do
  if docker-compose exec -T rest wget -q --spider http://localhost:3000/ 2>/dev/null; then
    REST_OK=true
    break
  fi
  TRIES=$((TRIES + 1))
  sleep 2
done
if [ "$REST_OK" = "true" ]; then
  echo "OK"
else
  echo "Iniciando..."
fi

echo ""

# ──────────────────────────────────────────────
# Seed de usuarios de teste (opcional)
# ──────────────────────────────────────────────
if [ "$SEED_USERS" = "true" ]; then
  echo "Criando usuarios de teste..."

  if [ "$AUTH_OK" != "true" ]; then
    echo "  Aguardando Auth ficar pronto..."
    TRIES=0
    while [ $TRIES -lt 30 ]; do
      if docker-compose exec -T auth wget -q --spider http://localhost:9999/health 2>/dev/null; then
        AUTH_OK=true
        break
      fi
      TRIES=$((TRIES + 1))
      sleep 3
    done
  fi

  if [ "$AUTH_OK" = "true" ]; then
    # Aguardar GoTrue criar tabelas de auth (auth.identities)
    TRIES=0
    echo -n "  Aguardando GoTrue migrations..."
    while [ $TRIES -lt 60 ]; do
      HAS_IDENTITIES=$(docker-compose exec -T db psql -U postgres -d "$DB_NAME" -tAc \
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='auth' AND table_name='identities');" 2>/dev/null | tr -d '[:space:]')
      if [ "$HAS_IDENTITIES" = "t" ]; then
        echo " OK"
        break
      fi
      TRIES=$((TRIES + 1))
      sleep 2
    done

    if [ "$HAS_IDENTITIES" = "t" ]; then
      # Verificar se ja foi seedado
      ALREADY_SEEDED=$(docker-compose exec -T db psql -U postgres -d "$DB_NAME" -tAc \
        "SELECT EXISTS (SELECT 1 FROM auth.users WHERE id='ee2f5a8c-358a-4e11-b687-8e5b5a60cfae');" 2>/dev/null | tr -d '[:space:]')

      if [ "$ALREADY_SEEDED" = "t" ]; then
        echo "  Usuarios de teste ja existem."
      else
        echo "  Inserindo usuarios..."
        if docker-compose exec -T db psql -U postgres -d "$DB_NAME" \
          -f "/app-seed/seed-users.sql" > /dev/null 2>&1; then
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
          echo "  FALHA ao inserir usuarios (verifique: docker-compose logs db)"
        fi
      fi
    else
      echo ""
      echo "  AVISO: GoTrue nao criou auth.identities. Seed ignorado."
      echo "  Tente novamente: ./deploy.sh --seed-users"
    fi
  else
    echo "  AVISO: Auth nao esta pronto. Seed de usuarios ignorado."
    echo "  Tente novamente: ./deploy.sh --seed-users"
  fi
  echo ""
fi

# ──────────────────────────────────────────────
# Resultado final
# ──────────────────────────────────────────────
IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

echo "============================================"
echo "  Deploy concluido!"
echo "============================================"
echo ""
echo "  Frontend: http://$IP:${FRONTEND_PORT:-80}"
echo "  API:      http://$IP:${API_PORT:-8000}"
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
