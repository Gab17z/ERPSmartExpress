import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Send, ShoppingCart, Plus, Minus, Trash2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format, isWithinInterval, parseISO, startOfMonth } from "date-fns";
import DateRangeFilter from "@/components/DateRangeFilter";

export default function NFCe() {
  const hoje = new Date();
  const [filtro, setFiltro] = useState({
    dataInicio: format(startOfMonth(hoje), 'yyyy-MM-dd'),
    dataFim: format(hoje, 'yyyy-MM-dd')
  });
  const [dialogEmissao, setDialogEmissao] = useState(false);
  const [dialogCliente, setDialogCliente] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [carrinho, setCarrinho] = useState([]);
  const [observacoes, setObservacoes] = useState("");

  const queryClient = useQueryClient();

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => base44.entities.Produto.list('nome'),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('nome_completo'),
  });

  const emitirNotaMutation = useMutation({
    mutationFn: async (dados) => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return {
        numero: Math.floor(Math.random() * 999999),
        ...dados
      };
    },
    onSuccess: () => {
      toast.success("NFC-e emitida com sucesso!");
      setDialogEmissao(false);
      setCarrinho([]);
    },
  });

  const adicionarItem = (produtoId) => {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;

    const itemExistente = carrinho.find(i => i.produto_id === produto.id);
    if (itemExistente) {
      setCarrinho(carrinho.map(i => 
        i.produto_id === produto.id 
          ? {...i, quantidade: i.quantidade + 1, total: (i.quantidade + 1) * i.valor_unitario}
          : i
      ));
    } else {
      setCarrinho([...carrinho, {
        produto_id: produto.id,
        produto_nome: produto.nome,
        quantidade: 1,
        valor_unitario: produto.preco_venda,
        total: produto.preco_venda
      }]);
    }
  };

  const alterarQuantidade = (produtoId, novaQtd) => {
    if (novaQtd <= 0) {
      removerItem(produtoId);
      return;
    }
    setCarrinho(carrinho.map(i =>
      i.produto_id === produtoId
        ? { ...i, quantidade: novaQtd, total: novaQtd * i.valor_unitario }
        : i
    ));
  };

  const removerItem = (produtoId) => {
    setCarrinho(carrinho.filter(i => i.produto_id !== produtoId));
  };

  const valorTotal = carrinho.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Nota Fiscal do Consumidor (NFC-e)</h1>
          <p className="text-slate-500">Emita cupons fiscais eletrônicos</p>
        </div>
        <Button onClick={() => setDialogEmissao(true)} className="bg-green-600">
          <Send className="w-4 h-4 mr-2" />
          Emitir NFC-e
        </Button>
      </div>

      <DateRangeFilter onFilterChange={setFiltro} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <FileText className="w-8 h-8 text-green-500 mb-3" />
            <p className="text-sm text-slate-500">Cupons Hoje</p>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <ShoppingCart className="w-8 h-8 text-blue-500 mb-3" />
            <p className="text-sm text-slate-500">Valor Médio</p>
            <p className="text-2xl font-bold">R$ 0,00</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <FileText className="w-8 h-8 text-purple-500 mb-3" />
            <p className="text-sm text-slate-500">Total do Dia</p>
            <p className="text-2xl font-bold">R$ 0,00</p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogEmissao} onOpenChange={setDialogEmissao}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Emitir NFC-e (Cupom Fiscal)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cliente (Opcional)</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 justify-start"
                  onClick={() => setDialogCliente(true)}
                >
                  <User className="w-4 h-4 mr-2" />
                  {clienteSelecionado ? clienteSelecionado.nome_completo : "Consumidor"}
                </Button>
                {clienteSelecionado && (
                  <Button variant="ghost" onClick={() => setClienteSelecionado(null)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label>Adicionar Produto</Label>
              <Select onValueChange={(v) => adicionarItem(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um produto" />
                </SelectTrigger>
                <SelectContent>
                  {produtos.filter(p => p.ativo && (p.estoque_atual || 0) > 0).map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} - R$ {p.preco_venda?.toFixed(2)} ({p.estoque_atual || 0} un.)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {carrinho.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Itens do Cupom</h4>
                <div className="space-y-2">
                  {carrinho.map((item) => (
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
                        <p className="font-bold text-green-600">R$ {item.total.toFixed(2)}</p>
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
              <Label>Observações</Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Informações adicionais..."
                rows={2}
              />
            </div>

            <div className="bg-green-50 rounded p-4 border-2 border-green-200">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Quantidade de Itens:</span>
                  <span className="font-semibold">{carrinho.reduce((sum, i) => sum + i.quantidade, 0)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-semibold text-lg">Valor Total:</span>
                  <span className="text-3xl font-bold text-green-600">R$ {valorTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
            </div>
            <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogEmissao(false); setCarrinho([]); setClienteSelecionado(null); }}>Cancelar</Button>
            <Button 
              onClick={() => emitirNotaMutation.mutate({cliente: clienteSelecionado, itens: carrinho, valor_total: valorTotal, observacoes})}
              disabled={carrinho.length === 0}
              className="bg-green-600"
            >
              <Send className="w-4 h-4 mr-2" />
              Emitir Cupom Fiscal
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
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setClienteSelecionado(null);
                setDialogCliente(false);
              }}
            >
              Consumidor (sem identificação)
            </Button>
            {clientes.filter(c => c.ativo).map(cliente => (
              <Button
                key={cliente.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setClienteSelecionado(cliente);
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