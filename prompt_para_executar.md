# Prompt para Deploy no Servidor (Copilot Chat via Remote-SSH)

Cole o texto abaixo no Copilot Chat quando estiver conectado ao servidor via Remote-SSH:

---

**Preciso fazer o deploy do AureControl (React + Supabase self-hosted) neste servidor. O projeto já está clonado em `/root/aurecontrol` no branch `develop`.**

**Contexto técnico:**
- Servidor: Ubuntu 24.04, Docker com docker-compose v1 (Python-based, comando `docker-compose`, NÃO `docker compose`)
- O Nginx do servidor já roda na porta 80
- Portas do projeto: FRONTEND=3080, API(Kong)=3081, Studio=3082, PostgreSQL=3083
- IP do servidor: 5.189.174.61

**O que precisa ser feito, nesta ordem:**

1. **Garantir que estou no branch develop:**
   ```bash
   cd /root/aurecontrol
   git checkout develop
   git pull origin develop
   ```

2. **Verificar se o arquivo `.env` existe em `/root/aurecontrol/.env`** — se não existir, criar com estes valores (gere os secrets automaticamente com `openssl rand -hex 32`):
   ```
   POSTGRES_PASSWORD=<gerar com openssl rand -hex 32>
   JWT_SECRET=<gerar com openssl rand -hex 32>
   SECRET_KEY_BASE=<gerar com openssl rand -hex 64>
   ANON_KEY=<gerar JWT com role=anon usando o JWT_SECRET acima>
   SERVICE_ROLE_KEY=<gerar JWT com role=service_role usando o JWT_SECRET acima>
   DASHBOARD_USERNAME=supabase
   DASHBOARD_PASSWORD=<gerar com openssl rand -hex 16>
   API_EXTERNAL_URL=http://5.189.174.61:3081
   SITE_URL=http://5.189.174.61:3080
   SMTP_HOST=
   SMTP_PORT=587
   SMTP_USER=
   SMTP_PASS=
   SMTP_SENDER_NAME=AureControl
   SMTP_ADMIN_EMAIL=
   SMTP_SENDER_EMAIL=noreply@aurecontrol.com
   ENABLE_EMAIL_SIGNUP=true
   ENABLE_EMAIL_AUTOCONFIRM=true
   FRONTEND_PORT=3080
   API_PORT=3081
   STUDIO_PORT=3082
   POSTGRES_PORT=3083
   ```
   Para gerar os JWT tokens (ANON_KEY e SERVICE_ROLE_KEY), use o JWT_SECRET gerado e crie tokens com payload `{"role":"anon","iss":"supabase","iat":1700000000,"exp":2000000000}` e `{"role":"service_role","iss":"supabase","iat":1700000000,"exp":2000000000}` respectivamente. Pode usar Python ou Node.js para isso.

3. **Derrubar tudo que estiver rodando:**
   ```bash
   docker-compose down -v
   ```

4. **Dar permissão e rodar o deploy.sh:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh --seed-users
   ```

5. **Aguardar a conclusão completa** — o script tem 6 etapas e pode levar uns 5-10 minutos. Não interrompa.

6. **Depois que terminar, verificar:**
   - `docker-compose ps` — todos os containers devem estar "Up"
   - Testar auth: `curl http://localhost:3081/auth/v1/health -H "apikey: <ANON_KEY do .env>"`
   - Testar REST: `curl http://localhost:3081/rest/v1/ -H "apikey: <ANON_KEY do .env>"`
   - Frontend: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3080`

**IMPORTANTE:**
- Docker-compose v1 NÃO suporta `docker compose` (com espaço), usar sempre `docker-compose` (com hífen)
- Se alguma migração falhar, o script mostra o erro mas continua. Verifique os logs.
- Se o GoTrue (auth) falhar, verifique se `docker/volumes/db/roles.sql` e `docker/volumes/db/jwt.sql` existem

**Se der algum erro, me mostre o output completo.**
