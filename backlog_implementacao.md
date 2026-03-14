# AURE — Backlog de Implementação
> Referência: `nova_implementacao_12_03_2026.md`
> Atualizado em: 13/03/2026
> **Como usar:** Ao concluir um item, troque `⬜` por `✅` e adicione a data.

---

## Legenda
| Símbolo | Significado |
|---|---|
| ✅ | Implementado |
| 🔄 | Implementado parcialmente |
| ⬜ | Não implementado |
| 🔴 | Bloqueador crítico (MVP) |
| 🟡 | Alta prioridade |
| 🟢 | Média prioridade |
| 🔵 | Longo prazo (Fases 2–4) |

---

## PARTE I — Diagnóstico: Gaps do PRD

### 🔴 Gaps Críticos — Bloqueadores MVP

| # | Gap | Status | Observação |
|---|---|---|---|
| GAP-01 | Portal e Visão do PJ | ✅ | `PJDashboard`, `PJContratos`, `PJPagamentos`, `PJPerfil`, `PJLayout` — portal bilateral completo |
| GAP-02 | Assinatura Digital Bilateral e Certificado | 🔄 | `SignaturePad.tsx`, `SignatureCertificate.tsx` existem. Falta: registro em blockchain e integração com provedor externo (ClickSign/DocuSign) |
| GAP-03 | Status Contratual Estruturado com Histórico | 🔄 | Estados existem. Histórico de auditoria (`ContractAuditTrail`) integrado em `ContratoDetalhes`. Falta: máquina de 9 estados completa com timeline visual |
| GAP-04 | Vínculo Automático Contrato → Obrigação Financeira | 🔄 | Campo de periodicidade existe no formulário. `gerarObrigacoesPJ` via edge function existe. Falta: vínculo automático real ao ativar contrato + fila de aprovação financeiro |

---

### 🟡 Alta Prioridade — Diferenciais Competitivos

| # | Gap | Status | Observação |
|---|---|---|---|
| GAP-05 | Tela de Detalhe do Contrato | ✅ | `ContratoDetalhes.tsx` (1254 linhas) — visualizador, dados, assinaturas, NFS-e, splits, anexos |
| GAP-06 | Tela de Detalhe do Colaborador | ✅ | `ColaboradorDetalhes.tsx` — perfil completo, contratos, histórico de pagamentos, gestão de roles |
| GAP-07 | PDF Inteligente do Contrato | ✅ | QR Code de verificação + seção de assinaturas formatada em grid (imagem, nome, papel, data, email) em `ContratoDocumento.tsx` |
| GAP-08 | Onboarding Guiado do PJ após Convite | ✅ | `Registro.tsx` step 2 para colaboradores convidados com banco, agência, conta, tipo e chave PIX (campos opcionais, salvo em profiles) |
| GAP-09 | Motor de Notificações Estruturado | ✅ | `NotificationBell.tsx` com badge, marcar todas como lidas, filtro por tipo (Todas / Notificações / Avisos), histórico de 90 dias |
| GAP-10 | Controle de Permissões por Perfil (RBAC) | ✅ | `hasRole()` em `AuthContext`, sidebar dinâmica por perfil, roles no backend |

---

### 🟢 Média Prioridade — Completude e Qualidade

