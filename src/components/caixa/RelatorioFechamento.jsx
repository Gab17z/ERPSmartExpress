import { format } from "date-fns";

const FORMAS_LABEL = {
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão Crédito",
  cartao_debito: "Cartão Débito",
  pix: "PIX",
  cheque: "Cheque",
  a_prazo: "A Prazo",
  credito_parcelado: "Créd. Parcelado",
  outros: "Outros",
};

const NOTAS_LABELS = [
  { chave: "200", label: "R$ 200" },
  { chave: "100", label: "R$ 100" },
  { chave: "50", label: "R$ 50" },
  { chave: "20", label: "R$ 20" },
  { chave: "10", label: "R$ 10" },
  { chave: "5", label: "R$ 5" },
  { chave: "2", label: "R$ 2" },
];

const MOEDAS_LABELS = [
  { chave: "1", label: "R$ 1,00", valor: 1 },
  { chave: "0.5", label: "R$ 0,50", valor: 0.5 },
  { chave: "0.25", label: "R$ 0,25", valor: 0.25 },
  { chave: "0.1", label: "R$ 0,10", valor: 0.1 },
  { chave: "0.05", label: "R$ 0,05", valor: 0.05 },
];

function fmt(valor) {
  return (parseFloat(valor) || 0).toFixed(2);
}

function formatData(iso) {
  if (!iso) return "-";
  try {
    return format(new Date(iso), "dd/MM/yyyy HH:mm");
  } catch {
    return "-";
  }
}

function calcularResumoPagamentos(vendas) {
  const resumo = {};
  (vendas || []).forEach((v) => {
    (v.pagamentos || []).forEach((p) => {
      const forma = p.forma_pagamento || "outros";
      resumo[forma] = (resumo[forma] || 0) + (p.valor || 0);
    });
  });
  return resumo;
}

function gerarHtmlPagamentos(resumo) {
  if (!resumo || Object.keys(resumo).length === 0) return "";
  return Object.entries(resumo)
    .filter(([k]) => k !== "total")
    .map(
      ([forma, valor]) =>
        `<div class="item"><span>${FORMAS_LABEL[forma] || forma}</span><span>R$ ${fmt(valor)}</span></div>`
    )
    .join("");
}

function gerarHtmlContagem(contagem) {
  if (!contagem) return "";
  let html = "";
  const notas = contagem.notas || {};
  const moedas = contagem.moedas || {};

  NOTAS_LABELS.forEach(({ chave, label }) => {
    const qtd = notas[chave] || 0;
    if (qtd > 0) {
      const sub = qtd * parseInt(chave);
      html += `<div class="item"><span>${label} x ${qtd}</span><span>R$ ${fmt(sub)}</span></div>`;
    }
  });

  MOEDAS_LABELS.forEach(({ chave, label, valor }) => {
    const qtd = moedas[chave] || 0;
    if (qtd > 0) {
      const sub = Math.round(qtd * valor * 100) / 100;
      html += `<div class="item"><span>${label} x ${qtd}</span><span>R$ ${fmt(sub)}</span></div>`;
    }
  });

  return html;
}

// ========== RECIBO 80mm ==========

