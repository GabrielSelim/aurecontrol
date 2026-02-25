# AureControl

Sistema de gestão de contratos, cobranças e colaboradores PJ.

## Stack

- **Frontend:** Vite + React + TypeScript + shadcn/ui + Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions)
- **Infra:** Docker (desenvolvimento local e produção self-hosted)

---

## Desenvolvimento Local

### Pré-requisitos

- [Node.js 22+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) rodando
- npm (vem com Node.js)

### 1. Instalar dependências

```sh
npm install
```

### 2. Iniciar Supabase local (Docker Desktop)

```sh
npm run supabase:start
```

Isso sobe os seguintes containers no Docker Desktop:
| Serviço       | URL                          |
|---------------|------------------------------|
| API (Kong)    | http://localhost:54321        |
| Studio        | http://localhost:54323        |
| Inbucket      | http://localhost:54324        |
| PostgreSQL    | localhost:54322               |

> Na primeira execução, todas as migrations e o seed serão aplicados automaticamente.

### 3. Verificar as credenciais locais

Após `supabase start`, o terminal exibe as chaves. O arquivo `.env.local` já está configurado com os valores padrão do Supabase CLI local. Se necessário, atualize-o:

```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key exibida no terminal>
```

### 4. Iniciar o frontend

```sh
npm run dev
```

App disponível em **http://localhost:8080**

### Comandos úteis

| Comando                  | Descrição                              |
|--------------------------|----------------------------------------|
| `npm run supabase:start` | Inicia todos os serviços Supabase      |
| `npm run supabase:stop`  | Para os containers Supabase            |
| `npm run supabase:status`| Exibe status e URLs                    |
| `npm run supabase:reset` | Recria o banco (migrations + seed)     |
| `npm run dev:full`       | Inicia Supabase + Vite de uma vez      |

### Inbucket (E-mails locais)

Em desenvolvimento, os e-mails enviados pelo Auth são capturados pelo Inbucket.
Acesse http://localhost:54324 para visualizá-los.

---

## Produção (Self-Hosted)

### Arquitetura

```
                    ┌─────────────┐
                    │   Nginx     │ :80/:443
                    │  (Frontend) │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │    Kong     │ :8000
                    │ (API GW)   │
                    └──────┬──────┘
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼────┐ ┌────▼────┐ ┌────▼──────┐
        │ PostgREST│ │ GoTrue  │ │ Realtime  │
        │  (REST)  │ │ (Auth)  │ │           │
        └─────┬────┘ └────┬────┘ └────┬──────┘
              │            │            │
              └────────────┼────────────┘
                    ┌──────▼──────┐
                    │ PostgreSQL  │
                    │   + Storage │
                    └─────────────┘
```

### Deploy

#### 1. Preparar variáveis de ambiente

```sh
cp .env.production.template .env.production
# Edite .env.production com seus valores reais
```

Gere as chaves JWT:
```sh
# JWT Secret
openssl rand -base64 32

# Para gerar ANON_KEY e SERVICE_ROLE_KEY, use:
# https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys
```

#### 2. Subir tudo

```sh
npm run prod:up
# ou diretamente:
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

#### 3. Verificar

```sh
npm run prod:logs
```

#### 4. Parar

```sh
npm run prod:down
```

### Serviços em produção

| Serviço    | Porta Padrão | Descrição                    |
|------------|--------------|------------------------------|
| Frontend   | 80/443       | App React (Nginx)            |
| Kong       | 8000         | API Gateway Supabase         |
| Studio     | 3000         | Dashboard admin Supabase     |
| PostgreSQL | 5432         | Banco de dados               |

> **Importante:** Em produção, proteja o Studio com firewall ou VPN. Ele não deve ficar exposto publicamente.

---

## Estrutura do Projeto

```
├── src/                    # Código frontend React
│   ├── components/         # Componentes UI
│   ├── contexts/           # Contextos React (Auth, etc.)
│   ├── hooks/              # Custom hooks
│   ├── integrations/       # Cliente Supabase
│   ├── lib/                # Utilitários
│   └── pages/              # Páginas/rotas
├── supabase/
│   ├── config.toml         # Config do Supabase CLI
│   ├── migrations/         # Migrations SQL
│   ├── seed.sql            # Dados iniciais
│   └── functions/          # Edge Functions (Deno)
├── docker/
│   └── volumes/
│       ├── kong/kong.yml   # Config do API Gateway
│       └── nginx/nginx.conf# Config do Nginx
├── docker-compose.prod.yml # Compose de produção
├── Dockerfile              # Build do frontend
├── .env                    # Vars Supabase Cloud (legado)
├── .env.local              # Vars desenvolvimento local
└── .env.production.template# Template produção
```