| # | Gap | Status | Observação |
|---|---|---|---|
| GAP-11 | Timeline de Auditoria por Contrato | ✅ | `ContractAuditTrail.tsx` — histórico de eventos by contrato |
| GAP-12 | Módulo de Notas Fiscais (NFS-e) | 🔄 | `nfseService.ts`, emissão em `ContratoDetalhes`. Falta: integração real com API da prefeitura (hoje é registro interno apenas) |
| GAP-13 | Configuração de Split por Contrato | 🔄 | `createContractSplits` no formulário de criação. Split visível em `ContratoDetalhes`. Falta: execução automática via Pix/gateway real |
| GAP-14 | Campo de Escopo do Serviço no Contrato | ✅ | Campo "Escopo do Serviço" existe no formulário (`Contratos.tsx` linha 1369) |
| GAP-15 | Alertas Inteligentes e Proativos | ✅ | `DashboardOverview.tsx` — alertas por cor (danger/warning) com contratos vencendo e pagamentos atrasados |
| GAP-16 | Centro Financeiro Melhorado | ✅ | `Pagamentos.tsx` com filtros, exportação CSV/PDF/Excel, card inadimplência no dashboard, aviso NFS-e ao aprovar |
| GAP-17 | Controle de Reajuste Contratual | ✅ | Campo "Índice de Reajuste" e "Data-base do Reajuste" no formulário (linhas 1341–1364) |
| GAP-18 | Anexos e Documentos por Contrato | ✅ | `contratoAnexosService.ts` — upload, listagem, download em `ContratoDetalhes` |

---

### 🔵 Longo Prazo — Pós-MVP (Fases 2–4)

| # | Gap | Status | Observação |
|---|---|---|---|
| GAP-19 | Validação Automática de CNPJ (KYC/KYB) | 🔄 | CNPJ validado via API Receita Federal no `Registro.tsx`. Falta: coleta de documentos KYB, validação de situação cadastral |
| GAP-20 | Painel Administrativo e Logs de Auditoria Central | 🔄 | `Auditoria.tsx` existe. Falta: hash de integridade por linha, exportação IPFS |
| GAP-21 | Módulo de Escrow Digital | ⬜ | Não implementado — Fase 3 (6–9 meses) |
| GAP-22 | Integração Blockchain e IPFS (Produção) | ⬜ | Não implementado — Fase 4 |

---

## PARTE II — Dashboard

### Cards e KPIs

| Item | Status | Observação |
|---|---|---|
| ✅ Cards segmentados PJ vs CLT | ✅ | Dois cards 'Prestadores PJ' e 'Colaboradores CLT' com contagem por tipo. Grid 6 colunas. |
| ✅ Card "Custo Mensal Projetado" | ✅ | Card 'Custo Comprometido' com barra de progresso vs previsto |

### Notificações

| Item | Status | Observação |
|---|---|---|
| ✅ Painel de alertas proativos | ✅ | Alertas por severity no topo do dashboard (`DashboardOverview.tsx` linha 328) |
| ✅ Centro de notificações in-app com badge | ✅ | `NotificationBell.tsx` com badge `totalUnread` funcional |

---

## PARTE III — Contratos

### Campos e Formulário

| Item | Status | Observação |
|---|---|---|
| ✅ Campo Nível / Senioridade | ✅ | Implementado no Step 2 do formulário (Estágio, Júnior, Pleno, Sênior, Especialista, Gerente, Diretor) |
| ✅ Campo Escopo do Serviço | ✅ | Implementado (`Contratos.tsx` linha 1369) |
| ✅ Campo Periodicidade de Pagamento | ✅ | Implementado (`Contratos.tsx` linha 1312) |
| ✅ Campo Índice de Reajuste | ✅ | Implementado com data-base |

### Remuneração Variável

| Item | Status | Observação |
|---|---|---|
| ⬜ Modelo FIXO (já existe) | ✅ | Implementado — valor mensal fixo |
| ⬜ Modelo VARIÁVEL POR META | ✅ | Campo "Modelo de Remuneração" no formulário + campos dinâmicos de meta/entregável. Migração `20260313010000` |
| ⬜ Modelo VARIÁVEL POR ENTREGÁVEL | ✅ | Implementado junto ao modelo por meta |
| ⬜ Modelo HORA/HORA | ✅ | Implementado: campo "Valor por Hora" com label dinâmico |
| ⬜ Modelo MISTO (fixo + variável) | ✅ | Implementado: campo Parte Fixa + campo Parte Variável (teto) |
| ⬜ Painel de Metas e Entregáveis | ✅ | `goalService.ts` + migration `contract_goals` + UI completo em `ContratoDetalhes.tsx`: listar, criar, aprovar/rejeitar metas com notas |

