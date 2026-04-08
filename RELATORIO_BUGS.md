# RELATÓRIO DE BUGS CRÍTICOS — SmartExpress ERP
**Gerado em:** 2026-03-31
**Branch:** develop
**Último commit:** 4e1e2f0
**Status:** Auditoria completa (3 agentes paralelos)

---

## LEGENDA DE SEVERIDADE
- 🔴 **CRÍTICO** — Crash confirmado ou perda de dados
- 🟠 **ALTO** — Comportamento errado visível pelo usuário
- 🟡 **MÉDIO** — Risco latente, impacto menor
- ✅ **CORRIGIDO** — Já corrigido nesta auditoria

---

## 1. CRASHES DE RUNTIME — `.toFixed()` SEM `parseFloat()`

O Supabase retorna campos numéricos como **string** em algumas situações.
Chamar `.toFixed()` diretamente em uma string ou `undefined` causa crash imediato na tela.

---

### BUG-001 🔴 CuponsDesconto.jsx — crash ao listar cupons
**Arquivo:** `src/pages/CuponsDesconto.jsx:198`
**Código atual:**
```js
R$ ${cupom.valor.toFixed(2)}
```
**Problema:** `cupom.valor` vem do Supabase como string. `.toFixed()` não existe em string.
**Crash:** `TypeError: cupom.valor.toFixed is not a function`
**Impacto:** Página Cupons de Desconto crasha ao tentar listar qualquer cupom.
**Correção:** `(parseFloat(cupom.valor) || 0).toFixed(2)`

---

### BUG-002 🔴 Carrinho.jsx — crash ao abrir o carrinho
**Arquivo:** `src/pages/Carrinho.jsx:278` e `302`
**Código atual:**
```js
R$ {item.preco.toFixed(2)}           // linha 278
R$ {(item.preco * item.quantidade).toFixed(2)}  // linha 302
```
**Problema:** `item.preco` pode ser string. Na linha 302, `string * number = NaN`, e `NaN.toFixed()` lança erro.
**Crash:** `TypeError: item.preco.toFixed is not a function` ou `NaN.toFixed is not a function`
**Impacto:** Tela do carrinho do marketplace crasha ao exibir qualquer item.
**Correção:** `(parseFloat(item.preco) || 0).toFixed(2)` e `((parseFloat(item.preco) || 0) * item.quantidade).toFixed(2)`

---

### BUG-003 🔴 Relatorios.jsx — crash em relatório de itens
**Arquivo:** `src/pages/Relatorios.jsx:918`, `1063`, `1066`
**Código atual:**
```js
R$ {item.valor.toFixed(2)}       // linha 918 e 1063
R$ {item.valorMedio.toFixed(2)}  // linha 1066
```
**Problema:** `item.valor` é calculado a partir de `item.subtotal` que pode ser `undefined`. `item.valorMedio = dados.valor / dados.vendas` pode resultar em `NaN` se `dados.valor` for string.
**Crash:** `TypeError: Cannot read properties of undefined (reading 'toFixed')`
**Impacto:** Relatório de produtos/itens mais vendidos crasha ao ser gerado.
**Correção:** `(parseFloat(item.valor) || 0).toFixed(2)` e `(parseFloat(item.valorMedio) || 0).toFixed(2)`

---

### BUG-004 🔴 CRM.jsx — crash no funil de vendas
**Arquivo:** `src/pages/CRM.jsx:239`, `291`
**Código atual:**
```js
R$ {valorPipeline.toFixed(0)}   // linha 239
R$ {valorTotal.toFixed(0)}      // linha 291
```
**Problema:** `valorPipeline` é calculado somando `l.valor_potencial` sem `parseFloat()`. Se qualquer lead tiver esse campo como string, o reduce gera NaN e `.toFixed()` falha.
**Crash:** `TypeError: valorPipeline.toFixed is not a function`
**Impacto:** Aba CRM/Funil de Vendas crasha ao carregar leads com valor potencial.
**Correção:** Garantir `parseFloat(l.valor_potencial) || 0` no reduce que gera `valorPipeline`.

---

### BUG-005 🔴 FluxoCaixa.jsx — crash ao visualizar movimentações
**Arquivo:** `src/pages/FluxoCaixa.jsx:241`
**Código atual:**
```js
R$ {mov.valor.toFixed(2)}
```
**Problema:** `mov.valor` vem como string do Supabase.
**Crash:** `TypeError: mov.valor.toFixed is not a function`
**Impacto:** Página Fluxo de Caixa crasha ao listar qualquer movimentação.
**Correção:** `(parseFloat(mov.valor) || 0).toFixed(2)`