export function imprimirFechamento80mm(caixa, vendas, movimentacoes, empresa, numeroCaixaDisplay) {
  if (!caixa) return;
  const numCaixa = numeroCaixaDisplay ?? caixa.numero_caixa ?? "-";

  const resumo = caixa.resumo_pagamentos || calcularResumoPagamentos(vendas);
  const sangrias = (movimentacoes || []).filter((m) => m.tipo === "sangria");
  const suprimentos = (movimentacoes || []).filter((m) => m.tipo === "suprimento");

  const conteudo = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Fechamento Caixa #${numCaixa}</title>
<style>
@media print {
  @page { margin: 0; size: 80mm auto; }
  body { margin: 0; padding: 0; }
}
body {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  width: 80mm;
  margin: 0 auto;
  padding: 5mm;
  line-height: 1.4;
}
.center { text-align: center; }
.bold { font-weight: bold; }
.divider { border-top: 1px dashed #000; margin: 6px 0; }
.item { display: flex; justify-content: space-between; margin: 2px 0; }
.titulo { font-size: 13px; font-weight: bold; text-align: center; margin: 4px 0; }
.secao { font-weight: bold; font-size: 10px; text-transform: uppercase; color: #555; margin-top: 6px; margin-bottom: 2px; }
.total-box { border: 1px solid #000; padding: 4px 6px; margin: 6px 0; }
.assinatura {
  margin-top: 25px;
  padding-top: 4px;
  border-top: 1px solid #000;
  width: 65%;
  margin-left: auto;
  margin-right: auto;
  text-align: center;
  font-size: 9px;
}
</style>
</head>
<body>
<div class="center bold">
  ${empresa?.nome || "Smart Express"}<br>
  ${empresa?.cnpj ? "CNPJ: " + empresa.cnpj + "<br>" : ""}
</div>

<div class="divider"></div>
<div class="titulo">FECHAMENTO DE CAIXA</div>
<div class="divider"></div>

<div class="item"><span>Caixa Nº:</span><span class="bold">${numCaixa}</span></div>
<div class="item"><span>Abertura:</span><span>${formatData(caixa.data_abertura)}</span></div>
<div class="item"><span>Fechamento:</span><span>${formatData(caixa.data_fechamento)}</span></div>
<div class="item"><span>Operador:</span><span>${caixa.usuario_abertura || "-"}</span></div>
${caixa.usuario_fechamento && caixa.usuario_fechamento !== caixa.usuario_abertura ? `<div class="item"><span>Fechado por:</span><span>${caixa.usuario_fechamento}</span></div>` : ""}

<div class="divider"></div>
<div class="secao">Resumo Financeiro</div>

<div class="item"><span>Valor Inicial:</span><span>R$ ${fmt(caixa.valor_inicial)}</span></div>
<div class="item"><span>(+) Vendas:</span><span>R$ ${fmt(caixa.total_vendas)}</span></div>
${parseFloat(caixa.total_suprimentos) > 0 ? `<div class="item"><span>(+) Suprimentos:</span><span>R$ ${fmt(caixa.total_suprimentos)}</span></div>` : ""}
${parseFloat(caixa.total_sangrias) > 0 ? `<div class="item"><span>(-) Sangrias:</span><span>R$ ${fmt(caixa.total_sangrias)}</span></div>` : ""}

<div class="divider"></div>
<div class="total-box">
  <div class="item"><span class="bold">Valor Esperado:</span><span class="bold">R$ ${fmt(caixa.valor_fechamento)}</span></div>
  <div class="item"><span class="bold">Valor Contado:</span><span class="bold">R$ ${fmt(caixa.valor_contado)}</span></div>
  <div class="item"><span class="bold">Diferença:</span><span class="bold" style="color:${parseFloat(caixa.diferenca) === 0 ? "#000" : parseFloat(caixa.diferenca) > 0 ? "#16a34a" : "#dc2626"}">R$ ${fmt(caixa.diferenca)}</span></div>
</div>

<div class="secao">Por Forma de Pagamento</div>
${gerarHtmlPagamentos(resumo)}

${caixa.contagem_notas ? `
<div class="divider"></div>
<div class="secao">Contagem de Notas/Moedas</div>
${gerarHtmlContagem(caixa.contagem_notas)}
<div class="item bold"><span>Total Espécie:</span><span>R$ ${fmt(caixa.contagem_notas.total)}</span></div>
` : ""}

${sangrias.length > 0 ? `
<div class="divider"></div>
<div class="secao">Sangrias (${sangrias.length})</div>
${sangrias.map((s) => `<div class="item"><span>${formatData(s.data_hora || s.created_date)}</span><span style="color:#dc2626">- R$ ${fmt(s.valor)}</span></div>`).join("")}
` : ""}

${suprimentos.length > 0 ? `
<div class="divider"></div>
<div class="secao">Suprimentos (${suprimentos.length})</div>
${suprimentos.map((s) => `<div class="item"><span>${formatData(s.data_hora || s.created_date)}</span><span style="color:#16a34a">+ R$ ${fmt(s.valor)}</span></div>`).join("")}
` : ""}

${caixa.observacoes_fechamento ? `
<div class="divider"></div>
<div class="secao">Observações</div>
<div style="font-size:10px;">${caixa.observacoes_fechamento}</div>
` : ""}

<div class="divider"></div>
<div class="center" style="font-size:9px;color:#666;margin-top:4px;">
  Total de vendas: ${(vendas || []).length}<br>
  Documento de controle interno<br>
  Impresso em ${format(new Date(), "dd/MM/yyyy HH:mm:ss")}
</div>

<div class="assinatura">Assinatura do Operador</div>
<div class="assinatura">Assinatura do Responsável</div>
</body>
</html>`;

  const janela = window.open("", "_blank");
  janela.document.write(conteudo);
  janela.document.close();
  janela.print();
}

// ========== RELATÓRIO A4 ==========

export function imprimirFechamentoA4(caixa, vendas, movimentacoes, empresa, numeroCaixaDisplay) {
  if (!caixa) return;
  const numCaixa = numeroCaixaDisplay ?? caixa.numero_caixa ?? "-";

  const resumo = caixa.resumo_pagamentos || calcularResumoPagamentos(vendas);
  const sangrias = (movimentacoes || []).filter((m) => m.tipo === "sangria");
  const suprimentos = (movimentacoes || []).filter((m) => m.tipo === "suprimento");
  const vendasList = (vendas || []).sort((a, b) =>
    new Date(a.data_venda || a.created_date) - new Date(b.data_venda || b.created_date)
  );

  const pagamentosRows = Object.entries(resumo)
    .filter(([k]) => k !== "total")
    .map(
      ([forma, valor]) =>
        `<tr><td>${FORMAS_LABEL[forma] || forma}</td><td style="text-align:right">R$ ${fmt(valor)}</td></tr>`
    )
    .join("");

  const totalPagamentos = Object.entries(resumo)
    .filter(([k]) => k !== "total")
    .reduce((s, [, v]) => s + (parseFloat(v) || 0), 0);

  const vendasRows = vendasList
    .map((v) => {
      const pagamentos = (v.pagamentos || []);
      const formasDetalhada = pagamentos
        .map((p) => `${FORMAS_LABEL[p.forma_pagamento] || p.forma_pagamento}: R$ ${fmt(p.valor)}`)
        .join("<br>");
      const qtdItens = (v.itens || []).reduce((s, i) => s + (i.quantidade || 1), 0);
      return `<tr>
        <td>${formatData(v.data_venda || v.created_date)}</td>
        <td>${v.codigo_venda || v.numero || "-"}</td>
        <td>${v.cliente_nome || "-"}</td>
        <td style="text-align:center">${qtdItens}</td>
        <td style="text-align:right">R$ ${fmt(v.valor_total)}</td>
        <td>${formasDetalhada}</td>
      </tr>`;
    })
    .join("");

  const movsRows = [...sangrias, ...suprimentos]
    .sort((a, b) =>
      new Date(a.data_hora || a.created_date) - new Date(b.data_hora || b.created_date)
    )
    .map(
      (m) =>
        `<tr>
        <td>${formatData(m.data_hora || m.created_date)}</td>
        <td style="color:${m.tipo === "sangria" ? "#dc2626" : "#16a34a"};font-weight:bold">${m.tipo === "sangria" ? "Sangria" : "Suprimento"}</td>
        <td style="text-align:right">R$ ${fmt(m.valor)}</td>
        <td>${m.descricao || "-"}</td>
        <td>${m.usuario_nome || m.usuario || "-"}</td>
      </tr>`
    )
    .join("");

  let contagemHtml = "";
  if (caixa.contagem_notas) {
    const notas = caixa.contagem_notas.notas || {};
    const moedas = caixa.contagem_notas.moedas || {};
    let rows = "";
    NOTAS_LABELS.forEach(({ chave, label }) => {
      const qtd = notas[chave] || 0;
      if (qtd > 0) {
        rows += `<tr><td>${label}</td><td style="text-align:center">${qtd}</td><td style="text-align:right">R$ ${fmt(qtd * parseInt(chave))}</td></tr>`;
      }
    });
    MOEDAS_LABELS.forEach(({ chave, label, valor }) => {
      const qtd = moedas[chave] || 0;
      if (qtd > 0) {
        rows += `<tr><td>${label}</td><td style="text-align:center">${qtd}</td><td style="text-align:right">R$ ${fmt(Math.round(qtd * valor * 100) / 100)}</td></tr>`;
      }
    });
    if (rows) {
      contagemHtml = `
      <h3>Contagem de Cédulas e Moedas</h3>
      <table>
        <thead><tr><th>Denominação</th><th style="text-align:center">Qtd</th><th style="text-align:right">Subtotal</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><th colspan="2">Total em Espécie</th><th style="text-align:right">R$ ${fmt(caixa.contagem_notas.total)}</th></tr></tfoot>
      </table>`;
    }
  }

  const conteudo = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Relatório de Fechamento - Caixa #${numCaixa}</title>
<style>
@media print {
  @page { size: A4; margin: 15mm; }
  body { margin: 0; }
  .no-print { display: none !important; }
}
body {
  font-family: 'Segoe UI', Arial, sans-serif;
  font-size: 12px;
  color: #1a1a1a;
  max-width: 210mm;
  margin: 0 auto;
  padding: 15mm;
  line-height: 1.5;
}
h1 { font-size: 18px; text-align: center; margin: 0 0 5px 0; }
h2 { font-size: 14px; color: #333; border-bottom: 2px solid #333; padding-bottom: 3px; margin: 20px 0 10px 0; }
h3 { font-size: 12px; color: #555; margin: 15px 0 8px 0; }
.header { text-align: center; margin-bottom: 15px; }
.header .empresa { font-size: 16px; font-weight: bold; }
.header .sub { font-size: 11px; color: #666; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; margin: 10px 0; font-size: 12px; }
.info-grid .label { color: #666; }
.info-grid .valor { font-weight: bold; }
.resumo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 10px 0; }
.resumo-card { border: 1px solid #ddd; border-radius: 4px; padding: 8px; text-align: center; }
.resumo-card .num { font-size: 16px; font-weight: bold; }
.resumo-card .lbl { font-size: 10px; color: #666; text-transform: uppercase; }
.diferenca-positiva { color: #16a34a; }
.diferenca-negativa { color: #dc2626; }
.diferenca-zero { color: #333; }
table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 11px; }
th, td { padding: 5px 8px; border: 1px solid #ddd; text-align: left; }
th { background: #f5f5f5; font-weight: bold; font-size: 10px; text-transform: uppercase; }
tfoot th, tfoot td { background: #eee; font-weight: bold; }
.obs-box { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 4px; padding: 8px; margin: 10px 0; font-size: 11px; }
.assinatura-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-top: 40px; text-align: center; }
.assinatura-linha { border-top: 1px solid #000; padding-top: 4px; font-size: 10px; color: #555; }
.rodape { text-align: center; font-size: 9px; color: #999; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 6px; }
</style>
</head>
<body>

<div class="header">
  <div class="empresa">${empresa?.nome || "Smart Express"}</div>
  ${empresa?.cnpj ? `<div class="sub">CNPJ: ${empresa.cnpj}</div>` : ""}
  ${empresa?.endereco ? `<div class="sub">${empresa.endereco}</div>` : ""}
  ${empresa?.telefone ? `<div class="sub">Tel: ${empresa.telefone}</div>` : ""}
</div>

<h1>RELATÓRIO DE FECHAMENTO DE CAIXA</h1>

<div class="info-grid">
  <div><span class="label">Caixa Nº:</span> <span class="valor">${numCaixa}</span></div>
  <div><span class="label">Status:</span> <span class="valor">${caixa.status === "aberto" ? "ABERTO" : "FECHADO"}</span></div>
  <div><span class="label">Abertura:</span> <span class="valor">${formatData(caixa.data_abertura)}</span></div>
  <div><span class="label">Fechamento:</span> <span class="valor">${formatData(caixa.data_fechamento)}</span></div>
  <div><span class="label">Operador Abertura:</span> <span class="valor">${caixa.usuario_abertura || "-"}</span></div>
  <div><span class="label">Operador Fechamento:</span> <span class="valor">${caixa.usuario_fechamento || "-"}</span></div>
</div>

<h2>Resumo Financeiro</h2>
<div class="resumo-grid">
  <div class="resumo-card"><div class="lbl">Valor Inicial</div><div class="num">R$ ${fmt(caixa.valor_inicial)}</div></div>
  <div class="resumo-card"><div class="lbl">Total Vendas</div><div class="num">R$ ${fmt(caixa.total_vendas)}</div></div>
  <div class="resumo-card"><div class="lbl">Suprimentos</div><div class="num" style="color:#16a34a">R$ ${fmt(caixa.total_suprimentos)}</div></div>
  <div class="resumo-card"><div class="lbl">Sangrias</div><div class="num" style="color:#dc2626">R$ ${fmt(caixa.total_sangrias)}</div></div>
  <div class="resumo-card"><div class="lbl">Valor Esperado</div><div class="num">R$ ${fmt(caixa.valor_fechamento)}</div></div>
  <div class="resumo-card"><div class="lbl">Valor Contado</div><div class="num">R$ ${fmt(caixa.valor_contado)}</div></div>
</div>
<div class="resumo-card" style="text-align:center;margin:8px auto;max-width:250px;">
  <div class="lbl">Diferença</div>
  <div class="num ${parseFloat(caixa.diferenca) === 0 ? "diferenca-zero" : parseFloat(caixa.diferenca) > 0 ? "diferenca-positiva" : "diferenca-negativa"}">
    R$ ${fmt(caixa.diferenca)}
  </div>
</div>

<h2>Pagamentos por Forma</h2>
<table>
  <thead><tr><th>Forma de Pagamento</th><th style="text-align:right">Valor</th></tr></thead>
  <tbody>${pagamentosRows || '<tr><td colspan="2" style="text-align:center;color:#999;">Sem dados</td></tr>'}</tbody>
  <tfoot><tr><th>Total</th><th style="text-align:right">R$ ${fmt(totalPagamentos)}</th></tr></tfoot>
</table>

${contagemHtml}

<h2>Vendas Realizadas (${vendasList.length})</h2>
<table>
  <thead><tr><th>Hora</th><th>Código</th><th>Cliente</th><th style="text-align:center">Itens</th><th style="text-align:right">Total</th><th>Pagamento</th></tr></thead>
  <tbody>${vendasRows || '<tr><td colspan="6" style="text-align:center;color:#999;">Nenhuma venda</td></tr>'}</tbody>
  <tfoot><tr><th colspan="4">Total</th><th style="text-align:right">R$ ${fmt(caixa.total_vendas)}</th><th></th></tr></tfoot>
</table>

${movsRows ? `
<h2>Movimentações (Sangrias/Suprimentos)</h2>
<table>
  <thead><tr><th>Hora</th><th>Tipo</th><th style="text-align:right">Valor</th><th>Descrição</th><th>Usuário</th></tr></thead>
  <tbody>${movsRows}</tbody>
</table>
` : ""}

${caixa.observacoes_fechamento ? `
<h2>Observações</h2>
<div class="obs-box">${caixa.observacoes_fechamento}</div>
${caixa.aprovacao_diferenca ? `<div style="font-size:11px;margin-top:4px;"><strong>Aprovado por:</strong> ${caixa.aprovacao_diferenca}</div>` : ""}
` : ""}

<div class="assinatura-grid">
  <div><div class="assinatura-linha">Operador</div></div>
  <div><div class="assinatura-linha">Responsável</div></div>
  <div><div class="assinatura-linha">Gerente</div></div>
</div>

<div class="rodape">
  Relatório gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss")}<br>
  Documento de controle interno - Sem valor fiscal
</div>

</body>
</html>`;

  const janela = window.open("", "_blank");
  janela.document.write(conteudo);
  janela.document.close();
  janela.print();
}
