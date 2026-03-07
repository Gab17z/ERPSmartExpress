import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Send, X, AlertCircle, Plus, Minus, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format, isWithinInterval, parseISO, startOfMonth } from "date-fns";
import DateRangeFilter from "@/components/DateRangeFilter";

export default function NFe() {
  const hoje = new Date();
  const [filtro, setFiltro] = useState({
    dataInicio: format(startOfMonth(hoje), 'yyyy-MM-dd'),
    dataFim: format(hoje, 'yyyy-MM-dd')
  });
  const [dialogEmissao, setDialogEmissao] = useState(false);
  const [dialogCliente, setDialogCliente] = useState(false);
  const [formData, setFormData] = useState({
    cliente_id: "",
    cliente_nome: "",
    natureza_operacao: "Venda",
    itens: [],
    observacoes: "",
    valor_total: 0
  });

  const queryClient = useQueryClient();

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('nome_completo'),
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => base44.entities.Produto.list('nome'),
  });

  const emitirNotaMutation = useMutation({
    mutationFn: async (dados) => {
      // Simulação de emissão (integração real requer API fiscal)
      await new Promise(resolve => setTimeout(resolve, 2000));
      return {
        numero: Math.floor(Math.random() * 999999),
        chave: 'NFe' + Math.random().toString(36).substring(7),
        ...dados
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notas'] });
      toast.success("NFe emitida com sucesso!");
      setDialogEmissao(false);
      setFormData({ cliente_id: "", cliente_nome: "", natureza_operacao: "Venda", itens: [], valor_total: 0 });
    },
  });

  const adicionarItem = (produtoId) => {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;

    const itemExistente = formData.itens.find(i => i.produto_id === produto.id);
    if (itemExistente) {
      const novosItens = formData.itens.map(i =>
        i.produto_id === produto.id
          ? { ...i, quantidade: i.quantidade + 1, valor_total: (i.quantidade + 1) * i.valor_unitario }
          : i
      );
      setFormData({
        ...formData,
        itens: novosItens,
        valor_total: novosItens.reduce((sum, i) => sum + i.valor_total, 0)
      });
    } else {
      const novoItem = {
        produto_id: produto.id,
        produto_nome: produto.nome,
        quantidade: 1,
        valor_unitario: produto.preco_venda,
        valor_total: produto.preco_venda
      };
      const novosItens = [...formData.itens, novoItem];
      setFormData({
        ...formData,
        itens: novosItens,
        valor_total: novosItens.reduce((sum, i) => sum + i.valor_total, 0)
      });
    }
  };

  const alterarQuantidade = (produtoId, novaQtd) => {
    if (novaQtd <= 0) {
      removerItem(produtoId);
      return;
    }
    const novosItens = formData.itens.map(i =>
      i.produto_id === produtoId
        ? { ...i, quantidade: novaQtd, valor_total: novaQtd * i.valor_unitario }
        : i
    );
    setFormData({
      ...formData,
      itens: novosItens,
      valor_total: novosItens.reduce((sum, i) => sum + i.valor_total, 0)
    });
  };

  const removerItem = (produtoId) => {
    const novosItens = formData.itens.filter(i => i.produto_id !== produtoId);
    setFormData({
      ...formData,
      itens: novosItens,
      valor_total: novosItens.reduce((sum, i) => sum + i.valor_total, 0)
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Nota Fiscal Eletrônica (NFe)</h1>
          <p className="text-slate-500">Emita notas fiscais de produtos</p>
        </div>
        <Button onClick={() => setDialogEmissao(true)} className="bg-blue-600">
          <Send className="w-4 h-4 mr-2" />
          Emitir NFe
        </Button>
      </div>

      <DateRangeFilter onFilterChange={setFiltro} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <FileText className="w-8 h-8 text-green-500 mb-3" />
            <p className="text-sm text-slate-500">Notas Emitidas</p>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-6">
            <AlertCircle className="w-8 h-8 text-yellow-500 mb-3" />
            <p className="text-sm text-slate-500">Em Processamento</p>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-6">
            <X className="w-8 h-8 text-red-500 mb-3" />
            <p className="text-sm text-slate-500">Canceladas</p>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notas Emitidas Recentemente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-slate-500">
            <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p>Nenhuma nota fiscal emitida ainda</p>
            <p className="text-sm mt-2">Configure sua integração fiscal para começar a emitir</p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogEmissao} onOpenChange={setDialogEmissao}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Emitir Nota Fiscal Eletrônica (NFe)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                <strong>Atenção:</strong> A emissão de NFe requer configuração fiscal prévia com certificado digital.
              </p>
            </div>

            <div>
              <Label>Cliente *</Label>
              <div className="flex gap-2">
                <Input 
                  value={formData.cliente_nome}
                  readOnly
                  placeholder="Selecione um cliente"
                  className="flex-1"
                />
                <Button onClick={() => setDialogCliente(true)} variant="outline">
                  Selecionar
                </Button>
              </div>
            </div>

            <div>
              <Label>Natureza da Operação</Label>
              <Select value={formData.natureza_operacao} onValueChange={(v) => setFormData({...formData, natureza_operacao: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Venda">Venda de Mercadoria</SelectItem>
                  <SelectItem value="Devolucao">Devolução</SelectItem>
                  <SelectItem value="Troca">Troca</SelectItem>
                  <SelectItem value="Remessa">Remessa</SelectItem>
                  <SelectItem value="Bonificacao">Bonificação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Adicionar Produto</Label>
              <Select onValueChange={(v) => adicionarItem(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {produtos.filter(p => p.ativo).map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} - R$ {p.preco_venda?.toFixed(2)} - SKU: {p.sku || 'N/A'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.itens.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Itens da Nota</h4>
                <div className="space-y-2">
                  {formData.itens.map((item) => (
                    <div key={item.produto_id} className="flex items-center gap-3 p-3 border rounded-lg bg-slate-50">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{item.produto_nome}</p>
                        <p className="text-xs text-slate-500">R$ {item.valor_unitario.toFixed(2)} cada</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => alterarQuantidade(item.produto_id, item.quantidade - 1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-semibold">{item.quantidade}</span>
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => alterarQuantidade(item.produto_id, item.quantidade + 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="w-24 text-right">
                        <p className="font-bold text-green-600">R$ {item.valor_total.toFixed(2)}</p>
                      </div>
                      <Button size="icon" variant="ghost" className="text-red-600" onClick={() => removerItem(item.produto_id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label>Observações / Informações Complementares</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                placeholder="Informações adicionais da nota..."
                rows={3}
              />
            </div>

            <div className="bg-green-50 rounded p-4 border-2 border-green-200">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Quantidade de Itens:</span>
                  <span className="font-semibold">{formData.itens.reduce((sum, i) => sum + i.quantidade, 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Subtotal Produtos:</span>
                  <span className="font-semibold">R$ {formData.valor_total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-semibold text-lg">Valor Total da Nota:</span>
                  <span className="text-3xl font-bold text-green-600">R$ {formData.valor_total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogEmissao(false); setFormData({ cliente_id: "", cliente_nome: "", natureza_operacao: "Venda", itens: [], observacoes: "", valor_total: 0 }); }}>
              Cancelar
            </Button>
            <Button 
              onClick={() => emitirNotaMutation.mutate(formData)} 
              disabled={!formData.cliente_id || formData.itens.length === 0}
              className="bg-blue-600"
            >
              <Send className="w-4 h-4 mr-2" />
              Emitir NFe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogCliente} onOpenChange={setDialogCliente}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecionar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {clientes.filter(c => c.ativo).map(cliente => (
              <Button
                key={cliente.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setFormData({...formData, cliente_id: cliente.id, cliente_nome: cliente.nome_completo});
                  setDialogCliente(false);
                }}
              >
                <div className="text-left">
                  <div className="font-semibold">{cliente.nome_completo}</div>
                  <div className="text-sm text-slate-500">{cliente.cpf_cnpj || cliente.telefone1}</div>
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}