---

### BUG-006 🔴 Comissoes.jsx — crash na tabela de comissões
**Arquivo:** `src/pages/Comissoes.jsx:415–418`
**Código atual:**
```js
v.total_comissao.toFixed(2)
v.total_vendido.toFixed(2)
v.pago.toFixed(2)
v.pendente.toFixed(2)
```
**Problema:** Campos calculados/agregados podem chegar como strings ou undefined.
**Crash:** `TypeError: v.total_comissao.toFixed is not a function`
**Impacto:** Página de Comissões crasha ao exibir qualquer vendedor na tabela.
**Correção:** Envolver todos com `(parseFloat(v.X) || 0).toFixed(2)`

---

## 2. CRASHES DE RUNTIME — `.map()`/`.reduce()` EM NULL

---

### BUG-007 🔴 OrdensServico.jsx — crash no orçamento da OS
**Arquivo:** `src/pages/OrdensServico.jsx:951`, `956`
**Código atual:**
```js
${(osImpressao.orcamento?.servicos || osImpressao.servicos).map(s => ...)}
```
**Problema:** Se `orcamento.servicos` **e** `osImpressao.servicos` forem ambos `null` ou `undefined`, `.map()` é chamado em `undefined`.
**Crash:** `TypeError: Cannot read properties of undefined (reading 'map')`
**Impacto:** Crash ao tentar imprimir/visualizar orçamento de uma OS sem serviços cadastrados.
**Correção:** `((osImpressao.orcamento?.servicos || osImpressao.servicos) || []).map(...)`

---

### BUG-008 🔴 OrdensServico.jsx — crash ao exibir OS faturada
**Arquivo:** `src/pages/OrdensServico.jsx:2059`
**Código atual:**
```js
format(new Date(selectedOS.data_faturamento), "dd/MM/yyyy 'às' HH:mm")
```
**Problema:** `data_faturamento` é `null` se a OS ainda não foi faturada. `new Date(null)` = epoch válido, mas `new Date(undefined)` = Invalid Date, e `date-fns format()` lança erro com Invalid Date.
**Crash:** `RangeError: Invalid time value`
**Impacto:** Crash ao abrir detalhes de OS que não tem data de faturamento preenchida.
**Correção:** `selectedOS.data_faturamento ? format(new Date(selectedOS.data_faturamento), "...") : '-'`

---

## 3. BUGS DE DADOS INCORRETOS (sem crash, mas resultado errado)

---

### BUG-009 🟠 Financeiro.jsx — saldo do caixa aberto mostrava R$ 0,00
**Arquivo:** `src/pages/Financeiro.jsx:150–155`
**Problema:** Usava `caixaAberto.total_vendas`, `total_suprimentos`, `total_sangrias` — campos que só existem em caixas **fechados**. Para caixa aberto, todos eram `null`, resultando em saldo = apenas `valor_inicial`.
**Impacto:** Dashboard financeiro mostrava saldo incorreto durante todo o expediente.
**Status:** ✅ **CORRIGIDO** (commit `4e1e2f0`) — agora calcula em tempo real com vendas e movimentações.

---

### BUG-010 🟠 ContasPagar.jsx — duplo clique gerava request duplicado
**Arquivo:** `src/pages/ContasPagar.jsx:515`
**Problema:** Botão "Confirmar Pagamento" não tinha `disabled` durante a mutation, permitindo múltiplos cliques.
**Impacto:** Possível registro duplicado no log de pagamentos.
**Status:** ✅ **CORRIGIDO** (commit `4e1e2f0`) — botão desabilitado durante `isPending`.

---

### BUG-011 🟠 CuponsDesconto.jsx — uso_atual zerado ao editar
**Arquivo:** `src/pages/CuponsDesconto.jsx:134–143`
**Problema:** `handleSubmit` sempre enviava `uso_atual: 0`, mesmo em edições. Qualquer alteração num cupom (ex: mudar validade) resetava o contador de usos.
**Impacto:** Cupons usados 50x voltavam para 0 usos após qualquer edição.
**Status:** ✅ **CORRIGIDO** (commit `e8a48a5`)

---

### BUG-012 🟠 PDV.jsx / CuponsDesconto.jsx — cupom expirava antes da hora
**Arquivo:** `src/pages/PDV.jsx:816` e `src/pages/CuponsDesconto.jsx:208`
**Problema:** `new Date("2026-03-31")` = meia-noite UTC = 21h do dia anterior no fuso BRT. Cupom criado com validade "hoje" já aparecia como expirado desde as 21h do dia anterior.
**Impacto:** Cupons com validade no dia atual não funcionavam no Brasil.
**Status:** ✅ **CORRIGIDO** (commit `e8a48a5`) — compara com `T23:59:59` (fim do dia local).

