import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { MessageSquare, CreditCard, Store, ExternalLink, Settings, Check, AlertCircle, Phone, Mail, Globe, ShoppingBag, Package, DollarSign, QrCode, Loader2, WifiOff, Wifi } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

export default function Integracoes() {
  const [dialogTesteMP, setDialogTesteMP] = useState(false);
  const [dialogTesteIP, setDialogTesteIP] = useState(false);
  const [testando, setTestando] = useState(false);
  const [dialogWhatsApp, setDialogWhatsApp] = useState(false);
  const [valorTeste, setValorTeste] = useState("100.00");

  // Estados para conexão WhatsApp
  const [whatsappStatus, setWhatsappStatus] = useState('checking');
  const [whatsappNumber, setWhatsappNumber] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [conectando, setConectando] = useState(false);

  // Verificar status do WhatsApp ao abrir dialog
  useEffect(() => {
    if (dialogWhatsApp) {
      checkWhatsAppStatus();
    }
  }, [dialogWhatsApp]);

  const checkWhatsAppStatus = async () => {
    setWhatsappStatus('checking');
    try {
      const status = await base44.whatsapp.getStatus();
      setWhatsappStatus(status.status || 'disconnected');
      setWhatsappNumber(status.number || null);

      if (status.status === 'qr_ready') {
        const qrData = await base44.whatsapp.getQRCode();
        if (qrData.qr) {
          setQrCode(qrData.qr);
        }
      }
    } catch (error) {
      setWhatsappStatus('offline');
    }
  };

  const conectarWhatsApp = async () => {
    setConectando(true);
    try {
      const result = await base44.whatsapp.connect();
      if (result.success) {
        toast.success("Iniciando conexão... Aguarde o QR Code!");
        // Aguardar um pouco e verificar status
        setTimeout(checkWhatsAppStatus, 2000);
      } else {
        toast.error(result.error || "Erro ao conectar");
      }
    } catch (error) {
      toast.error("Servidor WhatsApp não disponível. Inicie o servidor primeiro.");
    } finally {
      setConectando(false);
    }
  };

  const desconectarWhatsApp = async () => {
    try {
      const result = await base44.whatsapp.disconnect();
      if (result.success) {
        toast.success("WhatsApp desconectado!");
        setWhatsappStatus('disconnected');
        setWhatsappNumber(null);
        setQrCode(null);
      }
    } catch (error) {
      toast.error("Erro ao desconectar");
    }
  };

  const testarMercadoPago = async () => {
    setTestando(true);
    try {
      const response = await base44.functions.invoke('mercadoPagoCheckout', {
        items: [{ nome: "Produto Teste", quantidade: 1, preco: parseFloat(valorTeste) }],
        payer: {
          nome: "Cliente Teste",
          email: "teste@email.com",
          telefone: "11999999999",
          cpf: "00000000000"
        },
        external_reference: `TEST-${Date.now()}`
      });

      if (response.data.init_point) {
        window.open(response.data.init_point, '_blank');
        toast.success("Link de pagamento criado!");
      }
    } catch (error) {
      toast.error("Erro: " + (error.response?.data?.error || error.message));
    } finally {
      setTestando(false);
    }
  };

  const testarInfinitePay = async () => {
    setTestando(true);
    try {
      const response = await base44.functions.invoke('infinitePayCheckout', {
        amount: parseFloat(valorTeste),
        customer: {
          nome: "Cliente Teste",
          email: "teste@email.com",
          telefone: "11999999999",
          cpf: "00000000000"
        },
        order_id: `TEST-${Date.now()}`
      });

      if (response.data.payment_link) {
        window.open(response.data.payment_link, '_blank');
        toast.success("Link de pagamento criado!");
      }
    } catch (error) {
      toast.error("Erro: " + (error.response?.data?.error || error.message));
    } finally {
      setTestando(false);
    }
  };

  const integracoes = [
    {
      nome: "WhatsApp Chatbot",
      descricao: "Atendimento automatizado 24/7 com IA",
      icone: MessageSquare,
      cor: "green",
      status: "ativo",
      recursos: [
        "Consulta de produtos e preços em tempo real",
        "Status de OS com atualizações automáticas",
        "Agendamento de serviços",
        "Orçamentos instantâneos",
        "Suporte multilíngue",
        "Transferência para atendente humano",
        "Histórico de conversas",
        "Respostas personalizadas"
      ],
      acao: () => setDialogWhatsApp(true),
      textoBotao: "Conectar WhatsApp"
    },
    {
      nome: "Mercado Pago",
      descricao: "Gateway de pagamento líder no Brasil",
      icone: CreditCard,
      cor: "blue",
      status: "configurado",
      recursos: [
        "PIX com confirmação automática",
        "Cartão de crédito parcelado sem juros",
        "Boleto bancário",
        "Split de pagamento automático",
        "Dashboard completo de vendas",
        "Proteção contra fraudes",
        "Checkout transparente",
        "Link de pagamento rápido"
      ],
      config: ["MERCADO_PAGO_ACCESS_TOKEN"],
      acao: () => setDialogTesteMP(true),
      textoBotao: "Testar Integração",
      docs: "https://www.mercadopago.com.br/developers/pt/docs"
    },
    {
      nome: "Infinite Pay",
      descricao: "Pagamentos simplificados com taxas competitivas",
      icone: CreditCard,
      cor: "purple",
      status: "configurado",
      recursos: [
        "PIX instantâneo",
        "Link de pagamento único",
        "Cartão de crédito e débito",
        "Webhooks em tempo real",
        "API RESTful completa",
        "Painel administrativo",
        "Recorrência automática",
        "Taxas reduzidas"
      ],
      config: ["INFINITE_PAY_CLIENT_ID", "INFINITE_PAY_CLIENT_SECRET"],
      acao: () => setDialogTesteIP(true),
      textoBotao: "Testar Integração",
      docs: "https://developers.infinitepay.io"
    },
    {
      nome: "Loja Online (E-commerce)",
      descricao: "Venda online com catálogo completo",
      icone: Store,
      cor: "orange",
      status: "ativo",
      recursos: [
        "Catálogo público de produtos",
        "Carrinho de compras inteligente",
        "Checkout com múltiplas formas de pagamento",
        "Gestão completa de pedidos",
        "Integração automática com estoque",
        "Rastreamento de entregas",
        "Cupons de desconto",
        "Avaliações de produtos"
      ],
      acao: () => window.open(createPageUrl("Marketplace"), '_blank'),
      textoBotao: "Acessar Loja",
      link: createPageUrl("Marketplace")
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integrações</h1>
        <p className="text-slate-500">Conecte seu sistema com outras plataformas e potencialize suas vendas</p>
      </div>

      {/* Status Geral */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <Check className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">Sistema Integrado</h3>
              <p className="text-sm text-slate-600">
                {integracoes.filter(i => i.status === 'ativo' || i.status === 'configurado').length} de {integracoes.length} integrações ativas
              </p>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-green-600">Pagamentos OK</Badge>
              <Badge className="bg-blue-600">WhatsApp OK</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="todas" className="space-y-6">
        <TabsList>
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
          <TabsTrigger value="comunicacao">Comunicação</TabsTrigger>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
        </TabsList>

        <TabsContent value="todas" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {integracoes.map((integracao, idx) => {
              const Icon = integracao.icone;
              const corClasses = {
                green: 'border-green-200 hover:shadow-green-100',
                blue: 'border-blue-200 hover:shadow-blue-100',
                purple: 'border-purple-200 hover:shadow-purple-100',
                orange: 'border-orange-200 hover:shadow-orange-100'
              };

              return (
                <Card key={idx} className={`${corClasses[integracao.cor]} hover:shadow-xl transition-all duration-300`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 bg-${integracao.cor}-100 rounded-xl flex items-center justify-center`}>
                          <Icon className={`w-6 h-6 text-${integracao.cor}-600`} />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{integracao.nome}</CardTitle>
                          <CardDescription className="text-xs">{integracao.descricao}</CardDescription>
                        </div>
                      </div>
                      <Badge className={integracao.status === 'ativo' ? 'bg-green-600' : 'bg-blue-600'}>
                        {integracao.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className={`bg-${integracao.cor}-50 border border-${integracao.cor}-200 rounded-lg p-4`}>
                      <p className={`text-xs text-${integracao.cor}-900 font-semibold mb-3`}>✨ Recursos Principais:</p>
                      <ul className={`text-xs text-${integracao.cor}-800 space-y-1.5`}>
                        {integracao.recursos.slice(0, 6).map((recurso, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Check className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{recurso}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {integracao.config && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-xs text-amber-900 font-semibold mb-2">🔐 Configuração Necessária:</p>
                        {integracao.config.map((cfg, i) => (
                          <code key={i} className="block bg-amber-100 px-2 py-1 rounded mt-1 text-xs">
                            {cfg}
                          </code>
                        ))}
                        <p className="text-xs text-amber-700 mt-2">Configure em Configurações → Variáveis de Ambiente</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button onClick={integracao.acao} className={`flex-1 bg-${integracao.cor}-600 hover:bg-${integracao.cor}-700`}>
                        <Icon className="w-4 h-4 mr-2" />
                        {integracao.textoBotao}
                      </Button>
                      {integracao.docs && (
                        <Button variant="outline" onClick={() => window.open(integracao.docs, '_blank')} size="icon">
                          <Globe className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="pagamentos">
          <div className="space-y-6">
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <DollarSign className="w-10 h-10 text-blue-600" />
                  <div>
                    <h3 className="font-bold text-lg">Gateways de Pagamento</h3>
                    <p className="text-sm text-slate-600">Aceite pagamentos online com segurança</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-white rounded-lg border">
                    <p className="text-xs text-slate-500">PIX</p>
                    <p className="font-bold text-green-600">✓ Ativo</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border">
                    <p className="text-xs text-slate-500">Cartão</p>
                    <p className="font-bold text-blue-600">✓ Ativo</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border">
                    <p className="text-xs text-slate-500">Boleto</p>
                    <p className="font-bold text-purple-600">✓ Ativo</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {integracoes.filter(i => i.icone === CreditCard).map((integracao, idx) => {
                const Icon = integracao.icone;
                return (
                  <Card key={idx} className={`border-${integracao.cor}-200 hover:shadow-xl transition-shadow`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Icon className={`w-5 h-5 text-${integracao.cor}-600`} />
                          {integracao.nome}
                        </CardTitle>
                        <Badge className={`bg-${integracao.cor}-600`}>{integracao.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-slate-600">{integracao.descricao}</p>
                      
                      <div className={`bg-${integracao.cor}-50 border border-${integracao.cor}-200 rounded-lg p-4`}>
                        <p className={`text-xs text-${integracao.cor}-900 font-semibold mb-3`}>Recursos:</p>
                        <ul className={`text-xs text-${integracao.cor}-800 space-y-1.5`}>
                          {integracao.recursos.map((recurso, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <Check className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span>{recurso}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {integracao.config && (
                        <div className="bg-slate-100 border rounded-lg p-3">
                          <p className="text-xs font-semibold mb-2">Configuração:</p>
                          {integracao.config.map((cfg, i) => (
                            <code key={i} className="block bg-white px-2 py-1 rounded text-xs font-mono mb-1">
                              {cfg}
                            </code>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button onClick={integracao.acao} className={`flex-1 bg-${integracao.cor}-600`}>
                          {integracao.textoBotao}
                        </Button>
                        {integracao.docs && (
                          <Button variant="outline" onClick={() => window.open(integracao.docs, '_blank')}>
                            <Globe className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="comunicacao">
          <Card className="border-green-200 hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                    <MessageSquare className="w-7 h-7 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">WhatsApp Business</CardTitle>
                    <CardDescription>Central de atendimento automatizado</CardDescription>
                  </div>
                </div>
                <Badge className="bg-green-600 text-white">✓ Ativo</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <MessageSquare className="w-6 h-6 text-green-600 mb-2" />
                  <p className="text-sm font-semibold">Chatbot Inteligente</p>
                  <p className="text-xs text-slate-600 mt-1">Respostas automáticas 24/7</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Phone className="w-6 h-6 text-blue-600 mb-2" />
                  <p className="text-sm font-semibold">Atendimento Humano</p>
                  <p className="text-xs text-slate-600 mt-1">Transferência inteligente</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <ShoppingBag className="w-6 h-6 text-purple-600 mb-2" />
                  <p className="text-sm font-semibold">Catálogo Digital</p>
                  <p className="text-xs text-slate-600 mt-1">Produtos no WhatsApp</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <Package className="w-6 h-6 text-orange-600 mb-2" />
                  <p className="text-sm font-semibold">Status de OS</p>
                  <p className="text-xs text-slate-600 mt-1">Acompanhamento em tempo real</p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-3">🤖 Recursos do Chatbot:</h4>
                <ul className="text-sm text-green-800 space-y-2">
                  {integracoes[0].recursos.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setDialogWhatsApp(true)} className="flex-1 bg-green-600 hover:bg-green-700">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Conectar Meu WhatsApp
                </Button>
                <Button variant="outline" onClick={() => window.open(createPageUrl("ChatbotConfig"), '_self')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Configurar Bot
                </Button>
                <Button variant="outline" onClick={() => window.open(createPageUrl("AdmWhatsApp"), '_self')}>
                  <Phone className="w-4 h-4 mr-2" />
                  Painel ADM
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendas">
          <Card className="border-orange-200 hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Store className="w-7 h-7 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">E-commerce Integrado</CardTitle>
                    <CardDescription>Sua loja online completa</CardDescription>
                  </div>
                </div>
                <Badge className="bg-orange-600">✓ Ativo</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <Package className="w-6 h-6 text-orange-600 mb-2" />
                  <p className="text-sm font-semibold">Catálogo Online</p>
                  <p className="text-xs text-slate-600 mt-1">Produtos sempre atualizados</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <ShoppingBag className="w-6 h-6 text-blue-600 mb-2" />
                  <p className="text-sm font-semibold">Carrinho</p>
                  <p className="text-xs text-slate-600 mt-1">Experiência otimizada</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <CreditCard className="w-6 h-6 text-green-600 mb-2" />
                  <p className="text-sm font-semibold">Checkout</p>
                  <p className="text-xs text-slate-600 mt-1">Múltiplos pagamentos</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <Globe className="w-6 h-6 text-purple-600 mb-2" />
                  <p className="text-sm font-semibold">Estoque Sync</p>
                  <p className="text-xs text-slate-600 mt-1">Integração automática</p>
                </div>
              </div>

              <Button 
                onClick={() => window.open(createPageUrl("Marketplace"), '_blank')}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Acessar Minha Loja Online
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog WhatsApp */}
      <Dialog open={dialogWhatsApp} onOpenChange={setDialogWhatsApp}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <MessageSquare className="w-6 h-6 text-green-600" />
              WhatsApp Chatbot - Atendimento Automatizado
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Status da Conexão WhatsApp */}
            <Card className={`border-2 ${
              whatsappStatus === 'connected' ? 'bg-green-50 border-green-300' :
              whatsappStatus === 'qr_ready' ? 'bg-yellow-50 border-yellow-300' :
              whatsappStatus === 'checking' ? 'bg-blue-50 border-blue-300' :
              'bg-slate-50 border-slate-300'
            }`}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    whatsappStatus === 'connected' ? 'bg-green-600' :
                    whatsappStatus === 'qr_ready' ? 'bg-yellow-500' :
                    whatsappStatus === 'checking' ? 'bg-blue-500' :
                    'bg-slate-400'
                  }`}>
                    {whatsappStatus === 'connected' ? <Wifi className="w-6 h-6 text-white" /> :
                     whatsappStatus === 'qr_ready' ? <QrCode className="w-6 h-6 text-white" /> :
                     whatsappStatus === 'checking' ? <Loader2 className="w-6 h-6 text-white animate-spin" /> :
                     <WifiOff className="w-6 h-6 text-white" />}
                  </div>
                  <div className="flex-1">
                    {whatsappStatus === 'connected' ? (
                      <>
                        <h3 className="font-bold text-lg text-green-900 mb-2">WhatsApp Conectado!</h3>
                        <p className="text-sm text-green-800 mb-2">
                          Número: <strong>{whatsappNumber}</strong>
                        </p>
                        <p className="text-sm text-green-700 mb-4">
                          Seu assistente virtual está ativo e pronto para atender clientes.
                        </p>
                        <Button onClick={desconectarWhatsApp} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                          <WifiOff className="w-4 h-4 mr-2" />
                          Desconectar
                        </Button>
                      </>
                    ) : whatsappStatus === 'qr_ready' && qrCode ? (
                      <>
                        <h3 className="font-bold text-lg text-yellow-900 mb-2">Escaneie o QR Code</h3>
                        <p className="text-sm text-yellow-800 mb-4">
                          Abra o WhatsApp no celular, vá em Aparelhos Conectados e escaneie o código abaixo.
                        </p>
                        <div className="bg-white p-4 rounded-lg inline-block border">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`}
                            alt="QR Code WhatsApp"
                            className="w-48 h-48"
                          />
                        </div>
                        <p className="text-xs text-yellow-700 mt-2">
                          O QR Code expira em alguns segundos. Clique em "Atualizar" se precisar de um novo.
                        </p>
                        <Button onClick={checkWhatsAppStatus} variant="outline" className="mt-2">
                          Atualizar QR Code
                        </Button>
                      </>
                    ) : whatsappStatus === 'checking' ? (
                      <>
                        <h3 className="font-bold text-lg text-blue-900 mb-2">Verificando conexão...</h3>
                        <p className="text-sm text-blue-800">
                          Aguarde enquanto verificamos o status do servidor WhatsApp.
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="font-bold text-lg text-slate-900 mb-2">WhatsApp Desconectado</h3>
                        <p className="text-sm text-slate-700 mb-4">
                          Clique no botão abaixo para conectar seu WhatsApp e ativar o chatbot.
                        </p>
                        <div className="space-y-2">
                          <Button onClick={conectarWhatsApp} className="bg-green-600 hover:bg-green-700" disabled={conectando}>
                            {conectando ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Conectando...</>
                            ) : (
                              <><Phone className="w-4 h-4 mr-2" /> Conectar WhatsApp</>
                            )}
                          </Button>
                          <p className="text-xs text-slate-500">
                            Certifique-se de que o servidor WhatsApp (whatsapp-server) está rodando.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  Funcionalidades Principais:
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5" />
                    <span>Consulta instantânea de produtos e preços</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5" />
                    <span>Verificação de disponibilidade em estoque</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5" />
                    <span>Acompanhamento de status de OS em tempo real</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5" />
                    <span>Agendamento inteligente de reparos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5" />
                    <span>Informações sobre garantia e políticas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5" />
                    <span>Geração automática de orçamentos</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-purple-600" />
                  Recursos Avançados:
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-purple-600 mt-0.5" />
                    <span>Respostas personalizadas por contexto</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-purple-600 mt-0.5" />
                    <span>Transferência inteligente para atendentes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-purple-600 mt-0.5" />
                    <span>Múltiplos atendimentos simultâneos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-purple-600 mt-0.5" />
                    <span>Horário de funcionamento configurável</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-purple-600 mt-0.5" />
                    <span>Coleta automática de dados do cliente</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-purple-600 mt-0.5" />
                    <span>Histórico completo de conversas</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">📊 Gerenciamento Completo</h4>
              <p className="text-sm text-blue-800 mb-3">
                Acesse o painel administrativo para visualizar conversas, organizar pastas, aplicar etiquetas e muito mais.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.open(createPageUrl("ChatbotConfig"), '_self')} className="flex-1">
                  <Settings className="w-4 h-4 mr-2" />
                  Configurar Respostas
                </Button>
                <Button variant="outline" onClick={() => window.open(createPageUrl("AdmWhatsApp"), '_self')} className="flex-1">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Painel de Conversas
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Teste Mercado Pago */}
      <Dialog open={dialogTesteMP} onOpenChange={setDialogTesteMP}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Testar Mercado Pago
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <p className="text-sm text-blue-900 mb-2">
                🔐 <strong>Configuração Necessária:</strong>
              </p>
              <p className="text-sm text-blue-800 mb-3">
                Configure o token nas Variáveis de Ambiente (Configurações do App):
              </p>
              <code className="bg-blue-100 px-3 py-2 rounded block text-sm font-mono">
                MERCADO_PAGO_ACCESS_TOKEN
              </code>
            </div>

            <div>
              <Label>Valor de Teste (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={valorTeste}
                onChange={(e) => setValorTeste(e.target.value)}
                onFocus={(e) => e.target.select()}
                className="text-xl font-bold"
              />
            </div>

            <div className="bg-slate-50 border rounded-lg p-3">
              <p className="text-xs text-slate-600">
                💡 <strong>Como testar:</strong> Isso criará um link de pagamento de teste. 
                Use os cartões de teste do Mercado Pago para simular transações.
              </p>
              <a 
                href="https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/test-cards" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline mt-2 inline-block"
              >
                Ver cartões de teste →
              </a>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogTesteMP(false)}>
              Cancelar
            </Button>
            <Button onClick={testarMercadoPago} disabled={testando} className="bg-blue-600">
              {testando ? "Processando..." : "Criar Link de Pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Teste Infinite Pay */}
      <Dialog open={dialogTesteIP} onOpenChange={setDialogTesteIP}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              Testar Infinite Pay
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
              <p className="text-sm text-purple-900 mb-2">
                🔐 <strong>Configuração Necessária:</strong>
              </p>
              <p className="text-sm text-purple-800 mb-3">
                Configure nas Variáveis de Ambiente:
              </p>
              <div className="space-y-1">
                <code className="bg-purple-100 px-3 py-2 rounded block text-sm font-mono">
                  INFINITE_PAY_CLIENT_ID
                </code>
                <code className="bg-purple-100 px-3 py-2 rounded block text-sm font-mono">
                  INFINITE_PAY_CLIENT_SECRET
                </code>
              </div>
            </div>

            <div>
              <Label>Valor de Teste (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={valorTeste}
                onChange={(e) => setValorTeste(e.target.value)}
                onFocus={(e) => e.target.select()}
                className="text-xl font-bold"
              />
            </div>

            <div className="bg-slate-50 border rounded-lg p-3">
              <p className="text-xs text-slate-600">
                💡 Isso criará um link de pagamento na plataforma Infinite Pay para você testar a integração.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogTesteIP(false)}>
              Cancelar
            </Button>
            <Button onClick={testarInfinitePay} disabled={testando} className="bg-purple-600">
              {testando ? "Processando..." : "Criar Link de Pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}