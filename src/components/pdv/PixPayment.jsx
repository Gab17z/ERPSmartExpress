import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle, Copy, QrCode, CreditCard } from "lucide-react";
import { toast } from "sonner";

export default function PixPayment({ open, onClose, valor, onSuccess, onReject }) {
  const [configuracoes, setConfiguracoes] = useState(null);
  const [metodoPix, setMetodoPix] = useState(null); // 'fixo' ou 'integracao'
  const [processando, setProcessando] = useState(false);
  const [pixData, setPixData] = useState(null);
  const [status, setStatus] = useState("aguardando"); // aguardando, verificando, aprovado, recusado
  const [monitorSecundario, setMonitorSecundario] = useState(null);

  useEffect(() => {
    if (!open) {
      // Reset ao fechar
      setMetodoPix(null);
      setPixData(null);
      setStatus("aguardando");
      setProcessando(false);
      return;
    }

    const config = localStorage.getItem('configuracoes_erp');
    if (config) {
      const parsed = JSON.parse(config);
      setConfiguracoes(parsed);
      
      // NÃO auto-selecionar método - sempre mostrar escolha
      setMetodoPix(null);
    }
  }, [open]);

  useEffect(() => {
    if (metodoPix === 'integracao' && open) {
      gerarPixIntegracao();
    }
  }, [metodoPix, open]);

  const gerarPixIntegracao = async () => {
    setProcessando(true);
    try {
      // Tentar Mercado Pago primeiro
      const response = await base44.functions.invoke('mercadoPagoCheckout', {
        items: [{ nome: "Venda PDV", quantidade: 1, preco: valor }],
        payer: {
          nome: "Cliente",
          email: "cliente@email.com",
          telefone: "11999999999",
          cpf: "00000000000"
        },
        external_reference: `PIX-${Date.now()}`
      });

      if (response.data.qr_code || response.data.init_point) {
        setPixData({
          qr_code: response.data.qr_code || response.data.init_point,
          qr_code_base64: response.data.qr_code_base64,
          payment_id: response.data.preference_id
        });

        // Abrir monitor secundário se configurado
        if (configuracoes?.pdv?.pix_monitor_secundario) {
          abrirMonitorSecundario(response.data.qr_code || response.data.init_point);
        }

        // Iniciar verificação de status
        iniciarVerificacaoPagamento(response.data.preference_id);
      }
    } catch (error) {
      console.error("Erro ao gerar PIX:", error);
      toast.error("Erro ao gerar PIX. Use PIX manual.");
      setMetodoPix('fixo');
    } finally {
      setProcessando(false);
    }
  };

  const abrirMonitorSecundario = (qrCode) => {
    const features = 'width=800,height=600,left=0,top=0';
    const monitor = window.open('', 'PixMonitor', features);
    
    if (monitor) {
      monitor.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>PIX - Aguardando Pagamento</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }
            .container {
              text-align: center;
              background: white;
              padding: 40px;
              border-radius: 20px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }
            .qr-container {
              background: white;
              padding: 20px;
              border-radius: 15px;
              display: inline-block;
              margin: 20px 0;
            }
            h1 {
              color: #333;
              margin-bottom: 10px;
            }
            .valor {
              font-size: 48px;
              font-weight: bold;
              color: #667eea;
              margin: 20px 0;
            }
            .instrucoes {
              color: #666;
              margin-top: 20px;
              font-size: 18px;
            }
            .loading {
              margin-top: 20px;
              color: #667eea;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔵 Escaneie o QR Code</h1>
            <div class="valor">R$ ${valor.toFixed(2)}</div>
            <div class="qr-container" id="qrcode"></div>
            <div class="instrucoes">
              Abra o app do seu banco<br>
              Escaneie o código acima<br>
              <strong>Aguarde a confirmação...</strong>
            </div>
            <div class="loading">⏳ Aguardando pagamento...</div>
          </div>
          <script src="https://unpkg.com/qrcode@1.5.3/build/qrcode.min.js"></script>
          <script>
            QRCode.toCanvas(document.getElementById('qrcode'), '${qrCode}', {
              width: 300,
              margin: 2
            });
          </script>
        </body>
        </html>
      `);
      monitor.document.close();
      setMonitorSecundario(monitor);
    }
  };

  const iniciarVerificacaoPagamento = (paymentId) => {
    setStatus("verificando");
    
    // Simular verificação (em produção, usar webhook ou polling)
    const interval = setInterval(async () => {
      try {
        // Aqui você faria uma chamada real para verificar o status
        // const response = await base44.functions.invoke('verificarPagamento', { paymentId });
        
        // Por enquanto, vou simular
        // Em produção, o webhook do Mercado Pago/Infinite Pay atualizaria o status
        
      } catch (error) {
        console.error("Erro ao verificar pagamento:", error);
      }
    }, 3000);

    // Guardar interval para limpar depois
    window.pixVerificationInterval = interval;
  };

  const confirmarPagamento = () => {
    if (window.pixVerificationInterval) {
      clearInterval(window.pixVerificationInterval);
    }
    
    if (monitorSecundario && !monitorSecundario.closed) {
      monitorSecundario.close();
    }
    
    setStatus("aprovado");
    toast.success("💚 Pagamento confirmado!");
    onSuccess();
  };

  const recusarPagamento = () => {
    if (window.pixVerificationInterval) {
      clearInterval(window.pixVerificationInterval);
    }
    
    if (monitorSecundario && !monitorSecundario.closed) {
      monitorSecundario.close();
    }
    
    setStatus("recusado");
    toast.error("❌ Pagamento não confirmado");
    onReject();
  };

  const copiarCodigoPix = () => {
    if (metodoPix === 'fixo' && configuracoes?.pdv?.pix_chave) {
      navigator.clipboard.writeText(configuracoes.pdv.pix_chave);
      toast.success("Chave PIX copiada!");
    } else if (pixData?.qr_code) {
      navigator.clipboard.writeText(pixData.qr_code);
      toast.success("Código PIX copiado!");
    }
  };

  const handleClose = () => {
    if (window.pixVerificationInterval) {
      clearInterval(window.pixVerificationInterval);
    }
    if (monitorSecundario && !monitorSecundario.closed) {
      monitorSecundario.close();
    }
    onClose();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-6 h-6 text-blue-600" />
            Pagamento via PIX - R$ {valor.toFixed(2)}
          </DialogTitle>
        </DialogHeader>

        {!metodoPix && (
          <div className="space-y-4">
            <p className="text-center text-slate-600">Escolha o método de pagamento PIX:</p>
            <div className="grid grid-cols-2 gap-4">
              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-500"
                onClick={() => setMetodoPix('fixo')}
              >
                <CardContent className="p-6 text-center">
                  <QrCode className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                  <h3 className="font-bold mb-2">PIX Fixo</h3>
                  <p className="text-sm text-slate-600">Chave PIX da loja</p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-purple-500"
                onClick={() => setMetodoPix('integracao')}
              >
                <CardContent className="p-6 text-center">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 text-purple-600" />
                  <h3 className="font-bold mb-2">PIX Integrado</h3>
                  <p className="text-sm text-slate-600">Via Mercado Pago</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {metodoPix === 'fixo' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-4">
                R$ {valor.toFixed(2)}
              </div>
              
              {configuracoes?.pdv?.pix_qrcode_imagem ? (
                <div className="bg-white rounded-lg p-4 mb-4">
                  <img 
                    src={configuracoes.pdv.pix_qrcode_imagem} 
                    alt="QR Code PIX Fixo" 
                    className="w-64 h-64 object-contain mx-auto mb-3"
                  />
                  <p className="text-sm text-slate-600">
                    Escaneie o QR Code acima
                  </p>
                </div>
              ) : (
                <QrCode className="w-16 h-16 mx-auto mb-4 text-blue-600" />
              )}
              
              {configuracoes?.pdv?.pix_chave && (
                <div className="bg-white rounded-lg p-4 mb-4">
                  <Label className="text-sm text-slate-600">Chave PIX:</Label>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <code className="bg-slate-100 px-4 py-2 rounded font-mono text-sm">
                      {configuracoes.pdv.pix_chave}
                    </code>
                    <Button variant="outline" size="sm" onClick={copiarCodigoPix}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {configuracoes?.pdv?.pix_beneficiario && (
                <p className="text-sm text-slate-600 mb-4">
                  Beneficiário: <strong>{configuracoes.pdv.pix_beneficiario}</strong>
                </p>
              )}

              <div className="text-sm text-slate-600 mt-4">
                Cliente deve fazer o PIX manualmente<br/>
                Após confirmação, clique em "Confirmar Pagamento"
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={recusarPagamento} className="flex-1">
                <XCircle className="w-4 h-4 mr-2" />
                Não Recebido
              </Button>
              <Button onClick={confirmarPagamento} className="flex-1 bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Confirmar Pagamento
              </Button>
            </div>
          </div>
        )}

        {metodoPix === 'integracao' && (
          <div className="space-y-4">
            {processando ? (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-slate-600">Gerando PIX...</p>
              </div>
            ) : pixData ? (
              <>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-purple-600 mb-4">
                  R$ {valor.toFixed(2)}
                </div>

                {pixData.qr_code_base64 ? (
                  <div className="bg-white p-4 rounded-lg inline-block mb-4">
                    <img src={pixData.qr_code_base64} alt="QR Code PIX" className="w-64 h-64" />
                  </div>
                ) : (
                  <div className="bg-white p-4 rounded-lg mb-4">
                    <div className="w-64 h-64 bg-slate-100 flex items-center justify-center mx-auto">
                      <QrCode className="w-20 h-20 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-600 mt-3">
                      Use o código PIX Copia e Cola abaixo
                    </p>
                  </div>
                )}

                <Button variant="outline" onClick={copiarCodigoPix} className="mb-4">
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Código PIX
                </Button>

                  {configuracoes?.pdv?.pix_monitor_secundario && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-900">
                      📺 QR Code exibido no monitor secundário
                    </div>
                  )}

                  <div className="text-sm text-slate-600 mt-4">
                    {status === "verificando" ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Aguardando confirmação do pagamento...
                      </div>
                    ) : (
                      "Escaneie o QR Code ou copie o código PIX"
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={recusarPagamento} className="flex-1" disabled={status === "verificando"}>
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button onClick={confirmarPagamento} className="flex-1 bg-green-600 hover:bg-green-700">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Confirmar Pagamento
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                <p className="text-slate-600">Erro ao gerar PIX</p>
                <Button onClick={() => setMetodoPix(null)} className="mt-4">
                  Tentar Novamente
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}