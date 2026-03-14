# AURE — O que falta implementar
> Análise completa do estado atual do projeto em 14/03/2026
> Baseado em revisão de código, backlog e testes

---

## Legenda
| Símbolo | Significado |
|---|---|
| ✅ | Implementado e funcional |
| 🔄 | Parcialmente implementado — lógica de negócio existe, falta integração real |
| ⬜ | Não implementado |
| 🔴 | Bloqueador para uso em produção real |
| 🟡 | Alta prioridade (diferencial competitivo) |
| 🟢 | Média prioridade (completude) |
| 🔵 | Longo prazo (Fase 2–4) |

---

## SEÇÃO 1 — MÓDULO DE ASSINATURA DIGITAL

| Item | Status | O que falta |
|---|---|---|
| Assinatura interna (canvas) | ✅ | — |
| PDF gerado com QR Code e seção de assinaturas | ✅ | — |
| Posicionador de assinatura no PDF (`SignaturePositionEditor`) | ✅ | — |
| Certificado de assinatura (`SignatureCertificate`) | ✅ | — |
| **Integração com provedor externo (ClickSign / D4Sign / etc.)** | 🔴⬜ | `createSignatureProvider()` em `signatureProviders.ts` retorna `null` para todos os provedores. Interface `ISignatureProvider` está definida, mas nenhuma implementação concreta existe. Falta criar classes `ClickSignProvider`, `D4SignProvider`, etc. com as chamadas reais de API |
| **Webhook de retorno do provedor de assinatura** | 🔴⬜ | Nenhuma edge function de webhook existe. O status da assinatura nunca atualiza automaticamente quando o prestador assina no provedor externo |
| Validade jurídica ICP-Brasil | 🔴⬜ | A assinatura interna não tem validade jurídica. Depende diretamente da integração com provedor externo certificado |
| Configuração de provedor por empresa (`Configuracoes.tsx`) | 🔄 | Campo de seleção de provedor existe na UI, mas salvar/carregar API key do provedor ainda não dispara nenhuma ação real |

---

## SEÇÃO 2 — MÓDULO FINANCEIRO / PAGAMENTOS

| Item | Status | O que falta |
|---|---|---|
| Criação manual de pagamentos | ✅ | — |
| Aprovação individual de pagamentos | ✅ | — |
| Aprovação em lote com pré-check NFS-e | ✅ | — |
| Exportação CSV/PDF de pagamentos | ✅ | — |
| Geração automática de obrigações (`gerar-obrigacoes-pj`) | ✅ | — |
| **Execução real do Pix** | 🔴⬜ | Chave Pix é coletada no cadastro do PJ, mas nunca é usada para efetuar um pagamento. Aprovar um pagamento apenas muda o `status` no banco — nenhuma transferência real acontece |
| **Integração com gateway de pagamento** | 🔴⬜ | Não existe nenhuma chamada a APIs de pagamento (Pix, TED, boleto). Falta integrar com Asaas, Efí (ex-Gerencianet), Celcoin ou similar |
| **Split automático via Pix** | 🔴⬜ | `contract_splits` está no banco e a lógica está parcialmente modelada, mas nunca é executada no momento do pagamento. Falta acionar o gateway de split quando uma aprovação ocorre |
| Notificação de pagamento aprovado por e-mail | 🔄 | Cod em `Pagamentos.tsx` chama `sendPaymentNotification`, mas a função usa a edge `send-email` que depende de `RESEND_API_KEY` configurada no ambiente — em produção essa chave precisa estar configurada |
| **Fila automática de aprovação** | 🟡⬜ | Hoje aprovação é sempre manual. Falta lógica para: auto-aprovar pagamentos onde NFS-e foi emitida e não há nenhuma disputa em aberto |
| Extrato financeiro por colaborador | 🟢⬜ | Não existe tela de extrato individual do ponto de vista da empresa |

---

## SEÇÃO 3 — MÓDULO NFS-e (NOTA FISCAL DE SERVIÇO ELETRÔNICA)

