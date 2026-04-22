import { format } from "date-fns";
import { toast } from "sonner";

/**
 * Imprime o cupom não fiscal de uma venda.
 * @param {Object} venda - Objeto da venda com itens, pagamentos, valor_total, etc.
 */
export function imprimirCupomVenda(venda) {
  if (!venda) {
    toast.error("Nenhuma venda para imprimir.");
    return;
  }

  const config = JSON.parse(localStorage.getItem('configuracoes_erp') || '{}');
  const empresa = config.empresa || {};
  const impressao = config.impressao || {};

  const itensHtml = (venda.itens || []).map((item, idx) => {
    const nome = item.produto_nome || 'Produto';
    const qtd = item.quantidade || 1;
    const unit = (parseFloat(item.preco_unitario) || 0).toFixed(2);
    const sub = (parseFloat(item.subtotal) || 0).toFixed(2);
    return `
      <tr>
        <td colspan="4" style="padding:2px 0 0 0;font-size:11px;font-weight:bold;">${String(idx + 1).padStart(3, '0')} ${nome}</td>
      </tr>
      <tr>
        <td style="padding:0 0 2px 18px;font-size:10px;color:#000;font-weight:bold;">${qtd} x ${unit}</td>
        <td></td>
        <td></td>
        <td style="text-align:right;padding:0 0 2px 0;font-size:11px;font-weight:bold;">${sub}</td>
      </tr>`;
  }).join('');

  const pagamentosHtml = (venda.pagamentos || []).map(pag => {
    let nomeForma = (pag.forma_pagamento || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    if (pag.forma_pagamento === 'credito_parcelado' && pag.parcelas > 1) {
      nomeForma += ` (${pag.parcelas}x)`;
    }
    const valor = (parseFloat(pag.valor) || 0).toFixed(2);
    return `<tr><td colspan="3" style="padding:1px 0;font-weight:bold;">${nomeForma}</td><td style="text-align:right;padding:1px 0;font-weight:bold;">${valor}</td></tr>`;
  }).join('');

  const subtotal = (parseFloat(venda.subtotal) || 0).toFixed(2);
  const desconto = (parseFloat(venda.desconto_total) || 0).toFixed(2);
  const total = (parseFloat(venda.valor_total) || 0).toFixed(2);
  const troco = (parseFloat(venda.troco) || 0).toFixed(2);
  const qtdItens = (venda.itens || []).reduce((s, i) => s + (i.quantidade || 1), 0);

  const dataVenda = venda.data_venda || venda.created_date || new Date().toISOString();

  const cupom = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Cupom ${venda.codigo_venda || ''}</title>
<style>
@media print {
  @page { margin: 0; size: 80mm auto; }
  body { margin: 0; padding: 0; }
  .no-print { display: none !important; }
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Courier New', 'Lucida Console', monospace;
  font-size: 11px;
  width: 80mm;
  margin: 0 auto;
  padding: 3mm 4mm;
  color: #000;
  line-height: 1.3;
  font-weight: bold;
  -webkit-print-color-adjust: exact;
}
.header { text-align: center; padding-bottom: 4px; }
.header .logo { max-width: 45mm; max-height: 15mm; margin: 0 auto 4px; display: block; object-fit: contain; filter: grayscale(100%) contrast(200%); }
.header .empresa-nome { font-size: 14px; font-weight: 900; letter-spacing: 1px; margin-bottom: 2px; }
.header .empresa-info { font-size: 9px; color: #000; line-height: 1.4; font-weight: bold; }
.sep { border: none; border-top: 1px dashed #000; margin: 4px 0; }
.sep-double { border: none; border-top: 2px solid #000; margin: 5px 0; }
.titulo { text-align: center; font-size: 12px; font-weight: 900; letter-spacing: 2px; padding: 2px 0; }
.info-venda { font-size: 10px; font-weight: bold; }
.info-venda td { padding: 1px 0; }
.info-venda .label { color: #000; font-weight: bold; }
table { width: 100%; border-collapse: collapse; }
.col-header { font-size: 9px; font-weight: 900; border-bottom: 1px solid #000; padding: 2px 0; text-transform: uppercase; letter-spacing: 0.5px; }
.col-header td:last-child { text-align: right; }
.totais td { padding: 2px 0; font-size: 11px; font-weight: bold; }
.totais .valor { text-align: right; font-weight: 900; }
.total-geral td { font-size: 15px; font-weight: 900; padding: 4px 0; border-top: 1px solid #000; border-bottom: 1px solid #000; }
.pagamento td { padding: 1px 0; font-size: 10px; font-weight: bold; }
.rodape { text-align: center; font-size: 9px; color: #000; padding-top: 3px; line-height: 1.5; font-weight: bold; }
.rodape .agradecimento { font-size: 11px; font-weight: 900; color: #000; margin: 4px 0 2px; }
.rodape .msg-custom { font-size: 9px; margin: 2px 0; font-style: italic; font-weight: bold; }
.reimpressao { text-align: center; font-size: 10px; font-weight: 900; color: #000; padding: 3px 0; border: 1px dashed #000; margin-bottom: 4px; }
</style>
</head>
<body>

${venda._reimpressao ? '<div class="reimpressao">*** REIMPRESSAO ***</div>' : ''}

<!-- CABECALHO -->
<div class="header">
  ${impressao.logo_no_cupom && empresa.logo_url ? `<img src="${empresa.logo_url}" class="logo" />` : ''}
  <div class="empresa-nome">${empresa.nome || 'SMART EXPRESS'}</div>
  <div class="empresa-info">
    ${empresa.cnpj ? `CNPJ: ${empresa.cnpj}<br>` : ''}
    ${empresa.endereco ? `${empresa.endereco}<br>` : ''}
    ${empresa.telefone ? `Tel: ${empresa.telefone}` : ''}${empresa.telefone && empresa.email ? ' | ' : ''}${empresa.email ? empresa.email : ''}
  </div>
</div>

<hr class="sep-double">

<!-- TITULO -->
<div class="titulo">CUPOM</div>

<hr class="sep">

<!-- INFO DA VENDA -->
<table class="info-venda">
  <tr><td class="label">Venda:</td><td style="text-align:right;font-weight:bold;">${venda.codigo_venda || ''}</td></tr>
  <tr><td class="label">Data:</td><td style="text-align:right;">${format(new Date(dataVenda), 'dd/MM/yyyy HH:mm:ss')}</td></tr>
  <tr><td class="label">Vendedor:</td><td style="text-align:right;">${venda.vendedor_nome || '-'}</td></tr>
  ${venda.cliente_nome && venda.cliente_nome !== 'Cliente não identificado' ? `<tr><td class="label">Cliente:</td><td style="text-align:right;">${venda.cliente_nome}</td></tr>` : ''}
</table>

<hr class="sep">

<!-- CABECALHO ITENS -->
<table>
  <tr class="col-header">
    <td>Item</td>
    <td></td>
    <td></td>
    <td style="text-align:right;">Valor R$</td>
  </tr>
</table>

<!-- ITENS -->
<table>${itensHtml}</table>

<hr class="sep">

<!-- TOTAIS -->
<table class="totais">
  <tr>
    <td class="label">Subtotal (${qtdItens} ${qtdItens === 1 ? 'item' : 'itens'}):</td>
    <td class="valor">${subtotal}</td>
  </tr>
  ${parseFloat(desconto) > 0 ? `
  <tr>
    <td class="label">Desconto:</td>
    <td class="valor" style="color:#000;">- ${desconto}</td>
  </tr>` : ''}
</table>

<!-- TOTAL GERAL -->
<table>
  <tr class="total-geral">
    <td>TOTAL R$</td>
    <td style="text-align:right;">${total}</td>
  </tr>
</table>

<hr class="sep">

<!-- PAGAMENTO -->
<table>
  <tr><td colspan="4" style="font-weight:bold;font-size:10px;padding:2px 0;">FORMA DE PAGAMENTO:</td></tr>
</table>
<table class="pagamento">
  ${pagamentosHtml}
  ${parseFloat(troco) > 0 ? `
  <tr style="border-top:1px dashed #ccc;">
    <td colspan="3" style="font-weight:bold;padding-top:2px;">Troco:</td>
    <td style="text-align:right;font-weight:bold;padding-top:2px;">${troco}</td>
  </tr>` : ''}
</table>

<hr class="sep-double">

<!-- RODAPE -->
<div class="rodape">
  ${impressao.rodape_cupom ? `<div class="msg-custom">${impressao.rodape_cupom.replace(/\\n/g, '<br>')}</div>` : ''}
  
  <div style="margin-top:8px;text-align:justify;font-size:8px;color:#000;line-height:1.2;border-top:1px dashed #000;padding-top:4px;font-weight:bold;">
    <strong>TERMO DE GARANTIA:</strong> Produtos eletrônicos possuem garantia legal mínima de 90 dias contra defeitos de fabricação. 
    A garantia ou troca não será aceita em caso de produtos com sinais de mau uso, avarias físicas, sem a apresentação deste cupom original e sem a embalagem completa contendo todos os itens e acessórios de fábrica intactos.
  </div>

  <div style="margin-top:6px;font-size:8px;color:#000;text-align:center;font-weight:bold;">
    ${venda.codigo_venda || ''} | ${format(new Date(dataVenda), 'dd/MM/yy HH:mm')}
  </div>
</div>

</body>
</html>`;

  const janela = window.open('', '_blank');
  if (janela) {
    janela.document.write(cupom);
    janela.document.close();

    // Garantir que imagens carreguem antes de imprimir
    const hasLogo = impressao.logo_no_cupom && empresa.logo_url;
    if (hasLogo) {
      janela.document.querySelector('.logo').onload = () => {
        setTimeout(() => { janela.print(); }, 100);
      };
      // Fallback em caso de erro no carregamento
      janela.document.querySelector('.logo').onerror = () => {
        setTimeout(() => { janela.print(); }, 100);
      };
    } else {
      setTimeout(() => { janela.print(); }, 100);
    }
  } else {
    toast.error("Popup bloqueado! Permita popups para imprimir.");
  }
}