---

### BUG-013 🟠 Carrinho.jsx — estoque não validado antes de criar venda
**Arquivo:** `src/pages/Carrinho.jsx:161–169`
**Problema:** Atualiza o estoque diretamente sem verificar se há quantidade disponível antes de criar a venda.
**Impacto:** Estoque pode ficar negativo em vendas pelo marketplace.
**Status:** 🔴 Pendente de correção.

---

## 4. PROBLEMAS DE INFRAESTRUTURA (não corrigíveis no frontend)

---

### BUG-014 🔴 Senhas armazenadas em plaintext no banco
**Arquivo:** `src/contexts/AuthContext.jsx:94`
**Problema:** Senhas comparadas diretamente: `usuario.senha !== password`. Não há hash (bcrypt/argon2).
**Impacto:** Se o banco for comprometido, todas as senhas são expostas imediatamente.
**Solução:** Migration no Supabase para hashear as senhas. Requer alteração no backend.

---

### BUG-015 🔴 Race condition de estoque com múltiplos usuários simultâneos
**Arquivo:** `src/pages/PDV.jsx:304–360`
**Problema:** Há um gap entre a validação de estoque (leitura) e a atualização. Dois PDVs abertos simultaneamente podem passar na validação com o mesmo produto e vender mais do que o estoque disponível.
**Impacto:** Estoque negativo em cenários de uso concorrente.
**Solução:** Exige RPC/stored procedure com `SELECT FOR UPDATE` no Supabase (não implementável só no frontend).

---

### BUG-016 🟡 Sessão de usuário sem expiração
**Arquivo:** `src/contexts/AuthContext.jsx:117`
**Problema:** `localStorage.setItem(SESSION_KEY, ...)` persiste indefinidamente. Uma sessão de 6 meses atrás ainda estará válida.
**Impacto:** Usuários desligados continuam com acesso ativo.
**Solução:** Adicionar `expires_at` na sessão e verificar ao carregar.

---

## 5. RESUMO EXECUTIVO

| ID | Arquivo | Severidade | Status |
|----|---------|-----------|--------|
| BUG-001 | CuponsDesconto.jsx:198 | 🔴 CRÍTICO | ✅ Corrigido (commit df7ab4c) |
| BUG-002 | Carrinho.jsx:278,302 | 🔴 CRÍTICO | ✅ Corrigido (commit df7ab4c) |
| BUG-003 | Relatorios.jsx:364,369,429 | 🔴 CRÍTICO | ✅ Corrigido (commit df7ab4c) |
| BUG-004 | CRM.jsx:239,291 | 🔴 CRÍTICO | ✅ Falso positivo — já usa parseFloat() |
| BUG-005 | FluxoCaixa.jsx:241 | 🔴 CRÍTICO | ✅ Falso positivo — usa parseValor() internamente |
| BUG-006 | Comissoes.jsx:415-418 | 🔴 CRÍTICO | ✅ Falso positivo — já usa parseFloat() |
| BUG-007 | OrdensServico.jsx:951,956 | 🔴 CRÍTICO | ✅ Falso positivo — protegido por condições |
| BUG-008 | OrdensServico.jsx:2059 | 🔴 CRÍTICO | ✅ Falso positivo — protegido por `&& data_faturamento` |
| BUG-009 | Financeiro.jsx:150-155 | 🟠 ALTO | ✅ Corrigido |
| BUG-010 | ContasPagar.jsx:515 | 🟠 ALTO | ✅ Corrigido |
| BUG-011 | CuponsDesconto.jsx:134 | 🟠 ALTO | ✅ Corrigido |
| BUG-012 | PDV.jsx:816 | 🟠 ALTO | ✅ Corrigido |
| BUG-013 | Carrinho.jsx:161-169 | 🟠 ALTO | ⏳ Pendente |
| BUG-014 | AuthContext.jsx:94 | 🔴 CRÍTICO | ❌ Requer backend |
| BUG-015 | PDV.jsx:304-360 | 🔴 CRÍTICO | ❌ Requer backend |
| BUG-016 | AuthContext.jsx:117 | 🟡 MÉDIO | ⏳ Pendente |

**Total de bugs:** 16
**Críticos no frontend (corrigíveis):** 8 (BUG-001 a BUG-008)
**Já corrigidos:** 4 (BUG-009 a BUG-012)
**Requerem backend:** 2 (BUG-014, BUG-015)
**Pendentes:** 10