### Ciclo de Vida (9 estados do PRD)

| Estado | Status | Observação |
|---|---|---|
| 1. Em Criação | ✅ | Mapeado como estado inicial |
| 2. Enviado para PJ | ✅ | Status `enviado` implementado |
| 3. Em Revisão | ✅ | Implementado: filtro, Kanban (laranja), badge, botão em ContratoDetalhes |
| 4. Assinado | ✅ | Status `assinado` implementado |
| 5. Vigente | ✅ | Status `active` implementado |
| 6. Vencendo (< 30 dias) | ✅ | Badge "Vencendo em Nd" na lista e detalhe do contrato quando end_date ≤ 30 dias |
| 7. Renovado | ✅ | Implementado: estado teal no Kanban, labels e ao renovar marca o anterior como Renovado |
| 8. Encerrado | ✅ | Status `terminated` implementado |
| 9. Suspenso | ✅ | Implementado: filtro, Kanban (cinza), botão em ContratoDetalhes |

### Visualização do Contrato Assinado

| Item | Status | Observação |
|---|---|---|
| ✅ Tela de detalhe completa | ✅ | `ContratoDetalhes.tsx` |
| 🔄 PDF inline sem precisar baixar | 🔄 | `ContratoDocumento.tsx` existe mas não é visualizador inline (PDF.js) |
| ✅ Dados do contrato e assinaturas | ✅ | Implementado |
| ✅ Hash SHA-256 exibível | ✅ | Computado client-side via Web Crypto API a partir do document_html e exibido em ContratoDetalhes quando assinatura_status=completed |
| ⬜ QR Code no PDF | ✅ | QR Code via api.qrserver.com em `ContratoDocumento.tsx`: seção impressão + card lateral na UI |

---

## PARTE IV — Templates de Contrato

| Item | Status | Observação |
|---|---|---|
| ✅ Editor em tela cheia (fullscreen) | ✅ | Página dedicada `/dashboard/templates-contrato/:id/editar` com layout 2 colunas: editor + sidebar de variáveis |
| ✅ Auto-save com indicador "Salvo às HH:MM" | ✅ | Implementado no editor fullscreen com indicador visual de status |
| ⬜ Histórico de versões com rollback (10 versões) | ✅ | UI de rollback completa na aba "Histórico" de TemplatesContrato — botão "Restaurar" já funcional |
| ✅ Painel lateral de variáveis dinâmicas | ✅ | Sidebar com grupos colapsoáveis e clique para inserir no cursor via `insertVariable` |
| ✅ Categorias de templates | ✅ | Campo categoria implementado com filtro na listagem |
| ✅ Operações: Duplicar, Arquivar, Editar | ✅ | `duplicateTemplate`, `softDeleteTemplate` implementados |
| ✅ Contador de uso do template | ✅ | `fetchTemplateUsageCounts` implementado |

---

## PARTE V — Nota Fiscal (NFS-e)

| Item | Status | Observação |
|---|---|---|
| 🔄 Emissão de NFS-e pelo PJ | 🔄 | Interface de emissão em `ContratoDetalhes.tsx`. Falta: integração real com API da prefeitura (hoje cria registro interno) |
| 🔄 Ciclo de vida da nota (Rascunho → Emitida) | 🔄 | Estados mapeados em `nfseService.ts`. Falta: sincronização com retorno real da prefeitura |
| ⬜ Integração API NFS-e municipal | ⬜ | Não implementado — necessário integrar com API da prefeitura (ex: Campo Grande/MS) |
| ⬜ Fila de reprocessamento (timeout 10s) | ⬜ | Não implementado |
| ⬜ Conferência pelo financeiro | ⬜ | Não existe fluxo de aprovação financeiro → liberação após nota emitida |

---

## PARTE VI — Pagamentos