| Item | Status | O que falta |
|---|---|---|
| Registro interno de NFS-e (status pendente) | ✅ | — |
| PJ emite NFS-e pelo portal (`PJContratos`) | ✅ | — |
| Admin marca NFS-e como emitida manualmente | ✅ | — |
| Badge NFS-e em `Pagamentos` e `PJPagamentos` | ✅ | — |
| Bloqueio hard de aprovação sem NFS-e emitida | ✅ | — |
| **Integração real com API NFS-e municipal** | 🔴⬜ | Toda a lógica de emissão é interna (registro no banco). Nenhuma chamada sai para a prefeitura. Falta integrar com API NFS-e (ver Seção 7) |
| **Recebimento do número da nota e PDF da prefeitura** | 🔴⬜ | O campo `numero` e `pdf_url` existem no banco, mas nunca são preenchidos automaticamente. Precisam vir do retorno da API municipal |
| **Fila de reprocessamento em caso de timeout** | 🟡⬜ | Se a API da prefeitura falhar, a nota fica em `pendente` para sempre. Falta job de retry com backoff exponencial |
| Cancelamento de NFS-e junto à prefeitura | 🔄 | `cancelNfse()` só muda status no banco. Falta chamar API de cancelamento municipal |
| Histórico de tentativas de emissão | 🟢⬜ | Não há log de tentativas/erros por NFS-e |

---

## SEÇÃO 4 — PORTAL PJ

| Item | Status | O que falta |
|---|---|---|
| Dashboard PJ com KPIs | ✅ | — |
| Lista de contratos com status e NFS-e | ✅ | — |
| Emissão de NFS-e pelo portal | ✅ | — |
| Lista de pagamentos com status NFS-e | ✅ | — |
| Perfil com dados bancários e Pix | ✅ | — |
| **Visualizar contrato completo (PDF inline)** | 🟡🔄 | Botão "Ver" linka para `/contratos/:id` mas o PJ vê a tela admin. Falta uma visualização somente-leitura adaptada para o PJ com o documento renderizado inline (sem opções de edição) |
| **Acompanhar status do pagamento em tempo real** | 🟡⬜ | PJ só vê status do banco sem atualização em tempo real. Falta Realtime subscription na tela `PJPagamentos` |
| Upload de documentos complementares pelo PJ | 🟢⬜ | PJ não pode enviar documentos (RG, CNPJ, contratos anteriores) pelo portal |
| Histórico de NFS-e emitidas com download do PDF | 🟢⬜ | PJ não tem tela de histórico de notas emitidas com links para download |
| Notificações em tempo real no portal PJ | 🟡⬜ | `NotificationBell` só existe no layout admin. Portal PJ não tem sino de notificações |

---

## SEÇÃO 5 — CONTRATOS

| Item | Status | O que falta |
|---|---|---|
| Todos os 9 estados do ciclo de vida | ✅ | — |
| Timeline visual dos estados | ✅ | — |
| Renovação, Suspensão, Encerramento | ✅ | — |
| Formulário completo (PJ + CLT + campos eSocial) | ✅ | — |
| Remuneração variável (meta, entregável, hora, misto) | ✅ | — |
| Painel de metas e entregáveis | ✅ | — |
| Anexos por contrato | ✅ | — |
| **Visualizador PDF inline (sem precisar baixar)** | 🟡⬜ | `ContratoDocumento.tsx` usa `window.print()` para PDF. Não existe renderização inline via `<iframe>` ou PDF.js. Usuário precisa baixar para ver o conteúdo formatado |
| **Envio do contrato para assinatura por e-mail automaticamente** | 🔄 | Botão existe em `ContratoDetalhes` mas depende da integração com provedor externo de assinatura para envio real |
| Lembrete automático de assinatura pendente | 🔄 | Edge function `contract-signed-notification` existe mas é disparada manualmente. Falta job agendado (pg_cron) enviando lembrete em D+3 se não assinou |
| **Alertas de vencimento por e-mail (não só in-app)** | 🟡🔄 | `contract-expiration-alerts` existe como edge function, mas não há cron configurado para dispará-la diariamente |
| Busca full-text dentro do corpo do contrato | 🟢⬜ | Não implementado |

---

## SEÇÃO 6 — AUDITORIA E COMPLIANCE

| Item | Status | O que falta |
|---|---|---|
| Log de auditoria por ação | ✅ | — |
| Painel central com filtros e exportação CSV | ✅ | — |
| Hash SHA-256 de integridade por linha | ✅ | — |
| **Exportação para IPFS** | 🔵⬜ | Hash calculado client-side mas nenhuma publicação em IPFS. Falta integrar com Pinata, Filebase ou web3.storage |
| Assinatura digital do log exportado (garantia de não-repúdio) | 🔵⬜ | CSV não é assinado digitalmente. Falta assinar com chave privada da empresa ao exportar |
| Retenção automatizada e expurgo conforme LGPD | 🟢⬜ | Não há política de retenção implementada. Logs crescem indefinidamente |
| **Relatório de auditoria por contrato (export PDF)** | 🟢⬜ | Existe timeline por contrato mas não há exportação em PDF do histórico |

