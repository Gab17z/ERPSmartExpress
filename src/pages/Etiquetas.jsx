import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, Tag, Search, Upload, Save, Monitor, FolderOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import DisplaySeminovoTemplate from "@/components/etiquetas/DisplaySeminovoTemplate";
import { useConfirm } from '@/contexts/ConfirmContext';

// CORREÇÃO DE SEGURANÇA: Função para sanitizar strings antes de inserir em HTML
// Previne ataques XSS escapando caracteres especiais HTML
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const str = String(text);
  const htmlEntities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  return str.replace(/[&<>"'/]/g, char => htmlEntities[char]);
}

// CORREÇÃO: Função que escapa HTML mas permite tags de formatação seguras (<b>, <i>, <u>, <s>)
function escapeHtmlAllowFormatting(text) {
  if (text === null || text === undefined) return '';
  const str = String(text);

  // Primeiro, escapa todo o HTML
  const escaped = escapeHtml(str);

  // Depois, restaura apenas as tags de formatação seguras
  return escaped
    .replace(/&lt;b&gt;/g, '<b>')
    .replace(/&lt;\/b&gt;/g, '</b>')
    .replace(/&lt;i&gt;/g, '<i>')
    .replace(/&lt;\/i&gt;/g, '</i>')
    .replace(/&lt;u&gt;/g, '<u>')
    .replace(/&lt;\/u&gt;/g, '</u>')
    .replace(/&lt;s&gt;/g, '<s>')
    .replace(/&lt;\/s&gt;/g, '</s>');
}

// CORREÇÃO DE SEGURANÇA: Sanitizar código de barras para uso em URLs
function sanitizeBarcode(barcode) {
  if (!barcode) return '';
  // Apenas caracteres alfanuméricos são permitidos
  return String(barcode).replace(/[^a-zA-Z0-9-]/g, '');
}

export default function Etiquetas() {
  const confirm = useConfirm();
  const [tipoEtiqueta, setTipoEtiqueta] = useState("preco");
  const [tamanho, setTamanho] = useState("40x25_2col");
  const [config, setConfig] = useState({
    texto: "",
    preco: "",
    codigo: "",
    codigoBarras: "",
    logo: false,
    logoMaxW: 60,   // % do tamanho da etiqueta
    logoMaxH: 30,   // % da altura da etiqueta
    incluirCodigoBarras: false,
    saudeBateria: "",
    quantidade: 1
  });

  // Display Seminovo State
  const [buscaProduto, setBuscaProduto] = useState("");
  const [dialogProdutos, setDialogProdutos] = useState(false);
  const [dialogDisplaysSalvos, setDialogDisplaysSalvos] = useState(false);
  const [salvandoDisplay, setSalvandoDisplay] = useState(false);
  const [displayData, setDisplayData] = useState({
    logoUrl: "",
    nomeProduto: "",
    descricao: "",
    precoPix: "",
    precoDebito: "",
    precoPrazo1: "",
    precoPrazo2: "",
    precoPrazo3: "",
    garantia: "",
    itensInclusos: "",
    saudeBateria: "",
    capacidade: "",
    qrcodeUrl: "",
    exibirSeminovo: true
  });

  // Configurações de formatação da descrição
  const [formatacaoDescricao, setFormatacaoDescricao] = useState({
    fontSize: 2.3,
    lineHeight: 1.15,
    paragraphSpacing: 1.5,
    fontWeight: "normal",
    fontFamily: "Calibri"
  });

  const queryClient = useQueryClient();

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos-etiquetas'],
    queryFn: () => base44.entities.Produto.list('nome'),
  });

  const { data: displaysSalvos = [], refetch: refetchDisplays } = useQuery({
    queryKey: ['displays-salvos'],
    queryFn: () => base44.entities.DisplaySeminovo.list('-created_date'),
  });

  const produtosFiltrados = produtos.filter(p =>
    p.nome?.toLowerCase().includes(buscaProduto.toLowerCase()) ||
    p.sku?.toLowerCase().includes(buscaProduto.toLowerCase())
  );

  const selecionarProduto = (produto) => {
    setDisplayData({
      ...displayData,
      nomeProduto: produto.nome || "",
      descricao: produto.descricao || "",
      precoPix: produto.preco_venda?.toFixed(2).replace('.', ',') || "",
      precoDebito: produto.preco_venda ? (produto.preco_venda * 1.02).toFixed(2).replace('.', ',') : "",
      capacidade: produto.atributos?.capacidade || "",
      saudeBateria: produto.atributos?.saude_bateria || ""
    });
    setDialogProdutos(false);
    setBuscaProduto("");
    toast.success(`Produto "${produto.nome}" carregado!`);
  };

  // Função para limitar descrição (55 chars por linha, máx 17 linhas)
  const limitarDescricao = (texto) => {
    if (!texto) return "";
    const maxCharsPerLine = 55;
    const maxLines = 17;
    const maxTotal = maxCharsPerLine * maxLines;
    return texto.slice(0, maxTotal);
  };

  // Carregar logo da empresa do localStorage
  const getLogoEmpresa = () => {
    try {
      const config = localStorage.getItem('configuracoes_erp');
      if (config) {
        const parsed = JSON.parse(config);
        return parsed.empresa?.logo_url || null;
      }
    } catch (e) {
      console.error("Erro ao carregar config:", e);
    }
    return null;
  };

  const usarLogoEmpresa = () => {
    const logoEmpresa = getLogoEmpresa();
    if (logoEmpresa) {
      setDisplayData(prev => ({ ...prev, logoUrl: logoEmpresa }));
      toast.success("Logo da empresa carregada!");
    } else {
      toast.error("Nenhuma logo cadastrada em Configurações → Empresa");
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // CORREÇÃO: Validar tamanho do arquivo (máx 5MB)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      toast.error("Arquivo muito grande! Máximo 5MB.");
      return;
    }

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error("Apenas imagens são permitidas!");
      return;
    }

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setDisplayData({ ...displayData, logoUrl: file_url });
      toast.success("Logo carregada!");
    } catch (error) {
      toast.error("Erro ao fazer upload da logo");
    }
  };

  const salvarDisplay = async () => {
    if (!displayData.nomeProduto) {
      toast.error("Preencha o nome do produto!");
      return;
    }

    setSalvandoDisplay(true);
    try {
      // Converter camelCase para snake_case para o banco
      await base44.entities.DisplaySeminovo.create({
        nome: `Display - ${displayData.nomeProduto}`,
        logo_url: displayData.logoUrl,
        nome_produto: displayData.nomeProduto,
        descricao: displayData.descricao,
        preco_pix: displayData.precoPix,
        preco_debito: displayData.precoDebito,
        preco_prazo1: displayData.precoPrazo1,
        preco_prazo2: displayData.precoPrazo2,
        preco_prazo3: displayData.precoPrazo3,
        garantia: displayData.garantia,
        itens_inclusos: displayData.itensInclusos,
        saude_bateria: displayData.saudeBateria,
        capacidade: displayData.capacidade,
        qrcode_url: displayData.qrcodeUrl,
        exibir_seminovo: displayData.exibirSeminovo
      });
      toast.success("Display salvo!");
      refetchDisplays();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar display");
    } finally {
      setSalvandoDisplay(false);
    }
  };

  const carregarDisplay = (display) => {
    // Converter snake_case do banco para camelCase
    setDisplayData({
      logoUrl: display.logo_url || "",
      nomeProduto: display.nome_produto || "",
      descricao: display.descricao || "",
      precoPix: display.preco_pix || "",
      precoDebito: display.preco_debito || "",
      precoPrazo1: display.preco_prazo1 || "",
      precoPrazo2: display.preco_prazo2 || "",
      precoPrazo3: display.preco_prazo3 || "",
      garantia: display.garantia || "",
      itensInclusos: display.itens_inclusos || "",
      saudeBateria: display.saude_bateria || "",
      capacidade: display.capacidade || "",
      qrcodeUrl: display.qrcode_url || "",
      exibirSeminovo: display.exibir_seminovo !== false
    });
    setDialogDisplaysSalvos(false);
    toast.success(`Display "${display.nome_produto}" carregado!`);
  };

  const excluirDisplay = async (id) => {
    const resposta = await confirm({
      title: "Excluir Display",
      description: "Tem certeza que deseja excluir este display salvo?",
      confirmText: "Sim, Excluir",
      cancelText: "Cancelar",
      type: "confirm"
    });

    if (!resposta) return;

    try {
      await base44.entities.DisplaySeminovo.delete(id);
      toast.success("Display excluído!");
      refetchDisplays();
    } catch (error) {
      toast.error("Erro ao excluir");
    }
  };

  const imprimirDisplay = () => {
    // CORREÇÃO XSS: Sanitizar todos os dados do display antes de inserir em HTML
    // Descrição usa escapeHtmlAllowFormatting para permitir tags <b>, <i>, <u>, <s>
    const dadosSanitizados = {
      nomeProduto: escapeHtml(displayData.nomeProduto),
      descricao: escapeHtmlAllowFormatting(displayData.descricao),
      precoPix: escapeHtml(displayData.precoPix),
      precoDebito: escapeHtml(displayData.precoDebito),
      precoPrazo1: escapeHtml(displayData.precoPrazo1),
      precoPrazo2: escapeHtml(displayData.precoPrazo2),
      precoPrazo3: escapeHtml(displayData.precoPrazo3),
      garantia: escapeHtml(displayData.garantia),
      itensInclusos: escapeHtml(displayData.itensInclusos),
      saudeBateria: escapeHtml(displayData.saudeBateria),
      capacidade: escapeHtml(displayData.capacidade),
      qrcodeUrl: displayData.qrcodeUrl, // URL será encoded com encodeURIComponent
      logoUrl: displayData.logoUrl, // URL da logo (já sanitizada no upload)
      exibirSeminovo: displayData.exibirSeminovo
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @media print {
            @page { size: 100mm 150mm; margin: 0; }
            body { margin: 0; }
          }
          * { box-sizing: border-box; }
          body { 
              margin: 0; 
              padding: 0; 
              font-family: ${formatacaoDescricao.fontFamily};
              font-kerning: none !important;
              font-feature-settings: "kern" 0, "liga" 0;
              -webkit-font-kerning: none;
              text-rendering: optimizeSpeed;
            }
          .template {
                        width: 100mm;
                        height: 150mm;
                        background: #fff;
                        border: 2px solid #000;
                        border-radius: 4px;
                        padding: 2mm 3mm 3mm 3mm;
                        display: flex;
                        flex-direction: column;
                      }
                      .logo-area {
                        text-align: center;
                        height: 22mm;
                        display: flex;
                        align-items: flex-start;
                        justify-content: center;
                        margin-bottom: 2mm;
                      }
                      .logo-area img { max-height: 22mm; max-width: 105mm; object-fit: contain; }
                      .nome-produto {
                        text-align: center;
                        font-size: 6.5mm;
                        font-weight: bold;
                        margin-bottom: 0.5mm;
                        margin-top: 0mm;
                      }
                      .seminovo {
                        text-align: center;
                        font-size: 2.8mm;
                        color: #555;
                        margin-bottom: 0.5mm;
                        letter-spacing: 0.5mm;
                      }
          .descricao-box {
            border: 2px solid #000;
            border-radius: 3mm;
            padding: 1.5mm 2.5mm;
            flex: 1.2;
            margin-bottom: 1.5mm;
            overflow: hidden;
            text-align: left;
          }
          .descricao-box strong { font-size: 2.5mm; font-weight: bold; margin-bottom: 0.5mm; display: block; }
          .descricao-texto {
              margin-top: 1mm;
              white-space: pre-wrap;
            }
            * {
              font-kerning: none !important;
              -webkit-font-kerning: none !important;
              font-feature-settings: "kern" 0 !important;
              text-rendering: optimizeSpeed !important;
            }
          .pagamento-container {
            border: 2px solid #000;
            border-radius: 3mm;
            padding: 1.5mm 2mm;
            margin-bottom: 1.5mm;
          }
          .pagamento-titulo {
            font-size: 2.5mm;
            font-weight: bold;
            margin-bottom: 1mm;
          }
          .pagamento-boxes {
            display: flex;
            gap: 1.5mm;
          }
          .pagamento-box {
            border: 2px solid #000;
            border-radius: 3mm;
            padding: 2mm 1.5mm;
            text-align: center;
            flex: 1;
            min-height: 14mm;
          }
          .pagamento-box .titulo { font-size: 2.2mm; font-weight: bold; margin-bottom: 1.5mm; }
          .pagamento-box .valor { font-size: 4.5mm; font-weight: bold; }
          .pagamento-box .prazo-item { font-size: 2.1mm; line-height: 1.3; text-align: center; }
          .info-container {
            border: 2px solid #000;
            border-radius: 3mm;
            padding: 1mm 2mm;
            display: flex;
            gap: 2mm;
            align-items: center;
          }
          .info-left {
            flex: 1;
            font-size: 2.1mm;
            line-height: 1.4;
          }
          .qr-area {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .qr-box {
            width: 16mm;
            height: 16mm;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 0.5mm;
          }
          .qr-box img { width: 16mm; height: 16mm; }
          .instagram-text { font-size: 1.8mm; text-align: center; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="template">
          <div class="logo-area">
            ${dadosSanitizados.logoUrl ? `<img src="${dadosSanitizados.logoUrl}" />` : ''}
          </div>
          <div class="nome-produto">${dadosSanitizados.nomeProduto || ''}</div>
          ${dadosSanitizados.exibirSeminovo ? '<div class="seminovo">SEMINOVO</div>' : ''}
          <div class="descricao-box">
            <strong>Descrição:</strong>
            ${dadosSanitizados.descricao ? `<div class="descricao-texto" style="font-size: ${formatacaoDescricao.fontSize}mm; line-height: ${formatacaoDescricao.lineHeight}; font-weight: ${formatacaoDescricao.fontWeight}; font-family: ${formatacaoDescricao.fontFamily};">${dadosSanitizados.descricao.split('\n').map(p => {
      return `<p style="margin: 0 0 ${formatacaoDescricao.paragraphSpacing}mm 0;">${p || '&nbsp;'}</p>`;
    }).join('')}</div>` : ''}
          </div>
          <div class="pagamento-container">
            <div class="pagamento-titulo">Formas de Pagamento</div>
            <div class="pagamento-boxes">
              <div class="pagamento-box">
                <div class="titulo">NO PIX:</div>
                <div class="valor">${dadosSanitizados.precoPix ? `R$${dadosSanitizados.precoPix}` : ''}</div>
              </div>
              <div class="pagamento-box">
                <div class="titulo">NO DÉBITO:</div>
                <div class="valor">${dadosSanitizados.precoDebito ? `R$${dadosSanitizados.precoDebito}` : ''}</div>
              </div>
              <div class="pagamento-box">
                <div class="titulo">À PRAZO:</div>
                ${dadosSanitizados.precoPrazo1 ? `<div class="prazo-item">${dadosSanitizados.precoPrazo1}</div>` : ''}
                ${dadosSanitizados.precoPrazo2 ? `<div class="prazo-item">${dadosSanitizados.precoPrazo2}</div>` : ''}
                ${dadosSanitizados.precoPrazo3 ? `<div class="prazo-item">${dadosSanitizados.precoPrazo3}</div>` : ''}
              </div>
            </div>
          </div>
          <div class="info-container">
            <div class="info-left">
              <div><strong>Garantia:</strong> ${dadosSanitizados.garantia || ''}</div>
              <div><strong>Itens incluso:</strong> ${dadosSanitizados.itensInclusos || ''}</div>
              <div><strong>Saúde da Bateria:</strong> ${dadosSanitizados.saudeBateria || ''}</div>
              <div><strong>Capacidade:</strong> ${dadosSanitizados.capacidade || ''}</div>
            </div>
            <div class="qr-area">
              <div class="qr-box">
                ${dadosSanitizados.qrcodeUrl ? `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(dadosSanitizados.qrcodeUrl)}" onerror="this.style.display='none'" />` : '<div style="border:2px solid #000;width:18mm;height:18mm;border-radius:1mm"></div>'}
              </div>
              <div class="instagram-text">Acesse nosso Instagram</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // CORREÇÃO: Tratar popup blocker
    const janela = window.open('', '_blank');
    if (!janela || janela.closed || typeof janela.closed === 'undefined') {
      toast.error("Popup bloqueado! Permita popups para imprimir.");
      return;
    }
    janela.document.write(html);
    janela.document.close();
    janela.onafterprint = () => janela.close();
    // CORREÇÃO: Aguardar imagens antes de imprimir
    setTimeout(() => {
      const images = janela.document.images;
      let loaded = 0;
      const total = images.length;
      let printed = false; // Flag para evitar impressão dupla

      const doPrint = () => {
        if (!printed) {
          printed = true;
          janela.print();
        }
      };

      if (total === 0) {
        doPrint();
        return;
      }

      for (let i = 0; i < total; i++) {
        if (images[i].complete) {
          loaded++;
        } else {
          images[i].onload = () => {
            loaded++;
            if (loaded === total) doPrint();
          };
          images[i].onerror = () => {
            loaded++;
            if (loaded === total) doPrint();
          };
        }
      }

      if (loaded === total) doPrint();

      // Fallback: imprimir após 2 segundos se imagens não carregarem
      setTimeout(() => doPrint(), 2000);
    }, 300);
    toast.success("Imprimindo display!");
  };

  // Carregar config salva do display
  React.useEffect(() => {
    const saved = localStorage.getItem('display_seminovo_config');
    if (saved) {
      try {
        setDisplayData(JSON.parse(saved));
      } catch (e) { }
    }
  }, []);

  const imprimir = () => {
    const tamanhos = {
      "30x20": { width: "30mm", height: "20mm", fontSize: "7px" },
      "40x25": { width: "40mm", height: "25mm", fontSize: "8px" },
      "40x25_2col": { width: "84mm", height: "25mm", fontSize: "8px", colunas: 2, colWidth: "40mm", gap: "2mm", margins: "1mm" }, // Rolo 80mm: 1mm + 40mm + 2mm + 40mm + 1mm = 84mm
      "50x30": { width: "50mm", height: "30mm", fontSize: "10px" },
      "60x40": { width: "60mm", height: "40mm", fontSize: "12px" },
      "70x50": { width: "70mm", height: "50mm", fontSize: "14px" },
      "80x60": { width: "80mm", height: "60mm", fontSize: "16px" },
      "90x70": { width: "90mm", height: "70mm", fontSize: "18px" },
      "100x70": { width: "100mm", height: "70mm", fontSize: "20px" },
      "105x74": { width: "105mm", height: "74mm", fontSize: "20px" },
      "148x105": { width: "148mm", height: "105mm", fontSize: "24px" },
    };

    const tam = tamanhos[tamanho];
    const configuracoes = JSON.parse(localStorage.getItem('configuracoes_erp') || '{}');
    const logoUrl = configuracoes.empresa?.logo_url;

    // Layout especial para 2 colunas - Rolo 85mm com 2 etiquetas 40x25mm
    // Estrutura: 1.5mm (margem) + 40mm (etiqueta) + 2mm (gap) + 40mm (etiqueta) + 1.5mm (margem) = 85mm
    if (tam.colunas === 2) {
      const totalEtiquetas = config.quantidade;
      const totalLinhas = Math.ceil(totalEtiquetas / 2);

      // CORREÇÃO XSS: Sanitizar dados antes de inserir em HTML
      const textoSeguro = escapeHtml(config.texto);
      const codigoSeguro = escapeHtml(config.codigo);
      const bateriaSegura = escapeHtml(config.saudeBateria);
      const barcodeSeguro = sanitizeBarcode(config.codigoBarras);

      let etiquetasHTML = '';
      for (let i = 0; i < totalLinhas; i++) {
        const etiqueta1 = i * 2 < totalEtiquetas;
        const etiqueta2 = i * 2 + 1 < totalEtiquetas;

        etiquetasHTML += `
            <div class="linha">
              <div class="etiqueta">
                ${etiqueta1 ? `
                  ${config.logo && logoUrl ? `<img src="${logoUrl}" class="logo" />` : ''}
                  ${textoSeguro ? `<div class="texto">${textoSeguro}</div>` : ''}
                  ${config.preco ? `<div class="preco">R$ ${parseFloat(config.preco).toFixed(2)}</div>` : ''}
                  ${codigoSeguro ? `<div class="codigo">${codigoSeguro}</div>` : ''}
                  ${bateriaSegura ? `<div class="bateria">🔋 ${bateriaSegura}</div>` : ''}
                  ${config.incluirCodigoBarras === true && barcodeSeguro ? `<div class="barcode-container"><img src="https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(barcodeSeguro)}&code=Code128&translate-esc=on&dpi=96&imagetype=Png&color=000000" class="barcode-image" alt="Barcode" onerror="this.style.display='none'" /></div>` : ''}
                ` : ''}
              </div>
              <div class="etiqueta">
                ${etiqueta2 ? `
                  ${config.logo && logoUrl ? `<img src="${logoUrl}" class="logo" />` : ''}
                  ${textoSeguro ? `<div class="texto">${textoSeguro}</div>` : ''}
                  ${config.preco ? `<div class="preco">R$ ${parseFloat(config.preco).toFixed(2)}</div>` : ''}
                  ${codigoSeguro ? `<div class="codigo">${codigoSeguro}</div>` : ''}
                  ${bateriaSegura ? `<div class="bateria">🔋 ${bateriaSegura}</div>` : ''}
                  ${config.incluirCodigoBarras === true && barcodeSeguro ? `<div class="barcode-container"><img src="https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(barcodeSeguro)}&code=Code128&translate-esc=on&dpi=96&imagetype=Png&color=000000" class="barcode-image" alt="Barcode" onerror="this.style.display='none'" /></div>` : ''}
                ` : ''}
              </div>
            </div>
          `;
      }

      const medidas = configuracoes?.impressao?.medidas_etiquetas?.["40x25_2col"] || {
        logo_largura_max: "15mm", logo_altura_max: "8mm", logo_margem_top: "0.8mm", logo_margem_bottom: "0.8mm",
        texto_fonte: "7.5px", texto_line_height: "1.00", texto_margem_top: "0.1mm", texto_margem_bottom: "0.1mm",
        preco_fonte: "15px", preco_line_height: "0.95", preco_margem: "0.2mm",
        sku_fonte: "6.5px", sku_line_height: "0.90", sku_margem_top: "0.2mm",
        barcode_largura_max: "35mm", barcode_altura: "5mm", barcode_margem_top: "0.5mm", barcode_numero_fonte: "4px"
      };

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @media print {
              @page { 
                size: 84mm 25mm; 
                margin: 0; 
              }
              * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
            }
            * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 0;
              width: 84mm;
            }
            .linha { 
              width: 84mm; 
              height: 25mm; 
              display: flex;
              flex-direction: row;
              align-items: stretch;
              padding: 0 1mm;
              gap: 2mm;
              page-break-after: always;
            }
            .linha:last-child { page-break-after: auto; }
            .etiqueta { 
              width: 40mm; 
              height: 25mm; 
              display: flex; 
              flex-direction: column; 
              justify-content: flex-start; 
              align-items: center; 
              text-align: center;
              padding: 0.5mm 0.8mm 0.8mm 0.8mm;
              overflow: hidden;
            }
            .logo { max-width: ${config.logoMaxW ? `${Math.round(40 * config.logoMaxW / 100)}mm` : medidas.logo_largura_max}; max-height: ${config.logoMaxH ? `${Math.round(25 * config.logoMaxH / 100)}mm` : medidas.logo_altura_max}; margin-top: ${medidas.logo_margem_top}; margin-bottom: ${medidas.logo_margem_bottom}; object-fit: contain; display: block; margin-left: auto; margin-right: auto; }
            .texto { font-weight: 600; font-size: ${medidas.texto_fonte}; line-height: ${medidas.texto_line_height}; margin: ${medidas.texto_margem_top} 0 ${medidas.texto_margem_bottom} 0; max-width: 38mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .preco { font-size: ${medidas.preco_fonte}; font-weight: bold; color: #059669; line-height: ${medidas.preco_line_height}; margin: ${medidas.preco_margem} 0; }
            .codigo { font-family: monospace; font-size: ${medidas.sku_fonte}; margin-top: ${medidas.sku_margem_top}; line-height: ${medidas.sku_line_height}; }
            .bateria { color: #10b981; font-weight: bold; font-size: ${medidas.sku_fonte}; margin-top: ${medidas.sku_margem_top}; line-height: ${medidas.sku_line_height}; }
            .barcode-container { margin-top: ${medidas.barcode_margem_top}; text-align: center; display: block; width: 100%; }
            .barcode-image { 
              max-width: ${medidas.barcode_largura_max} !important; 
              height: ${medidas.barcode_altura} !important; 
              object-fit: contain !important; 
              margin: 0 auto !important; 
              display: block !important; 
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            @media print {
              .barcode-container, .barcode-image { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
          </style>
        </head>
        <body>${etiquetasHTML}</body>
        </html>
      `;

      // CORREÇÃO: Tratar popup blocker
      const janela = window.open('', '_blank');
      if (!janela || janela.closed || typeof janela.closed === 'undefined') {
        toast.error("Popup bloqueado! Permita popups para imprimir.");
        return;
      }
      janela.document.write(html);
      janela.document.close();

      // Aguardar carregamento das imagens antes de imprimir
      setTimeout(() => {
        const images = janela.document.images;
        let loaded = 0;
        const total = images.length;
        let printed = false; // Flag para evitar impressão dupla

        const doPrint = () => {
          if (!printed) {
            printed = true;
            janela.print();
          }
        };

        if (total === 0) {
          doPrint();
          return;
        }

        for (let i = 0; i < total; i++) {
          if (images[i].complete) {
            loaded++;
          } else {
            images[i].onload = () => {
              loaded++;
              if (loaded === total) doPrint();
            };
            images[i].onerror = () => {
              loaded++;
              if (loaded === total) doPrint();
            };
          }
        }

        if (loaded === total) doPrint();

        // Fallback: imprimir após 2 segundos se as imagens não carregarem
        setTimeout(() => doPrint(), 2000);
      }, 500);

      toast.success("Imprimindo etiquetas (2 colunas)!");
      return;
    }

    // CORREÇÃO XSS: Sanitizar dados para layout de 1 coluna também
    const textoSeguro1Col = escapeHtml(config.texto);
    const codigoSeguro1Col = escapeHtml(config.codigo);
    const bateriaSegura1Col = escapeHtml(config.saudeBateria);
    const barcodeSeguro1Col = sanitizeBarcode(config.codigoBarras);

    // Usar configurações salvas para o tamanho selecionado
    const medidas = configuracoes?.impressao?.medidas_etiquetas?.[tamanho] || {
      logo_largura_max: "20mm", logo_altura_max: "10mm", logo_margem_top: "1mm", logo_margem_bottom: "1mm",
      texto_fonte: "9px", texto_line_height: "1.05", texto_margem_top: "0.2mm", texto_margem_bottom: "0.2mm",
      preco_fonte: "18px", preco_line_height: "1.00", preco_margem: "0.3mm",
      sku_fonte: "7px", sku_line_height: "0.95", sku_margem_top: "0.3mm",
      barcode_largura_max: "45mm", barcode_altura: "6mm", barcode_margem_top: "0.5mm", barcode_numero_fonte: "5px"
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @media print {
            @page { size: ${tam.width} ${tam.height}; margin: 0; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          }
          * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 1.5mm; }
          .etiqueta { 
            text-align: center; display: flex; flex-direction: column; justify-content: flex-start; 
            align-items: center; height: 100%; page-break-after: always; padding-top: 0.5mm; overflow: hidden;
          }
          .etiqueta:last-child { page-break-after: auto; }
          .logo { 
            max-width: ${(() => { if (config.logoMaxW) { const w = parseFloat(tam.width); return `${Math.round(w * config.logoMaxW / 100)}mm`; } return medidas.logo_largura_max; })()}; 
            max-height: ${(() => { if (config.logoMaxH) { const h = parseFloat(tam.height); return `${Math.round(h * config.logoMaxH / 100)}mm`; } return medidas.logo_altura_max; })()}; 
            margin-top: ${medidas.logo_margem_top};
            margin-bottom: ${medidas.logo_margem_bottom};
            display: block;
            object-fit: contain;
            margin-left: auto;
            margin-right: auto;
          }
          .texto { 
            font-weight: 600; 
            font-size: ${medidas.texto_fonte}; 
            line-height: ${medidas.texto_line_height}; 
            margin: ${medidas.texto_margem_top} 0 ${medidas.texto_margem_bottom} 0;
          }
          .preco { 
            font-size: ${medidas.preco_fonte}; 
            font-weight: bold; 
            color: #059669; 
            line-height: ${medidas.preco_line_height}; 
            margin: ${medidas.preco_margem} 0; 
          }
          .codigo { 
            font-family: monospace; 
            font-size: ${medidas.sku_fonte}; 
            margin-top: ${medidas.sku_margem_top}; 
            line-height: ${medidas.sku_line_height}; 
          }
          .bateria { 
            color: #10b981; 
            font-weight: bold; 
            font-size: ${medidas.sku_fonte}; 
            margin-top: ${medidas.sku_margem_top}; 
            line-height: ${medidas.sku_line_height}; 
          }
          .barcode-container { 
            margin-top: ${medidas.barcode_margem_top}; 
            text-align: center; 
            display: block; 
            width: 100%; 
          }
          .barcode-image { 
            max-width: ${medidas.barcode_largura_max} !important; 
            height: ${medidas.barcode_altura} !important; 
            object-fit: contain !important; 
            margin: 0 auto !important; 
            display: block !important; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          @media print {
            .barcode-container, .barcode-image { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
        </style>
      </head>
      <body>
        ${Array(config.quantidade).fill(0).map(() => `
          <div class="etiqueta">
            ${config.logo && logoUrl ? `<img src="${logoUrl}" class="logo" />` : ''}
            ${textoSeguro1Col ? `<div class="texto">${textoSeguro1Col}</div>` : ''}
            ${config.preco ? `<div class="preco">R$ ${parseFloat(config.preco).toFixed(2)}</div>` : ''}
            ${codigoSeguro1Col ? `<div class="codigo">${codigoSeguro1Col}</div>` : ''}
            ${bateriaSegura1Col ? `<div class="bateria">🔋 Bateria: ${bateriaSegura1Col}</div>` : ''}
            ${config.incluirCodigoBarras === true && barcodeSeguro1Col ? `<div class="barcode-container"><img src="https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(barcodeSeguro1Col)}&code=Code128&translate-esc=on&dpi=96&imagetype=Png&color=000000" class="barcode-image" alt="Barcode" onerror="this.style.display='none'" /></div>` : ''}
          </div>
        `).join('')}
      </body>
      </html>
    `;

    // CORREÇÃO: Tratar popup blocker
    const janela = window.open('', '_blank');
    if (!janela || janela.closed || typeof janela.closed === 'undefined') {
      toast.error("Popup bloqueado! Permita popups para imprimir.");
      return;
    }
    janela.document.write(html);
    janela.document.close();

    // Aguardar carregamento das imagens antes de imprimir
    setTimeout(() => {
      const images = janela.document.images;
      let loaded = 0;
      const total = images.length;
      let printed = false; // Flag para evitar impressão dupla

      const doPrint = () => {
        if (!printed) {
          printed = true;
          janela.print();
        }
      };

      if (total === 0) {
        doPrint();
        return;
      }

      for (let i = 0; i < total; i++) {
        if (images[i].complete) {
          loaded++;
        } else {
          images[i].onload = () => {
            loaded++;
            if (loaded === total) doPrint();
          };
          images[i].onerror = () => {
            loaded++;
            if (loaded === total) doPrint();
          };
        }
      }

      if (loaded === total) doPrint();

      // Fallback: imprimir após 2 segundos se as imagens não carregarem
      setTimeout(() => doPrint(), 2000);
    }, 500);

    toast.success("Imprimindo etiqueta!");
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Etiquetas Personalizáveis</h1>
        <p className="text-slate-500">Configure e imprima etiquetas customizadas</p>
      </div>

      <Tabs value={tipoEtiqueta} onValueChange={setTipoEtiqueta}>
        <TabsList>
          <TabsTrigger value="preco">Preço</TabsTrigger>
          <TabsTrigger value="imei">IMEI</TabsTrigger>
          <TabsTrigger value="os">Ordem de Serviço</TabsTrigger>
          <TabsTrigger value="seminovo">Seminovos</TabsTrigger>
          <TabsTrigger value="vitrine">Vitrine</TabsTrigger>
          <TabsTrigger value="display" className="flex items-center gap-1">
            <Monitor className="w-4 h-4" />
            Display
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tipoEtiqueta} className={tipoEtiqueta === "display" ? "hidden" : ""}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuração</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Tamanho</Label>
                  <Select value={tamanho} onValueChange={setTamanho}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30x20">30mm x 20mm (Mini)</SelectItem>
                      <SelectItem value="40x25">40mm x 25mm (Pequeno)</SelectItem>
                      <SelectItem value="40x25_2col">40mm x 25mm - 2 Colunas (Rolo 84mm)</SelectItem>
                      <SelectItem value="50x30">50mm x 30mm (Padrão)</SelectItem>
                      <SelectItem value="60x40">60mm x 40mm (Médio)</SelectItem>
                      <SelectItem value="70x50">70mm x 50mm (Grande)</SelectItem>
                      <SelectItem value="80x60">80mm x 60mm (Extra Grande)</SelectItem>
                      <SelectItem value="90x70">90mm x 70mm (Jumbo)</SelectItem>
                      <SelectItem value="100x70">100mm x 70mm (Super)</SelectItem>
                      <SelectItem value="105x74">105mm x 74mm (A7)</SelectItem>
                      <SelectItem value="148x105">148mm x 105mm (A6)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <Label>Incluir Logo da Empresa</Label>
                    <p className="text-xs text-slate-500">Mostrar logo na etiqueta</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.logo}
                      onChange={(e) => { const v = e.target.checked; setConfig(prev => ({ ...prev, logo: v })); }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Controles de tamanho da logo — só aparece se logo ativada */}
                {config.logo && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div>
                      <Label className="text-xs">Largura Logo ({config.logoMaxW || 60}%)</Label>
                      <input
                        type="range"
                        min="10" max="100" step="5"
                        value={config.logoMaxW || 60}
                        onChange={(e) => { const v = parseInt(e.target.value); setConfig(prev => ({ ...prev, logoMaxW: v })); }}
                        className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Altura Logo ({config.logoMaxH || 30}%)</Label>
                      <input
                        type="range"
                        min="5" max="80" step="5"
                        value={config.logoMaxH || 30}
                        onChange={(e) => { const v = parseInt(e.target.value); setConfig(prev => ({ ...prev, logoMaxH: v })); }}
                        className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mt-1"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Texto Principal</Label>
                    <Input
                      value={config.texto}
                      onChange={(e) => { const v = e.target.value; setConfig(prev => ({ ...prev, texto: v })); }}
                      placeholder="Nome do produto"
                    />
                  </div>
                  <div>
                    <Label>Tamanho Texto (%)</Label>
                    <Input
                      type="number"
                      value={config.tamanhoTexto || 100}
                      onChange={(e) => { const v = parseInt(e.target.value) || 100; setConfig(prev => ({ ...prev, tamanhoTexto: v })); }}
                      placeholder="100"
                    />
                  </div>
                </div>

                {tipoEtiqueta === "preco" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Preço</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={config.preco}
                        onChange={(e) => { const v = e.target.value; setConfig(prev => ({ ...prev, preco: v })); }}
                      />
                    </div>
                    <div>
                      <Label>Tamanho Preço (%)</Label>
                      <Input
                        type="number"
                        value={config.tamanhoPreco || 100}
                        onChange={(e) => { const v = parseInt(e.target.value) || 100; setConfig(prev => ({ ...prev, tamanhoPreco: v })); }}
                        placeholder="100"
                      />
                    </div>
                  </div>
                )}

                {tipoEtiqueta === "imei" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>IMEI</Label>
                      <Input
                        value={config.codigo}
                        onChange={(e) => { const v = e.target.value; setConfig(prev => ({ ...prev, codigo: v })); }}
                        placeholder="000000000000000"
                      />
                    </div>
                    <div>
                      <Label>Tamanho IMEI (%)</Label>
                      <Input
                        type="number"
                        value={config.tamanhoImei || 100}
                        onChange={(e) => { const v = parseInt(e.target.value) || 100; setConfig(prev => ({ ...prev, tamanhoImei: v })); }}
                        placeholder="100"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <Label>Incluir Código de Barras</Label>
                    <p className="text-xs text-slate-500">Mostrar código de barras na etiqueta</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.incluirCodigoBarras}
                      onChange={(e) => { const v = e.target.checked; setConfig(prev => ({ ...prev, incluirCodigoBarras: v })); }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {config.incluirCodigoBarras && (
                  <div>
                    <Label>Código de Barras</Label>
                    <Input
                      value={config.codigoBarras}
                      onChange={(e) => { const v = e.target.value; setConfig(prev => ({ ...prev, codigoBarras: v })); }}
                      placeholder="7891234567890"
                      maxLength={13}
                    />
                  </div>
                )}

                {tipoEtiqueta === "seminovo" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Saúde da Bateria</Label>
                      <Input
                        value={config.saudeBateria}
                        onChange={(e) => { const v = e.target.value; setConfig(prev => ({ ...prev, saudeBateria: v })); }}
                        placeholder="Ex: 95%"
                      />
                    </div>
                    <div>
                      <Label>Tamanho Bateria (%)</Label>
                      <Input
                        type="number"
                        value={config.tamanhoBateria || 100}
                        onChange={(e) => { const v = parseInt(e.target.value) || 100; setConfig(prev => ({ ...prev, tamanhoBateria: v })); }}
                        placeholder="100"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    value={config.quantidade}
                    onChange={(e) => { const v = parseInt(e.target.value) || 1; setConfig(prev => ({ ...prev, quantidade: v })); }}
                  />
                </div>

                <Button onClick={imprimir} className="w-full bg-blue-600">
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preview da Etiqueta</CardTitle>
              </CardHeader>
              <CardContent>
                {tamanho === '40x25_2col' ? (
                  /* Preview 2 colunas */
                  <div>
                    <div
                      className="border-2 border-slate-300 rounded-lg bg-white shadow-md"
                      style={{
                        width: '317px', /* 84mm */
                        height: '94px', /* 25mm */
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto',
                        gap: '8px',
                        padding: '0 4px'
                      }}
                    >
                      {/* Etiqueta 1 */}
                      <div style={{
                        width: '151px',
                        height: '94px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                        fontSize: '7px',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '4px',
                        padding: '2px 3px 3px 3px'
                      }}>
                        {config.logo && (() => {
                          const configuracoes = JSON.parse(localStorage.getItem('configuracoes_erp') || '{}');
                          const logoUrl = configuracoes.empresa?.logo_url;
                          return logoUrl ? (
                            <img src={logoUrl} alt="Logo" style={{ maxWidth: '56px', maxHeight: '30px', marginTop: '2px', marginBottom: '3px', objectFit: 'contain', display: 'block' }} />
                          ) : (
                            <div style={{ fontSize: '0.6em', color: '#94a3b8', marginTop: '2px', marginBottom: '3px' }}>LOGO</div>
                          );
                        })()}
                        {config.texto && <div style={{ fontWeight: 600, marginBottom: '1px', textAlign: 'center', fontSize: '1em', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{config.texto}</div>}
                        {config.preco && <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#059669', lineHeight: 1, margin: '1px 0' }}>R$ {parseFloat(config.preco || 0).toFixed(2)}</div>}
                        {config.codigo && <div style={{ fontFamily: 'monospace', fontSize: '0.8em', marginTop: '1px', lineHeight: 1 }}>{config.codigo}</div>}
                        {config.incluirCodigoBarras && config.codigoBarras && (
                          <div style={{ marginTop: '2px', textAlign: 'center' }}>
                            <img
                              src={`https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(config.codigoBarras)}&code=Code128&translate-esc=on&dpi=96&imagetype=Png&color=000000`}
                              alt="Barcode"
                              style={{ maxWidth: '130px', height: '19px', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                              onError={(e) => e.target.style.display = 'none'}
                            />
                          </div>
                        )}
                        {config.saudeBateria && <div style={{ fontSize: '0.8em', color: '#10b981', fontWeight: 600, marginTop: '1px', lineHeight: 1 }}>🔋 {config.saudeBateria}</div>}
                      </div>
                      {/* Etiqueta 2 */}
                      <div style={{
                        width: '151px',
                        height: '94px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                        fontSize: '7px',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '4px',
                        padding: '2px 3px 3px 3px'
                      }}>
                        {config.logo && (() => {
                          const configuracoes = JSON.parse(localStorage.getItem('configuracoes_erp') || '{}');
                          const logoUrl = configuracoes.empresa?.logo_url;
                          return logoUrl ? (
                            <img src={logoUrl} alt="Logo" style={{ maxWidth: '56px', maxHeight: '30px', marginTop: '2px', marginBottom: '3px', objectFit: 'contain', display: 'block' }} />
                          ) : (
                            <div style={{ fontSize: '0.6em', color: '#94a3b8', marginTop: '2px', marginBottom: '3px' }}>LOGO</div>
                          );
                        })()}
                        {config.texto && <div style={{ fontWeight: 600, marginBottom: '1px', textAlign: 'center', fontSize: '1em', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{config.texto}</div>}
                        {config.preco && <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#059669', lineHeight: 1, margin: '1px 0' }}>R$ {parseFloat(config.preco || 0).toFixed(2)}</div>}
                        {config.codigo && <div style={{ fontFamily: 'monospace', fontSize: '0.8em', marginTop: '1px', lineHeight: 1 }}>{config.codigo}</div>}
                        {config.incluirCodigoBarras === true && config.codigoBarras && (
                          <div style={{ marginTop: '2px', textAlign: 'center' }}>
                            <img
                              src={`https://bwipjs-api.metafloor.com/?bcid=ean13&text=${config.codigoBarras}&scale=2&height=5&includetext`}
                              alt="Barcode"
                              style={{ maxWidth: '130px', height: '19px', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                            />
                          </div>
                        )}
                        {config.saudeBateria && <div style={{ fontSize: '0.8em', color: '#10b981', fontWeight: 600, marginTop: '1px', lineHeight: 1 }}>🔋 {config.saudeBateria}</div>}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 text-center">
                      Rolo 84mm (1mm + 40mm + 2mm + 40mm + 1mm) • {config.quantidade} {config.quantidade === 1 ? 'etiqueta' : 'etiquetas'}
                    </p>
                  </div>
                ) : (
                  /* Preview coluna única */
                  <>
                    <div
                      className="border-2 border-slate-300 rounded-lg bg-white shadow-md"
                      style={{
                        width: tamanho === '30x20' ? '113px' :
                          tamanho === '40x25' ? '151px' :
                            tamanho === '50x30' ? '189px' :
                              tamanho === '60x40' ? '226px' :
                                tamanho === '70x50' ? '264px' :
                                  tamanho === '80x60' ? '302px' :
                                    tamanho === '90x70' ? '340px' :
                                      tamanho === '100x70' ? '377px' :
                                        tamanho === '105x74' ? '396px' : '559px',
                        height: tamanho === '30x20' ? '75px' :
                          tamanho === '40x25' ? '94px' :
                            tamanho === '50x30' ? '113px' :
                              tamanho === '60x40' ? '151px' :
                                tamanho === '70x50' ? '189px' :
                                  tamanho === '80x60' ? '226px' :
                                    tamanho === '90x70' ? '264px' :
                                      tamanho === '100x70' ? '264px' :
                                        tamanho === '105x74' ? '279px' : '396px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: '8px',
                        fontSize: tamanho === '30x20' ? '6px' :
                          tamanho === '40x25' ? '7px' :
                            tamanho === '50x30' ? '8px' :
                              tamanho === '60x40' ? '10px' :
                                tamanho === '70x50' ? '11px' :
                                  tamanho === '80x60' ? '13px' :
                                    tamanho === '90x70' ? '15px' :
                                      tamanho === '100x70' ? '16px' :
                                        tamanho === '105x74' ? '16px' : '20px',
                        margin: '0 auto'
                      }}
                    >
                      {config.logo && (() => {
                        const configuracoes = JSON.parse(localStorage.getItem('configuracoes_erp') || '{}');
                        const logoUrl = configuracoes.empresa?.logo_url;
                        // Base pixel de referência da etiqueta para calcular %
                        const baseW = tamanho === '30x20' ? 75 : tamanho === '40x25' ? 100 : tamanho === '50x30' ? 125 : tamanho === '60x40' ? 151 : tamanho === '70x50' ? 189 : tamanho === '80x60' ? 226 : 264;
                        const baseH = tamanho === '30x20' ? 47 : tamanho === '40x25' ? 63 : tamanho === '50x30' ? 75 : tamanho === '60x40' ? 100 : 125;
                        const logoW = `${Math.round(baseW * (config.logoMaxW || 60) / 100)}px`;
                        const logoH = `${Math.round(baseH * (config.logoMaxH || 30) / 100)}px`;
                        return logoUrl ? (
                          <img
                            src={logoUrl}
                            alt="Logo"
                            style={{
                              maxWidth: logoW,
                              maxHeight: logoH,
                              marginBottom: '4px',
                              objectFit: 'contain'
                            }}
                          />
                        ) : (
                          <div style={{ fontSize: '0.6em', color: '#94a3b8', marginBottom: '2px' }}>LOGO</div>
                        );
                      })()}
                      {config.texto && <div style={{ fontWeight: 600, marginBottom: '2px', textAlign: 'center', fontSize: `${(config.tamanhoTexto || 100) / 100}em` }}>{config.texto}</div>}
                      {config.preco && <div style={{ fontSize: `${2.5 * ((config.tamanhoPreco || 100) / 100)}em`, fontWeight: 'bold', color: '#059669', margin: '2px 0', lineHeight: 1 }}>R$ {parseFloat(config.preco || 0).toFixed(2)}</div>}
                      {config.codigo && <div style={{ fontFamily: 'monospace', fontSize: `${0.9 * ((config.tamanhoImei || 100) / 100)}em`, marginTop: '2px' }}>{config.codigo}</div>}
                      {config.incluirCodigoBarras && config.codigoBarras && (
                        <div style={{ marginTop: '3px', textAlign: 'center' }}>
                          <img
                            src={`https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(config.codigoBarras)}&code=Code128&translate-esc=on&dpi=96&imagetype=Png&color=000000`}
                            alt="Barcode"
                            style={{ maxWidth: '90%', height: 'auto', maxHeight: '25px', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                            onError={(e) => e.target.style.display = 'none'}
                          />
                        </div>
                      )}
                      {config.saudeBateria && <div style={{ fontSize: `${0.85 * ((config.tamanhoBateria || 100) / 100)}em`, color: '#10b981', fontWeight: 600, marginTop: '2px' }}>🔋 {config.saudeBateria}</div>}
                    </div>
                    <p className="text-xs text-slate-500 mt-2 text-center">
                      Escala real: {tamanho}mm • {config.quantidade} {config.quantidade === 1 ? 'etiqueta' : 'etiquetas'}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ABA DISPLAY */}
        <TabsContent value="display">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-blue-600" />
                Display Seminovo (10cm x 15cm)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Lado Esquerdo - Formulário */}
                <div className="flex-1 space-y-4">
                  {/* Busca Produto e Displays Salvos */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label>Buscar Produto Cadastrado</Label>
                      <Button onClick={() => setDialogProdutos(true)} variant="outline" className="w-full justify-start">
                        <Search className="w-4 h-4 mr-2" />
                        {displayData.nomeProduto || "Clique para buscar produto..."}
                      </Button>
                    </div>
                    <div>
                      <Label>Displays Salvos</Label>
                      <Button onClick={() => setDialogDisplaysSalvos(true)} variant="outline" className="w-full">
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Carregar ({displaysSalvos.length})
                      </Button>
                    </div>
                  </div>

                  {/* Upload Logo */}
                  <div>
                    <Label>Logo (centralizada no topo)</Label>
                    <div className="flex gap-2 items-center flex-wrap">
                      <Button type="button" variant="outline" onClick={usarLogoEmpresa} className="text-sm">
                        Usar Logo da Empresa
                      </Button>
                      <span className="text-slate-400 text-sm">ou</span>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="flex-1 min-w-[150px]"
                      />
                      {displayData.logoUrl && (
                        <img src={displayData.logoUrl} alt="Logo" className="h-10 object-contain" />
                      )}
                    </div>
                  </div>

                  {/* Nome do Produto */}
                  <div>
                    <Label>Nome do Produto</Label>
                    <Input
                      value={displayData.nomeProduto}
                      onChange={(e) => setDisplayData({ ...displayData, nomeProduto: e.target.value })}
                      placeholder="Ex: iPhone 14 PRO"
                    />
                  </div>

                  {/* Toggle Seminovo */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <Label>Exibir "SEMINOVO"</Label>
                      <p className="text-xs text-slate-500">Mostrar texto SEMINOVO abaixo do nome</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={displayData.exibirSeminovo}
                        onChange={(e) => setDisplayData({ ...displayData, exibirSeminovo: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Descrição */}
                  <div>
                    <Label>Descrição (máx. 55 caracteres por linha / 17 linhas)</Label>
                    <div className="flex gap-1 mb-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="font-bold px-3"
                        onClick={() => {
                          const textarea = document.getElementById('descricao-textarea');
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          if (start !== end) {
                            const text = displayData.descricao;
                            const selected = text.substring(start, end);
                            // Toggle: se já tem a tag, remove; senão, adiciona
                            if (selected.startsWith('<b>') && selected.endsWith('</b>')) {
                              const clean = selected.slice(3, -4);
                              const newText = text.substring(0, start) + clean + text.substring(end);
                              setDisplayData({ ...displayData, descricao: limitarDescricao(newText) });
                            } else {
                              const newText = text.substring(0, start) + `<b>${selected}</b>` + text.substring(end);
                              setDisplayData({ ...displayData, descricao: limitarDescricao(newText) });
                            }
                          }
                        }}
                        title="Negrito"
                      >
                        B
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="italic px-3"
                        onClick={() => {
                          const textarea = document.getElementById('descricao-textarea');
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          if (start !== end) {
                            const text = displayData.descricao;
                            const selected = text.substring(start, end);
                            if (selected.startsWith('<i>') && selected.endsWith('</i>')) {
                              const clean = selected.slice(3, -4);
                              const newText = text.substring(0, start) + clean + text.substring(end);
                              setDisplayData({ ...displayData, descricao: limitarDescricao(newText) });
                            } else {
                              const newText = text.substring(0, start) + `<i>${selected}</i>` + text.substring(end);
                              setDisplayData({ ...displayData, descricao: limitarDescricao(newText) });
                            }
                          }
                        }}
                        title="Itálico"
                      >
                        I
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="underline px-3"
                        onClick={() => {
                          const textarea = document.getElementById('descricao-textarea');
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          if (start !== end) {
                            const text = displayData.descricao;
                            const selected = text.substring(start, end);
                            if (selected.startsWith('<u>') && selected.endsWith('</u>')) {
                              const clean = selected.slice(3, -4);
                              const newText = text.substring(0, start) + clean + text.substring(end);
                              setDisplayData({ ...displayData, descricao: limitarDescricao(newText) });
                            } else {
                              const newText = text.substring(0, start) + `<u>${selected}</u>` + text.substring(end);
                              setDisplayData({ ...displayData, descricao: limitarDescricao(newText) });
                            }
                          }
                        }}
                        title="Sublinhado"
                      >
                        U
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="line-through px-3"
                        onClick={() => {
                          const textarea = document.getElementById('descricao-textarea');
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          if (start !== end) {
                            const text = displayData.descricao;
                            const selected = text.substring(start, end);
                            if (selected.startsWith('<s>') && selected.endsWith('</s>')) {
                              const clean = selected.slice(3, -4);
                              const newText = text.substring(0, start) + clean + text.substring(end);
                              setDisplayData({ ...displayData, descricao: limitarDescricao(newText) });
                            } else {
                              const newText = text.substring(0, start) + `<s>${selected}</s>` + text.substring(end);
                              setDisplayData({ ...displayData, descricao: limitarDescricao(newText) });
                            }
                          }
                        }}
                        title="Tachado"
                      >
                        S
                      </Button>
                      <span className="text-xs text-slate-400 ml-2 self-center">Selecione o texto e clique no botão</span>
                    </div>
                    <Textarea
                      id="descricao-textarea"
                      value={displayData.descricao}
                      onChange={(e) => setDisplayData({ ...displayData, descricao: limitarDescricao(e.target.value) })}
                      placeholder="Descrição detalhada do produto..."
                      rows={6}
                      style={{ fontFamily: 'monospace' }}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {displayData.descricao?.length || 0}/935 caracteres (55 × 17 linhas)
                    </p>

                    {/* Ferramentas de Formatação */}
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg border">
                      <Label className="text-xs font-semibold mb-2 block">Formatação do Texto</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs text-slate-600">Tamanho (mm)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            min="1.5"
                            max="4"
                            value={formatacaoDescricao.fontSize}
                            onChange={(e) => setFormatacaoDescricao({ ...formatacaoDescricao, fontSize: parseFloat(e.target.value) || 2.3 })}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-600">Espaço Linhas</Label>
                          <Input
                            type="number"
                            step="0.1"
                            min="0.1"
                            max="1.5"
                            value={formatacaoDescricao.lineHeight}
                            onChange={(e) => setFormatacaoDescricao({ ...formatacaoDescricao, lineHeight: parseFloat(e.target.value) || 1.15 })}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-600">Espaço Parágrafos (mm)</Label>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            max="5"
                            value={formatacaoDescricao.paragraphSpacing}
                            onChange={(e) => setFormatacaoDescricao({ ...formatacaoDescricao, paragraphSpacing: parseFloat(e.target.value) || 1.5 })}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-600">Peso da Fonte</Label>
                          <Select
                            value={formatacaoDescricao.fontWeight}
                            onValueChange={(value) => setFormatacaoDescricao({ ...formatacaoDescricao, fontWeight: value })}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="bold">Negrito</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-600">Fonte</Label>
                          <Select
                            value={formatacaoDescricao.fontFamily}
                            onValueChange={(value) => setFormatacaoDescricao({ ...formatacaoDescricao, fontFamily: value })}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Calibri">Calibri</SelectItem>
                              <SelectItem value="Helvetica">Helvetica</SelectItem>
                              <SelectItem value="Verdana">Verdana</SelectItem>
                              <SelectItem value="Tahoma">Tahoma</SelectItem>
                              <SelectItem value="Trebuchet MS">Trebuchet MS</SelectItem>
                              <SelectItem value="Georgia">Georgia</SelectItem>
                              <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                              <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                              <SelectItem value="Courier New">Courier New</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Formas de Pagamento */}
                  <div className="p-3 bg-slate-50 rounded-lg space-y-3">
                    <Label className="font-semibold">Formas de Pagamento</Label>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">NO PIX (R$)</Label>
                        <Input
                          value={displayData.precoPix}
                          onChange={(e) => setDisplayData({ ...displayData, precoPix: e.target.value })}
                          placeholder="4.289,90"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">NO DÉBITO (R$)</Label>
                        <Input
                          value={displayData.precoDebito}
                          onChange={(e) => setDisplayData({ ...displayData, precoDebito: e.target.value })}
                          placeholder="4.387,90"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">À PRAZO (linhas separadas)</Label>
                      <div className="space-y-2">
                        <Input
                          value={displayData.precoPrazo1}
                          onChange={(e) => setDisplayData({ ...displayData, precoPrazo1: e.target.value })}
                          placeholder="12× de R$ 389,51"
                        />
                        <Input
                          value={displayData.precoPrazo2}
                          onChange={(e) => setDisplayData({ ...displayData, precoPrazo2: e.target.value })}
                          placeholder="10× de R$ 437,41"
                        />
                        <Input
                          value={displayData.precoPrazo3}
                          onChange={(e) => setDisplayData({ ...displayData, precoPrazo3: e.target.value })}
                          placeholder="5× de R$ 917,50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Informações Adicionais */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Garantia</Label>
                      <Input
                        value={displayData.garantia}
                        onChange={(e) => setDisplayData({ ...displayData, garantia: e.target.value })}
                        placeholder="3 Meses"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Itens Inclusos</Label>
                      <Input
                        value={displayData.itensInclusos}
                        onChange={(e) => setDisplayData({ ...displayData, itensInclusos: e.target.value })}
                        placeholder="Caixa e Cabo"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Saúde da Bateria</Label>
                      <Input
                        value={displayData.saudeBateria}
                        onChange={(e) => setDisplayData({ ...displayData, saudeBateria: e.target.value })}
                        placeholder="75%"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Capacidade</Label>
                      <Input
                        value={displayData.capacidade}
                        onChange={(e) => setDisplayData({ ...displayData, capacidade: e.target.value })}
                        placeholder="128 GB"
                      />
                    </div>
                  </div>

                  {/* URL QR Code */}
                  <div>
                    <Label>URL para QR Code (Instagram, etc)</Label>
                    <Input
                      value={displayData.qrcodeUrl}
                      onChange={(e) => setDisplayData({ ...displayData, qrcodeUrl: e.target.value })}
                      placeholder="https://instagram.com/sualoja"
                    />
                  </div>

                  {/* Botões */}
                  <div className="flex gap-3">
                    <Button onClick={salvarDisplay} variant="outline" className="flex-1" disabled={salvandoDisplay}>
                      <Save className="w-4 h-4 mr-2" />
                      {salvandoDisplay ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button onClick={imprimirDisplay} className="flex-1 bg-blue-600">
                      <Printer className="w-4 h-4 mr-2" />
                      Imprimir
                    </Button>
                  </div>
                </div>

                {/* Lado Direito - Preview */}
                <div className="flex flex-col items-center">
                  <h3 className="font-semibold mb-3">Preview em Tempo Real</h3>
                  <DisplaySeminovoTemplate
                    data={{
                      ...displayData,
                      precoPrazo: [
                        displayData.precoPrazo1,
                        displayData.precoPrazo2,
                        displayData.precoPrazo3
                      ].filter(p => p)
                    }}
                    scale={0.85}
                  />
                  <p className="text-xs text-slate-500 mt-3">
                    Tamanho real: 10cm × 15cm
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dialog Produtos */}
          <Dialog open={dialogProdutos} onOpenChange={setDialogProdutos}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Selecionar Produto</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  value={buscaProduto}
                  onChange={(e) => setBuscaProduto(e.target.value)}
                  placeholder="Buscar por nome ou SKU..."
                  autoFocus
                />
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {produtosFiltrados.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      {buscaProduto ? "Nenhum produto encontrado" : "Digite para buscar ou selecione um produto"}
                    </div>
                  ) : (
                    produtosFiltrados.slice(0, 20).map((produto) => (
                      <div
                        key={produto.id}
                        className="p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => selecionarProduto(produto)}
                      >
                        <div className="font-semibold">{produto.nome}</div>
                        <div className="text-sm text-slate-500">
                          {produto.sku && `SKU: ${produto.sku} • `}
                          R$ {produto.preco_venda?.toFixed(2)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <Button variant="outline" className="w-full" onClick={() => setDialogProdutos(false)}>
                  Fechar (preencher manual)
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Dialog Displays Salvos */}
          <Dialog open={dialogDisplaysSalvos} onOpenChange={setDialogDisplaysSalvos}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Displays Salvos</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {displaysSalvos.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      Nenhum display salvo ainda
                    </div>
                  ) : (
                    displaysSalvos.map((display) => (
                      <div
                        key={display.id}
                        className="p-3 border rounded-lg hover:bg-slate-50 flex items-center justify-between"
                      >
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => carregarDisplay(display)}
                        >
                          <div className="font-semibold">{display.nome_produto || display.nome}</div>
                          <div className="text-sm text-slate-500">
                            {display.preco_pix && `PIX: R$ ${display.preco_pix}`}
                            {display.capacidade && ` • ${display.capacidade}`}
                          </div>
                          <div className="text-xs text-slate-400">
                            Salvo em: {new Date(display.created_date).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:bg-red-50"
                          onClick={() => excluirDisplay(display.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
                <Button variant="outline" className="w-full" onClick={() => setDialogDisplaysSalvos(false)}>
                  Fechar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}