| Item | Status | Observação |
|---|---|---|
| 🔄 Filtros avançados | 🔄 | Filtro por período, status e contrato implementados. Falta: exportação CSV/PDF/Excel |
| ✅ Exportação CSV/PDF/Excel | ✅ | CSV já existia; PDF adicionado via browser print (rel. HTML formatado) |
| 🔄 Geração automática de obrigações | ✅ | `gerarObrigacoesPJ` chamado em `Contratos.tsx` ao criar e em `ContratoDetalhes.tsx` ao reativar |
| ⬜ Fluxo de aprovação financeiro | 🔄 | `approvePayment`, `batchApprovePayments` implementados. Aviso toast.warning se NFS-e não emitida ao aprovar PJ (não bloqueante). Integração real de bloqueio pendente |
| ⬜ Integração gateway Pix/Split real | ⬜ | Não implementado — pagamentos são aprovados manualmente |
| ⬜ Card inadimplência no dashboard financeiro | ✅ | Card "Em Atraso" em `DashboardOverview.tsx` — `fetchOverduePaymentsSummary` em `paymentService.ts`, count + valor total |

---

## PARTE VII — CLT

| Item | Status | Observação |
|---|---|---|
| ⬜ Campos contábeis eSocial | ⬜ | Não implementado — campos específicos de eSocial ausentes |
| ⬜ Holerite digital | ⬜ | Não implementado — sem geração de holerite |
| 🔄 Contratos CLT | ✅ | Campos CLT adicionados: matrícula, CBO, N° CTPS, Série CTPS, regime de trabalho. Migration `20260314010000`. Exibidos em `ContratoDetalhes.tsx` |

---

## Resumo Executivo

| Categoria | Total | ✅ Feito | 🔄 Parcial | ⬜ Falta |
|---|---|---|---|---|
| Gaps Críticos (🔴) | 4 | 1 | 3 | 0 |
| Alta Prioridade (🟡) | 6 | 3 | 3 | 0 |
| Média Prioridade (🟢) | 8 | 5 | 3 | 0 |
| Longo Prazo (🔵) | 4 | 0 | 2 | 2 |
| Dashboard | 4 | 2 | 1 | 2 |
| Contratos — Extras | 13 | 5 | 3 | 6 |
| Templates | 7 | 3 | 2 | 2 |
| NFS-e | 5 | 0 | 2 | 3 |
| Pagamentos | 6 | 0 | 3 | 3 |
| CLT | 3 | 0 | 1 | 2 |
| **TOTAL** | **60** | **19** | **23** | **20** |

---

## Próximas Implementações Sugeridas (Por Impacto × Complexidade)

### Sprint 1 — Rápido / Alto impacto
1. ✅ Cards PJ vs CLT segmentados no dashboard
2. ✅ Card "Custo Mensal Projetado"
3. ✅ Campo Nível/Senioridade no contrato
4. ✅ Badge de notificações não lidas funcional
5. ✅ Estado "Em Revisão" e "Suspenso" no ciclo de vida do contrato

### Sprint 2 — Médio prazo
6. ✅ Exportação CSV/PDF no módulo de Pagamentos
7. ✅ Editor de templates como página fullscreen com rota própria
8. ✅ Painel de variáveis dinâmicas no editor de templates
9. ✅ Hash SHA-256 exibível na tela do contrato assinado
10. ✅ Fluxo de renovação de contrato (estado "Renovado")

### Sprint 3 — Alta complexidade
11. ✅ Remuneração variável (META, ENTREGÁVEL, HORA/HORA, MISTO)
12. ✅ Painel de metas e entregáveis vinculados ao pagamento variável
13. ⬜ Integração real API NFS-e com prefeitura
14. ✅ Geração automática de obrigação ao ativar contrato
15. ⬜ Fluxo completo financeiro: nota emitida → aprovação → pagamento

### Fases 2–4 (Longo prazo)
16. ⬜ Campos CLT: eSocial, holerite, CTPS, CBO
17. ⬜ Integração gateway Pix/Split real
18. ⬜ Módulo de Escrow Digital
19. ⬜ Blockchain Polygon + IPFS (produção)