---

## SEÇÃO 7 — INTEGRAÇÕES EXTERNAS (LISTA COMPLETA)

### 7.1 NFS-e — API Municipal

> **Situação atual:** Registro interno apenas. Zero integração real.

| # | O que integrar | API sugerida | Complexidade |
|---|---|---|---|
| 1 | Emissão automática de NFS-e | **Enotas** (multi-município, REST), **Nuvem Fiscal**, ou API direta da prefeitura (ex: ABRASF padrão) | Alta |
| 2 | Consulta de status da nota | Polling/webhook no retorno da API | Média |
| 3 | Download do PDF e XML da nota | Endpoint de download da mesma API | Baixa |
| 4 | Cancelamento junto à prefeitura | Endpoint de cancelamento da API | Média |
| 5 | DPS/RPS (Recibo Provisório) para prefeituras que exigem | Via ABRASF ou Enotas | Alta |

**Serviços recomendados:**
- [Enotas](https://app.enotas.com.br) — cobre 3.000+ municípios, REST simples, sandbox gratuito
- [Nuvem Fiscal](https://www.nuvemfiscal.com.br) — NFS-e + NF-e + CT-e, SDK TypeScript disponível
- [Focus NFe](https://focusnfe.com.br) — suporte técnico em PT-BR

---

### 7.2 Pagamentos / Gateway Financeiro

> **Situação atual:** Aprovação só muda `status` no banco. Nenhuma transferência real.

| # | O que integrar | API sugerida | Complexidade |
|---|---|---|---|
| 1 | Transferência Pix para PJ | **Asaas**, **Efí (ex-Gerencianet)**, **Celcoin** ou **iugu** | Alta |
| 2 | Split de pagamento entre beneficiários | Asaas Split, iugu Transferência Automática | Alta |
| 3 | Geração de boleto (pagamento de empresa para PJ por boleto) | Asaas, iugu, Efí | Média |
| 4 | Webhook de confirmação de pagamento | Qualquer um acima oferece webhook | Média |
| 5 | Conciliação bancária automática | Open Finance via **Pluggy** ou **Belvo** | Alta |
| 6 | Saldo disponível em conta (visão do financeiro) | Open Finance / Pluggy | Média |

**Serviços recomendados:**
- [Asaas](https://www.asaas.com) — Pix + boleto + split, API REST, sandbox, conta digital própria
- [Efí Bank](https://efi.com.br) — Pix + split + webhook, SDK Node.js disponível
- [iugu](https://www.iugu.com) — market-tested para split de recebíveis

---

### 7.3 Assinatura Digital com Validade Jurídica

> **Situação atual:** `ISignatureProvider` definida mas `createSignatureProvider()` retorna `null` para todos os provedores.

| # | O que integrar | API sugerida | Complexidade |
|---|---|---|---|
| 1 | Envio de documento para assinatura | **ClickSign**, **D4Sign**, **Autentique** ou **ZapSign** | Alta |
| 2 | Notificação do assinante por e-mail/SMS | Incluído nos provedores acima | Baixa |
| 3 | Webhook quando documento for assinado | Incluído nos provedores acima | Média |
| 4 | Download do documento assinado com carimbo de tempo | Incluído nos provedores acima | Baixa |
| 5 | Certificado ICP-Brasil (assinatura com validade legal máxima) | D4Sign + Serpro / Certisign | Alta |

**Serviços recomendados:**
- [D4Sign](https://www.d4sign.com.br) — melhor custo-benefício, suporte ICP-Brasil, REST + webhook
- [ZapSign](https://www.zapsign.com.br) — mais simples, bom para volume alto, API bem documentada
- [ClickSign](https://www.clicksign.com) — mais estabelecida no mercado brasileiro

---

### 7.4 Validação de Identidade (KYC/KYB)

> **Situação atual:** Validação de CNPJ via Receita Federal existe, mas é apenas dados públicos.

| # | O que integrar | API sugerida | Complexidade |
|---|---|---|---|
| 1 | Validação de CPF (PJ pessoa física) | **Serpro Dataprev**, **BigID**, **Idwall** | Média |
| 2 | Validação de CNPJ + situação cadastral em tempo real | **Receita WS** (gratuito), **Serpro** (produção) | Baixa |
| 3 | Verificação de listas restritivas (PEP, sanções OFAC) | **Idwall**, **Unico** | Média |
| 4 | Reconhecimento facial + prova de vida (onboarding PJ) | **Unico Check**, **Idwall**, **AWS Rekognition** | Alta |
| 5 | Leitura de documentos (CNH, RG, CNPJ cartão) | **Unico**, **AWS Textract** | Alta |

---

### 7.5 E-mail Transacional

> **Situação atual:** edge function `send-email` usa Resend. Funcional se `RESEND_API_KEY` estiver no ambiente.

| # | O que verificar/integrar | Detalhe |
|---|---|---|
| 1 | Confirmar que `RESEND_API_KEY` está configurada no Supabase Dashboard | Sem essa variável todos os e-mails falham silenciosamente |
| 2 | Configurar domínio de envio próprio (`@aurecontrol.com.br`) | Hoje usa `noreply@gabrielsanztech.com.br` |
| 3 | Bounce handling e unsubscribe | Resend oferece webhooks de bounce que não estão tratados |
| 4 | Templates de e-mail HTML responsivos | Templates básicos existem em `emailTemplates.ts` mas poderiam ser melhorados |

---

### 7.6 Notificações Push / SMS

> **Situação atual:** Notificações somente in-app. Zero push/SMS.

| # | O que integrar | API sugerida | Complexidade |
|---|---|---|---|
| 1 | WhatsApp para notificações críticas (vencimento, pagamento) | **Z-API**, **Evolution API** (open-source), **Twilio WhatsApp** | Média |
| 2 | SMS para confirmação de identidade e alertas | **Twilio SMS**, **AWS SNS**, **Infobip** | Média |
| 3 | Push Notification (browser/PWA) | Web Push API via **OneSignal** ou nativo | Média |

---

### 7.7 Armazenamento e CDN

> **Situação atual:** Supabase Storage usado para assinaturas e anexos. Funcional.

| # | O que melhorar | Detalhe |
|---|---|---|
| 1 | CDN para PDFs de contrato (acesso rápido e seguro) | Cloudflare R2 ou AWS S3 + CloudFront |
| 2 | **IPFS/Arweave para contratos assinados** | Hash calculado mas arquivo nunca sobe para rede descentralizada |
| 3 | Expurgo automático de arquivos temporários | Supabase Storage não tem lifecycle rules nativas |

---

### 7.8 Automação e Agendamento (Cron Jobs)

> **Situação atual:** Nenhum cron configurado. Edge functions que deveriam rodar diariamente são chamadas manualmente.

| # | O que configurar | Frequência sugerida |
|---|---|---|
| 1 | `contract-expiration-alerts` — avisos de vencimento | Diário às 08h |
| 2 | `billing-due-reminder` — lembrete de cobrança vencendo | Diário às 09h |
| 3 | `generate-monthly-billings` — gera obrigações do mês | 1º dia do mês às 06h |
| 4 | Job de retry NFS-e pendentes | A cada 30 minutos |
| 5 | Lembrete de assinatura pendente (D+3) | Diário às 10h |
| 6 | Expurgo de logs antigos (LGPD / retenção) | Semanal |

**Implementação:** Supabase `pg_cron` extension ou cron externo (GitHub Actions schedule, railway cron).

---

### 7.9 Blockchain / Registro Imutável

> **Situação atual:** Não implementado. Fase 4.

| # | O que integrar | API sugerida |
|---|---|---|
| 1 | Registro do hash do contrato assinado em blockchain | **Polygon** (baixo custo), **Ethereum Mainnet** |
| 2 | Upload do PDF para rede descentralizada | **IPFS** via Pinata ou **Arweave** (permanente) |
| 3 | NFT de certificado de assinatura | Opcional, diferencial premium |

---

### 7.10 Contabilidade / eSocial / SPED

> **Situação atual:** Campos eSocial coletados no banco, mas nenhum export.

| # | O que integrar | Detalhe |
|---|---|---|
| 1 | **Geração de arquivo XML eSocial** | Eventos S-2200, S-2205, S-1200 para CLT | Via **Domínio Sistemas** parceiro TOTVS, ou lib open-source `esocial-js` |
| 2 | Exportação para contador (SPED Contribuições) | Arquivo TXT padrão SPED |
| 3 | Integração com sistemas contábeis | **Omie API**, **Conta Azul API**, **QuickBooks** |
| 4 | DIRF anual (retenções IRF) | Export manual, automatizável via banco + template |

---

## SEÇÃO 8 — FUNCIONALIDADES UI/UX PENDENTES

| Item | Prioridade | Descrição |
|---|---|---|
| Visualizador PDF inline | 🟡 | `ContratoDocumento.tsx` não renderiza inline. Usar `react-pdf` ou `<iframe>` para exibir o PDF do contrato sem download |
| Realtime no portal PJ | 🟡 | `PJPagamentos` não tem subscription Supabase Realtime — PJ não vê atualização de status sem recarregar |
| Notificações no portal PJ | 🟡 | `NotificationBell` só está no layout admin. PJ não recebe alertas in-app |
| Upload de documentos pelo PJ | 🟢 | PJ não pode enviar RG, comprovante de endereço, cartão CNPJ pelo portal |
| Histórico NFS-e com download | 🟢 | PJ não tem tela dedicada de histórico de notas com PDF |
| Dashboard financeiro com gráficos por período | 🟢 | Gráficos existem mas não têm filtro dinâmico por trimestre/semestre/ano |
| Onboarding guiado master admin (tour) | 🟢 | Não há guia passo a passo para novos usuários master |
| Modo offline / PWA | 🔵 | App não funciona offline. `manifest.json` existe mas sem service worker |
| App mobile nativo | 🔵 | Somente web responsivo. Falta React Native / Expo para iOS e Android |

---

## SEÇÃO 9 — SEGURANÇA E INFRAESTRUTURA

| Item | Status | O que falta |
|---|---|---|
| Row Level Security (RLS) no Supabase | 🔄 | Políticas existem nas tabelas principais mas precisam de auditoria de cobertura completa |
| Rate limiting nas edge functions | 🟡⬜ | Nenhuma proteção contra abuso nas APIs de CNPJ, email, etc. |
| **Secrets de API (chaves de provedores)** | 🔴⬜ | ClickSign, D4Sign, Asaas, Enotas, Resend — nenhuma das chaves está no ambiente de produção ainda |
| 2FA / MFA para master_admin | 🟡⬜ | Supabase Auth suporta TOTP mas não está habilitado no projeto |
| Auditoria de acessos suspeitos (geo, horário) | 🔵⬜ | Não implementado |
| Backup automatizado do banco com retenção 30 dias | 🟡⬜ | Depende de configuração do host (Contabo). Verificar e automatizar |
| LGPD — solicitação de exclusão de dados | 🟢⬜ | Não há tela/fluxo para direito ao esquecimento |

---

## SEÇÃO 10 — RESUMO EXECUTIVO DE PRIORIDADES

### 🔴 Bloqueadores para produção real (MVP com dinheiro real)
1. Integração com gateway de pagamento Pix (Asaas ou Efí) + execução do split
2. Integração com API NFS-e municipal (Enotas ou Nuvem Fiscal)
3. Integração com provedor de assinatura com validade jurídica (D4Sign ou ZapSign)
4. Configurar `RESEND_API_KEY` no ambiente de produção (e-mails)
5. Configurar crons para alertas de vencimento e geração mensal de obrigações

### 🟡 Alta prioridade (melhoria de experiência)
6. Visualizador PDF inline em `ContratoDocumento`
7. Realtime + NotificationBell no portal PJ
8. Webhook de retorno do provedor de assinatura
9. Fila de retry para NFS-e com falha
10. 2FA para administradores

### 🟢 Média prioridade (completude do produto)
11. Upload de documentos pelo portal PJ
12. Crons agendados via pg_cron (Supabase)
13. KYC/Validação de CPF do PJ
14. Histórico NFS-e com download de PDF pelo PJ
15. Integração com sistemas contábeis (Omie API ou Conta Azul)

### 🔵 Longo prazo (Fases 2–4)
16. Registro em blockchain (Polygon) + IPFS
17. eSocial — geração de XML
18. Módulo de Escrow Digital
19. App mobile nativo (React Native)
20. Open Finance / conciliação bancária automática
