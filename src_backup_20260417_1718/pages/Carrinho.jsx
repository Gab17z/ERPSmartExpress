import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  CreditCard,
  Check,
  Package
} from "lucide-react";
import { toast } from "sonner";

export default function Carrinho() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [carrinho, setCarrinho] = useState(
    JSON.parse(localStorage.getItem('carrinho_marketplace') || '[]')
  );
  const [dialogCheckout, setDialogCheckout] = useState(false);
  const [dialogSucesso, setDialogSucesso] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [pedidoFinalizado, setPedidoFinalizado] = useState(null);
  const [configuracoes, setConfiguracoes] = useState(null);

  React.useEffect(() => {
    const loadConfig = () => {
      const config = localStorage.getItem('configuracoes_erp');
      if (config) {
        const parsed = JSON.parse(config);
        setConfiguracoes(parsed);
      } else {
      }
    };
    
    loadConfig();
    window.addEventListener('configuracoes_atualizadas', loadConfig);
    return () => window.removeEventListener('configuracoes_atualizadas', loadConfig);
  }, []);

  const [dadosCliente, setDadosCliente] = useState({
    nome_completo: "",
    email: "",
    telefone: "",
    cpf: "",
    endereco: {
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: ""
    },
    forma_pagamento: "pix",
    observacoes: ""
  });

  const atualizarQuantidade = (produtoId, novaQuantidade) => {
    if (novaQuantidade <= 0) {
      removerItem(produtoId);
      return;
    }

    const novoCarrinho = carrinho.map(item =>
      item.id === produtoId ? { ...item, quantidade: novaQuantidade } : item
    );
    setCarrinho(novoCarrinho);
    localStorage.setItem('carrinho_marketplace', JSON.stringify(novoCarrinho));
  };

  const removerItem = (produtoId) => {
    const novoCarrinho = carrinho.filter(item => item.id !== produtoId);
    setCarrinho(novoCarrinho);
    localStorage.setItem('carrinho_marketplace', JSON.stringify(novoCarrinho));
    toast.success("Item removido!");
  };

  const calcularSubtotal = () => carrinho.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);

  const finalizarPedidoMutation = useMutation({
    mutationFn: async (pedidoData) => {
      // Criar cliente se não existir
      let clienteId = null;
      try {
        const clientesExistentes = await base44.entities.Cliente.filter({ 
          telefone1: pedidoData.telefone 
        });

        if (clientesExistentes.length > 0) {
          clienteId = clientesExistentes[0].id;
        } else {
          const novoCliente = await base44.entities.Cliente.create({
            nome_completo: pedidoData.nome_completo,
            telefone1: pedidoData.telefone,
            email: pedidoData.email || null,
            cpf_cnpj: pedidoData.cpf || null,
            endereco: pedidoData.endereco,
            fonte: "marketplace_online",
            ativo: true
          });
          clienteId = novoCliente.id;
        }
      } catch (error) {
        console.error("Erro ao criar cliente:", error);
      }

      // Criar venda
      const codigoVenda = `WEB-${Date.now()}`;
      const venda = await base44.entities.Venda.create({
        codigo_venda: codigoVenda,
        cliente_id: clienteId,
        cliente_nome: pedidoData.nome_completo,
        vendedor_id: "marketplace",
        vendedor_nome: "Venda Online",
        itens: carrinho.map(item => ({
          produto_id: item.id,
          produto_nome: item.nome,
          quantidade: item.quantidade,
          preco_unitario: item.preco,
          desconto_item: 0,
          subtotal: item.preco * item.quantidade
        })),
        subtotal: calcularSubtotal(),
        desconto_total: 0,
        valor_total: calcularSubtotal(),
        pagamentos: [{
          forma_pagamento: pedidoData.forma_pagamento,
          valor: calcularSubtotal(),
          parcelas: 1,
          status: "pendente"
        }],
        data_venda: new Date().toISOString(),
        status: "finalizada",
        observacoes: `🌐 PEDIDO ONLINE - ${pedidoData.observacoes || ''}\n📍 Endereço: ${pedidoData.endereco.logradouro}, ${pedidoData.endereco.numero} - ${pedidoData.endereco.bairro}, ${pedidoData.endereco.cidade}/${pedidoData.endereco.estado}\n📱 Tel: ${pedidoData.telefone}`
      });

      // Atualizar estoque
      for (const item of carrinho) {
        const produto = await base44.entities.Produto.filter({ id: item.id });
        if (produto[0]) {
          await base44.entities.Produto.update(item.id, {
            estoque_atual: produto[0].estoque_atual - item.quantidade
          });
        }
      }

      // IMPORTANTE: Recarregar config antes de enviar
      const configAtual = localStorage.getItem('configuracoes_erp');
      const config = configAtual ? JSON.parse(configAtual) : null;
      const emailNotif = config?.sistema?.emails_notificacao_vendas;
      
      
      if (emailNotif && emailNotif.trim()) {
        try {
          const itensTexto = carrinho.map(i => `${i.nome} (x${i.quantidade}) - R$ ${(i.preco * i.quantidade).toFixed(2)}`).join(', ');
          
          await base44.integrations.Core.SendEmail({
            to: emailNotif.trim(),
            subject: `NOVO PEDIDO ONLINE - ${codigoVenda}`,
            body: `PEDIDO RECEBIDO NA LOJA ONLINE!

Código: ${codigoVenda}
Cliente: ${pedidoData.nome_completo}
Telefone: ${pedidoData.telefone}
Email: ${pedidoData.email || 'Não informado'}

ITENS: ${itensTexto}

TOTAL: R$ ${calcularSubtotal().toFixed(2)}
Forma Pagamento: ${pedidoData.forma_pagamento}

ENDEREÇO ENTREGA:
${pedidoData.endereco.logradouro}, ${pedidoData.endereco.numero}
${pedidoData.endereco.bairro} - ${pedidoData.endereco.cidade}/${pedidoData.endereco.estado}
CEP: ${pedidoData.endereco.cep}

Observações: ${pedidoData.observacoes || 'Nenhuma'}`
          });
          
        } catch (error) {
          console.error("❌ ERRO EMAIL:", error);
        }
      } else {
      }

      return venda;
    },
    onSuccess: (venda) => {
      queryClient.invalidateQueries();
      setPedidoFinalizado(venda);
      setCarrinho([]);
      localStorage.removeItem('carrinho_marketplace');
      setDialogCheckout(false);
      setDialogSucesso(true);
    },
    onError: (error) => {
      console.error("Erro ao finalizar pedido:", error);
      toast.error("Erro ao processar pedido. Tente novamente.");
    }
  });

  const handleFinalizarPedido = () => {
    if (!dadosCliente.nome_completo || !dadosCliente.telefone || !dadosCliente.endereco.logradouro) {
      toast.error("Preencha todos os campos obrigatórios!");
      return;
    }

    finalizarPedidoMutation.mutate(dadosCliente);
  };

  const totalItens = carrinho.reduce((sum, item) => sum + item.quantidade, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b p-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Button variant="ghost" onClick={() => window.location.href = createPageUrl("Marketplace")}>
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">Carrinho de Compras</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {carrinho.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingCart className="w-20 h-20 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-600 mb-2">Carrinho Vazio</h2>
            <p className="text-slate-500 mb-6">Adicione produtos para continuar</p>
            <Button onClick={() => navigate(createPageUrl("Marketplace"))}>
              Ir às Compras
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {carrinho.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                        {item.imagem ? (
                          <img src={item.imagem} alt={item.nome} className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-slate-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 flex flex-col">
                        <h3 className="font-semibold mb-1">{item.nome}</h3>
                        <p className="text-lg font-bold text-green-600 mb-3">
                          R$ {(parseFloat(item.preco) || 0).toFixed(2)}
                        </p>
                        <div className="flex items-center justify-between mt-auto">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => atualizarQuantidade(item.id, item.quantidade - 1)}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="w-12 text-center font-semibold">{item.quantidade}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => atualizarQuantidade(item.id, item.quantidade + 1)}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-lg">
                              R$ {((parseFloat(item.preco) || 0) * item.quantidade).toFixed(2)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 h-8 w-8"
                              onClick={() => removerItem(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Resumo do Pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Itens ({totalItens}):</span>
                      <span className="font-semibold">R$ {calcularSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold border-t pt-2">
                      <span>Total:</span>
                      <span className="text-green-600">R$ {calcularSubtotal().toFixed(2)}</span>
                    </div>
                  </div>

                  <Button 
                    onClick={() => setDialogCheckout(true)}
                    className="w-full h-12 bg-green-600 hover:bg-green-700 text-lg"
                  >
                    <CreditCard className="w-5 h-5 mr-2" />
                    Finalizar Pedido
                  </Button>

                  <Button 
                    variant="outline" 
                    onClick={() => navigate(createPageUrl("Marketplace"))}
                    className="w-full"
                  >
                    Continuar Comprando
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Dialog Checkout */}
      <Dialog open={dialogCheckout} onOpenChange={setDialogCheckout}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Finalizar Pedido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome Completo *</Label>
                <Input
                  value={dadosCliente.nome_completo}
                  onChange={(e) => setDadosCliente({ ...dadosCliente, nome_completo: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Telefone *</Label>
                <Input
                  value={dadosCliente.telefone}
                  onChange={(e) => setDadosCliente({ ...dadosCliente, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  required
                />
              </div>

              <div>
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={dadosCliente.email}
                  onChange={(e) => setDadosCliente({ ...dadosCliente, email: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <Label>CPF</Label>
                <Input
                  value={dadosCliente.cpf}
                  onChange={(e) => setDadosCliente({ ...dadosCliente, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Endereço de Entrega</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>CEP *</Label>
                  <Input
                    value={dadosCliente.endereco.cep}
                    onChange={(e) => setDadosCliente({
                      ...dadosCliente,
                      endereco: { ...dadosCliente.endereco, cep: e.target.value }
                    })}
                    required
                  />
                </div>
                <div>
                  <Label>Número *</Label>
                  <Input
                    value={dadosCliente.endereco.numero}
                    onChange={(e) => setDadosCliente({
                      ...dadosCliente,
                      endereco: { ...dadosCliente.endereco, numero: e.target.value }
                    })}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label>Logradouro *</Label>
                  <Input
                    value={dadosCliente.endereco.logradouro}
                    onChange={(e) => setDadosCliente({
                      ...dadosCliente,
                      endereco: { ...dadosCliente.endereco, logradouro: e.target.value }
                    })}
                    required
                  />
                </div>
                <div>
                  <Label>Bairro</Label>
                  <Input
                    value={dadosCliente.endereco.bairro}
                    onChange={(e) => setDadosCliente({
                      ...dadosCliente,
                      endereco: { ...dadosCliente.endereco, bairro: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label>Complemento</Label>
                  <Input
                    value={dadosCliente.endereco.complemento}
                    onChange={(e) => setDadosCliente({
                      ...dadosCliente,
                      endereco: { ...dadosCliente.endereco, complemento: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label>Cidade *</Label>
                  <Input
                    value={dadosCliente.endereco.cidade}
                    onChange={(e) => setDadosCliente({
                      ...dadosCliente,
                      endereco: { ...dadosCliente.endereco, cidade: e.target.value }
                    })}
                    required
                  />
                </div>
                <div>
                  <Label>Estado *</Label>
                  <Input
                    value={dadosCliente.endereco.estado}
                    onChange={(e) => setDadosCliente({
                      ...dadosCliente,
                      endereco: { ...dadosCliente.endereco, estado: e.target.value }
                    })}
                    placeholder="SP"
                    maxLength={2}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <Label>Forma de Pagamento</Label>
              <Select
                value={dadosCliente.forma_pagamento}
                onValueChange={(value) => setDadosCliente({ ...dadosCliente, forma_pagamento: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={dadosCliente.observacoes}
                onChange={(e) => setDadosCliente({ ...dadosCliente, observacoes: e.target.value })}
                rows={2}
                placeholder="Instruções de entrega, preferências..."
              />
            </div>

            <div className="bg-slate-100 p-4 rounded-lg">
              <div className="flex justify-between text-xl font-bold">
                <span>Total do Pedido:</span>
                <span className="text-green-600">R$ {calcularSubtotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCheckout(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleFinalizarPedido}
              className="bg-green-600 hover:bg-green-700"
              disabled={finalizarPedidoMutation.isPending}
            >
              {finalizarPedidoMutation.isPending ? "Processando..." : "Confirmar Pedido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Sucesso */}
      <Dialog open={dialogSucesso} onOpenChange={setDialogSucesso}>
        <DialogContent>
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-12 h-12 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">Pedido Realizado!</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <p className="text-lg">Pedido <span className="font-mono font-bold">#{pedidoFinalizado?.codigo_venda}</span></p>
            <p className="text-sm text-slate-600">
              Entraremos em contato em breve para confirmar o pagamento e combinar a entrega.
            </p>
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <p className="text-sm text-green-900">
                ✓ Pedido enviado com sucesso<br/>
                ✓ Confirmação enviada para {dadosCliente.telefone}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => {
                setDialogSucesso(false);
                navigate(createPageUrl("Marketplace"));
              }}
              className="w-full"
            >
              Continuar Comprando
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}