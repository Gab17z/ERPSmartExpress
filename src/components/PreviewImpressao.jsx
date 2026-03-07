import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PreviewImpressao({ tipo, config = {}, produto = {}, tamanho }) {
  if (tipo === "cupom") {
    return (
      <div
        className="mx-auto bg-white text-black"
        style={{
          width: "280px",
          fontFamily: "monospace",
          fontSize: "12px",
          lineHeight: "1.25",
        }}
      >
        <div className="text-center font-bold text-sm mb-1">
          Smart Express
        </div>
        <div className="text-center text-xs mb-2">
          <div>CNPJ: 12.345.678/0001-99</div>
          <div>Rua Exemplo, 123 - Centro</div>
          <div>Fone: (11) 99999-9999</div>
        </div>

        <hr className="border-dashed my-2" />

        <div className="text-xs mb-1">
          <div className="flex justify-between">
            <span>Data:</span>
            <span>{new Date().toLocaleString("pt-BR")}</span>
          </div>
          <div className="flex justify-between">
            <span>Cupom:</span>
            <span>{produto.codigo || "VENDA-00001"}</span>
          </div>
        </div>

        <hr className="border-dashed my-2" />

        <div className="text-xs mb-2">
          <div className="flex justify-between">
            <span className="truncate max-w-[170px]">
              {produto.nome || "1x iPhone 13 Pro Max"}
            </span>
            <span>
              {(produto.preco || 4500).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
        </div>

        <hr className="border-dashed my-2" />

        <div className="flex justify-between font-bold text-sm mb-2">
          <span>TOTAL</span>
          <span>
            {(produto.preco || 4500).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </span>
        </div>

        {config.codigo_barras_cupom && (
          <>
            <hr className="border-dashed my-2" />
            <div className="text-center text-xs tracking-widest">
              |||| |||| |||| ||||
            </div>
            <div className="text-center text-xs">
              {produto.codigo_barras || "1234567890123"}
            </div>
          </>
        )}

        {config.rodape_cupom && (
          <>
            <hr className="border-dashed my-2" />
            <div className="text-center text-xs">
              {config.rodape_cupom}
            </div>
          </>
        )}

        {/* Espaço para corte */}
        <div style={{ height: "20px" }} />
      </div>
    );
  }

  if (tipo === "os") {
    const dataAtual = new Date();
    const dia = String(dataAtual.getDate()).padStart(2, '0');
    const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
    const ano = dataAtual.getFullYear();
    const dataFormatada = `${dia}/${mes}/${ano}`;

    return (
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardContent className="p-8 bg-white">
          <div className="text-center border-b-2 border-black pb-3 mb-4">
            <h2 className="text-xl font-bold">Smart Express</h2>
            <p className="text-sm">CNPJ: 12.345.678/0001-99 | Fone: (11) 99999-9999</p>
            <h3 className="text-lg font-bold mt-2">ORDEM DE SERVIÇO</h3>
            <p className="font-bold">Nº OS-00001</p>
            <p className="text-sm bg-slate-100 p-2 rounded mt-2">★ VIA DO CLIENTE ★</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <div><span className="font-bold">Cliente:</span> Maria Santos</div>
            <div><span className="font-bold">Data:</span> {dataFormatada}</div>
            <div><span className="font-bold">Status:</span> <Badge className="bg-blue-500">Recebido</Badge></div>
          </div>

          <div className="border border-black p-3 mb-3">
            <h4 className="font-bold mb-2">DADOS DO APARELHO</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="font-bold">Marca:</span> Apple</div>
              <div><span className="font-bold">Modelo:</span> iPhone 13 Pro Max</div>
              <div><span className="font-bold">IMEI:</span> 359876543210987</div>
              <div><span className="font-bold">Senha:</span> 1234</div>
            </div>
          </div>

          <div className="border border-black p-3 mb-3">
            <h4 className="font-bold mb-1">DEFEITO RECLAMADO</h4>
            <p className="text-sm">Tela não acende após queda.</p>
          </div>

          {config.incluir_termos_os && config.termos_os && (
            <div className="border-t pt-3 mt-4 text-xs">
              <p className="font-bold mb-1">TERMOS E CONDIÇÕES:</p>
              <p className="whitespace-pre-line text-xs leading-relaxed">{config.termos_os}</p>
            </div>
          )}

          <div className="flex justify-between mt-8 pt-6 border-t-2">
            <div className="text-center">
              <div className="border-t-2 border-black w-40 mb-1 mt-8"></div>
              <p className="text-xs">Assinatura do Cliente</p>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-black w-40 mb-1 mt-8"></div>
              <p className="text-xs">Assinatura do Técnico</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tipo === "etiqueta") {
    const produtoExemplo = produto || {
      nome: "iPhone 13 Pro Max 256GB",
      sku: "IP13PM-256",
      preco_venda: 4499,
      marca_nome: "Apple",
      codigo_barras: "7891234567890"
    };

    const tamanhoSelecionado = tamanho || "40x25_2col";
    const medidas = config.medidas_etiquetas?.[tamanhoSelecionado];
    
    if (!medidas) {
      return (
        <div className="text-center p-8 text-slate-500">
          <p>Medidas não encontradas para o tamanho: {tamanhoSelecionado}</p>
        </div>
      );
    }

    // Renderizar preview real usando as medidas configuradas
    const logoUrlConfig = JSON.parse(localStorage.getItem('configuracoes_erp') || '{}');
    const logoUrl = logoUrlConfig?.empresa?.logo_url;

    return (
      <div className="space-y-4">
        <p className="text-center text-sm text-slate-600 mb-4">
          Preview Realista • Tamanho: <strong>{tamanhoSelecionado}</strong>
        </p>
        
        <div className="flex justify-center">
          <div style={{
            width: tamanhoSelecionado === "40x25_2col" ? "40mm" : tamanhoSelecionado.split('x')[0] + 'mm',
            border: "2px solid #000",
            padding: "0.8mm",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            backgroundColor: "#fff",
            fontFamily: "Arial, sans-serif"
          }}>
            {config.incluir_logo_etiqueta && logoUrl && (
              <img 
                src={logoUrl} 
                alt="Logo"
                style={{
                  maxWidth: medidas.logo_largura_max,
                  maxHeight: medidas.logo_altura_max,
                  marginTop: medidas.logo_margem_top,
                  marginBottom: medidas.logo_margem_bottom,
                  objectFit: "contain",
                  display: "block"
                }}
              />
            )}
            
            <div style={{
              fontSize: medidas.texto_fonte,
              fontWeight: 600,
              lineHeight: medidas.texto_line_height,
              marginTop: medidas.texto_margem_top,
              marginBottom: medidas.texto_margem_bottom,
              maxWidth: "38mm",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}>
              {produtoExemplo.nome}
            </div>

            {config.incluir_preco_etiqueta && (
              <div style={{
                fontSize: medidas.preco_fonte,
                fontWeight: "bold",
                color: "#059669",
                lineHeight: medidas.preco_line_height,
                margin: `${medidas.preco_margem} 0`
              }}>
                R$ {produtoExemplo.preco_venda?.toFixed(2)}
              </div>
            )}

            {config.incluir_sku_etiqueta && (
              <div style={{
                fontFamily: "monospace",
                fontSize: medidas.sku_fonte,
                marginTop: medidas.sku_margem_top,
                lineHeight: medidas.sku_line_height
              }}>
                SKU: {produtoExemplo.sku}
              </div>
            )}

            {config.incluir_codigo_barras_etiqueta && produtoExemplo.codigo_barras && (
              <div style={{
                marginTop: medidas.barcode_margem_top,
                textAlign: "center",
                width: "100%"
              }}>
                <img 
                  src={`https://bwipjs-api.metafloor.com/?bcid=ean13&text=${produtoExemplo.codigo_barras}&scale=2&height=5&includetext`}
                  alt="Barcode"
                  style={{
                    maxWidth: medidas.barcode_largura_max,
                    height: medidas.barcode_altura,
                    objectFit: "contain",
                    margin: "0 auto",
                    display: "block"
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
          <strong>Medidas Aplicadas ({tamanhoSelecionado}):</strong>
          <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-[10px]">
            <div>Logo: {medidas.logo_largura_max} x {medidas.logo_altura_max}</div>
            <div>Texto: {medidas.texto_fonte} (lh: {medidas.texto_line_height})</div>
            <div>Preço: {medidas.preco_fonte} (lh: {medidas.preco_line_height})</div>
            <div>SKU: {medidas.sku_fonte} (lh: {medidas.sku_line_height})</div>
            <div>Barcode: {medidas.barcode_largura_max} x {medidas.barcode_altura}</div>
            <div>Número: {medidas.barcode_numero_fonte}</div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}