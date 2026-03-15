#!/bin/bash
# Aguarda a verificação do domínio aurecontrol.com.br no Resend
# e troca automaticamente o RESEND_FROM_EMAIL quando aprovado.

set -e
source /root/aurecontrol/.env

DOMAIN_ID="3218a404-c7dc-4d88-85cf-096ac2836074"
TARGET_EMAIL="noreply@aurecontrol.com.br"

echo "Aguardando verificação do domínio aurecontrol.com.br no Resend..."

while true; do
  STATUS=$(curl -s "https://api.resend.com/domains/${DOMAIN_ID}" \
    -H "Authorization: Bearer ${RESEND_API_KEY}" | python3 -c "import json,sys; print(json.load(sys.stdin).get('status',''))")

  echo "$(date '+%H:%M:%S') — status: $STATUS"

  if [ "$STATUS" = "verified" ]; then
    echo "Dominio verificado! Atualizando RESEND_FROM_EMAIL..."
    sed -i "s|RESEND_FROM_EMAIL=.*|RESEND_FROM_EMAIL=${TARGET_EMAIL}|" /root/aurecontrol/.env
    docker-compose -f /root/aurecontrol/docker-compose.yml up -d --no-deps --force-recreate functions
    echo "Pronto! E-mails agora saem de ${TARGET_EMAIL}"
    break
  fi

  sleep 60
done
