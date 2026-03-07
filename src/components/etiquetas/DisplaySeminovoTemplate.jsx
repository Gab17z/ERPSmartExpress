import React from "react";

export default function DisplaySeminovoTemplate({ data, scale = 1 }) {
  const {
    logoUrl = "",
    nomeProduto = "",
    descricao = "",
    precoPix = "",
    precoDebito = "",
    precoPrazo1 = "",
    precoPrazo2 = "",
    precoPrazo3 = "",
    garantia = "",
    itensInclusos = "",
    saudeBateria = "",
    capacidade = "",
    qrcodeUrl = "",
    exibirSeminovo = true
  } = data || {};

  // Função para formatar descrição com quebras de linha (55 chars por linha, máx 22 linhas)
  const formatarDescricao = (texto) => {
    if (!texto) return "";
    const maxCharsPerLine = 55;
    const maxLines = 22;
    const words = texto.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
      if (lines.length >= maxLines) break;
      
      if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          if (lines.length >= maxLines) break;
        }
        if (word.length > maxCharsPerLine) {
          let remaining = word;
          while (remaining.length > 0 && lines.length < maxLines) {
            lines.push(remaining.slice(0, maxCharsPerLine));
            remaining = remaining.slice(maxCharsPerLine);
          }
          currentLine = '';
        } else {
          currentLine = word;
        }
      }
    }
    
    if (currentLine && lines.length < maxLines) {
      lines.push(currentLine);
    }
    
    return lines.join('\n');
  };

  const descricaoFormatada = formatarDescricao(descricao);

  // Template: 10cm x 15cm = 378px x 567px (at 96dpi)
  const baseWidth = 378;
  const baseHeight = 567;

  return (
    <div
      style={{
        width: `${baseWidth * scale}px`,
        height: `${baseHeight * scale}px`,
        backgroundColor: "#fff",
        border: `${2 * scale}px solid #000`,
        borderRadius: `${4 * scale}px`,
        fontFamily: "Arial, sans-serif",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        overflow: "hidden",
        padding: `${3 * scale}px`
      }}
    >
      {/* Logo */}
      <div style={{ 
        textAlign: "center", 
        display: "flex", 
        alignItems: "flex-start", 
        justifyContent: "center",
        marginBottom: `${0}px`
      }}>
        {logoUrl ? (
          <img 
            src={logoUrl} 
            alt="Logo" 
            style={{ 
              maxHeight: `${50 * scale}px`, 
              maxWidth: `${200 * scale}px`,
              objectFit: "contain" 
            }} 
          />
        ) : (
          <div style={{ 
            width: `${160 * scale}px`, 
            height: `${40 * scale}px`, 
            border: `${1 * scale}px dashed #ccc`, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            color: "#999",
            fontSize: `${11 * scale}px`,
            borderRadius: `${4 * scale}px`
          }}>
            LOGO
          </div>
        )}
      </div>

      {/* Nome do Produto */}
      <div style={{
        textAlign: "center",
        fontSize: `${24 * scale}px`,
        fontWeight: "bold",
        marginBottom: `${0}px`,
        lineHeight: 1.1,
        color: "#000"
      }}>
        {nomeProduto || ""}
      </div>

      {/* SEMINOVO */}
      {exibirSeminovo && (
        <div style={{
          textAlign: "center",
          fontSize: `${10 * scale}px`,
          fontWeight: "normal",
          color: "#555",
          marginBottom: `${1 * scale}px`,
          letterSpacing: `${2 * scale}px`
        }}>
          SEMINOVO
        </div>
      )}

      {/* Descrição - Caixa grande */}
      <div style={{
        border: `${2 * scale}px solid #000`,
        borderRadius: `${12 * scale}px`,
        padding: `${6 * scale}px ${8 * scale}px`,
        fontSize: `${8.5 * scale}px`,
        lineHeight: 1.35,
        flex: 1,
        marginBottom: `${4 * scale}px`,
        overflow: "hidden",
        color: "#000"
      }}>
        <span style={{ fontWeight: "bold", fontSize: `${9 * scale}px` }}>Descrição:</span>
        {descricao && (
          <div style={{ 
            marginTop: `${3 * scale}px`,
            overflow: "hidden",
            lineHeight: 1.15
          }}>
            {descricao.split('\n').map((paragrafo, idx) => (
              <p key={idx} style={{
                margin: `0 0 ${4 * scale}px 0`,
                textAlign: "justify",
                textJustify: "inter-word",
                wordBreak: "break-word"
              }}>
                {paragrafo}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Formas de Pagamento */}
      <div style={{
        border: `${2 * scale}px solid #000`,
        borderRadius: `${12 * scale}px`,
        padding: `${6 * scale}px`,
        marginBottom: `${4 * scale}px`
      }}>
        <div style={{
          fontSize: `${9 * scale}px`,
          fontWeight: "bold",
          marginBottom: `${6 * scale}px`,
          color: "#000"
        }}>
          Formas de Pagamento
        </div>
        <div style={{
          display: "flex",
          gap: `${6 * scale}px`
        }}>
          {/* PIX */}
          <div style={{
            border: `${2 * scale}px solid #000`,
            borderRadius: `${12 * scale}px`,
            padding: `${8 * scale}px ${6 * scale}px`,
            textAlign: "center",
            flex: 1,
            minHeight: `${55 * scale}px`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start"
          }}>
            <div style={{ 
              fontSize: `${8 * scale}px`, 
              fontWeight: "bold",
              marginBottom: `${6 * scale}px`,
              color: "#000"
            }}>
              NO PIX:
            </div>
            <div style={{ 
              fontSize: `${18 * scale}px`, 
              fontWeight: "bold",
              color: "#000"
            }}>
              {precoPix ? `R$${precoPix}` : ""}
            </div>
          </div>

          {/* DÉBITO */}
          <div style={{
            border: `${2 * scale}px solid #000`,
            borderRadius: `${12 * scale}px`,
            padding: `${8 * scale}px ${6 * scale}px`,
            textAlign: "center",
            flex: 1,
            minHeight: `${55 * scale}px`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start"
          }}>
            <div style={{ 
              fontSize: `${8 * scale}px`, 
              fontWeight: "bold",
              marginBottom: `${6 * scale}px`,
              color: "#000"
            }}>
              NO DÉBITO:
            </div>
            <div style={{ 
              fontSize: `${18 * scale}px`, 
              fontWeight: "bold",
              color: "#000"
            }}>
              {precoDebito ? `R$${precoDebito}` : ""}
            </div>
          </div>

          {/* À PRAZO */}
          <div style={{
            border: `${2 * scale}px solid #000`,
            borderRadius: `${12 * scale}px`,
            padding: `${8 * scale}px ${6 * scale}px`,
            textAlign: "center",
            flex: 1,
            minHeight: `${55 * scale}px`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start"
          }}>
            <div style={{ 
              fontSize: `${8 * scale}px`, 
              fontWeight: "bold",
              marginBottom: `${4 * scale}px`,
              color: "#000"
            }}>
              À PRAZO:
            </div>
            <div style={{ fontSize: `${7.5 * scale}px`, lineHeight: 1.3, color: "#000", textAlign: "right", paddingRight: `${2 * scale}px` }}>
              {precoPrazo1 && <div>{precoPrazo1}</div>}
              {precoPrazo2 && <div>{precoPrazo2}</div>}
              {precoPrazo3 && <div>{precoPrazo3}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Área Inferior - Infos + QR Code */}
      <div style={{
        border: `${2 * scale}px solid #000`,
        borderRadius: `${12 * scale}px`,
        padding: `${6 * scale}px ${8 * scale}px`,
        display: "flex",
        gap: `${8 * scale}px`,
        alignItems: "center"
      }}>
        {/* Lado Esquerdo - Infos */}
        <div style={{ 
          flex: 1, 
          fontSize: `${8.5 * scale}px`,
          lineHeight: 1.7,
          color: "#000"
        }}>
          <div><strong>Garantia:</strong> {garantia || ""}</div>
          <div><strong>Itens incluso:</strong> {itensInclusos || ""}</div>
          <div><strong>Saúde da Bateria:</strong> {saudeBateria || ""}</div>
          <div><strong>Capacidade:</strong> {capacidade || ""}</div>
        </div>

        {/* Lado Direito - QR Code */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}>
          <div style={{
            width: `${75 * scale}px`,
            height: `${75 * scale}px`,
            border: qrcodeUrl ? "none" : `${2 * scale}px solid #000`,
            borderRadius: `${4 * scale}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: `${4 * scale}px`,
            overflow: "hidden"
          }}>
            {qrcodeUrl ? (
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrcodeUrl)}`}
                alt="QR Code"
                style={{ 
                  width: `${75 * scale}px`, 
                  height: `${75 * scale}px` 
                }}
              />
            ) : (
              <div style={{ 
                fontSize: `${8 * scale}px`, 
                color: "#999",
                textAlign: "center"
              }}>
                QR CODE
              </div>
            )}
          </div>
          <div style={{ 
            fontSize: `${7.5 * scale}px`, 
            textAlign: "center",
            color: "#000",
            fontWeight: "bold"
          }}>
            Acesse nosso Instagram
          </div>
        </div>
      </div>
    </div>
  );
}