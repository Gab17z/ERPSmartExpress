import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RotateCcw, Plus, Trash2, ArrowLeftRight, Check, X, Search, Package } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function Devolucoes() {
  const [dialogDevolucao, setDialogDevolucao] = useState(false);
  const [dialogVenda, setDialogVenda] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState(null);
  
  const [formData, setFormData] = useState({
    venda_id: "",
    codigo_venda: "",
    cliente_nome: "",
    tipo: "devolucao",
    itens_devolvidos: [],
    itens_troca: [],
    motivo_devolucao: "",
    forma_reembolso: "dinheiro",
    observacoes: ""
  });

  const queryClient = useQueryClient();

  React.useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: devolucoes = [] } = useQuery({
    queryKey: ['devolucoes'],
    queryFn: async () => {
      try {
        return await base44.entities.Devolucao.list('-created_date');
      } catch {
        return [];
      }
    },
    refetchInterval: 30000
  });

  const { data: vendas = [] } = useQuery({
    queryKey: ['vendas'],
    queryFn: () => base44.entities.Venda.list('-data_venda'),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const proximoNumero = devolucoes.length + 1;
      const codigo = `DEV-${proximoNumero.toString().padStart(5, '0')}`;
      
      const devolucao = await base44.entities.Devolucao.create({
        ...data,
        codigo_devolucao: codigo,
        data_solicitacao: new Date().toISOString(),
        status: "pendente",
        responsavel: user?.full_name
      });

      return devolucao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devolucoes'] });
      toast.success("Devolução registrada!");
      resetForm();
    },
  });

  const aprovarMutation = useMutation({
    mutationFn: async (devolucaoId) => {
      const devolucao = devolucoes.find(d => d.id === devolucaoId);
      
      // CRÍTICO: Reverter estoque
      for (const item of devolucao.itens_devolvidos) {
        const produtos = await base44.entities.Produto.filter({ id: item.produto_id });
        if (produtos[0]) {
          // CRÍTICO: Atualizar estoque com validação
          const novoEstoque = (parseFloat(produtos[0].estoque_atual) || 0) + (parseInt(item.quantidade) || 0);
          await base44.entities.Produto.update(item.produto_id, {
            estoque_atual: novoEstoque
          });

          await base44.entities.MovimentacaoEstoque.create({
            tipo: "entrada",
            produto_id: item.produto_id,
            produto_nome: item.produto_nome,
            quantidade: parseInt(item.quantidade) || 0,
            estoque_anterior: parseFloat(produtos[0].estoque_atual) || 0,
            estoque_novo: novoEstoque,
            motivo: "Devolução",
            documento_referencia: devolucao.codigo_devolucao,
            usuario_responsavel: user?.full_name,
            data_movimentacao: new Date().toISOString()
          });
        }
      }

      // CRÍTICO: Cancelar comissão da venda devolvida
      try {
        const comissoes = await base44.entities.Comissao.filter({ venda_id: devolucao.venda_id });
        if (comissoes.length > 0) {
          const comissao = comissoes[0];
          await base44.entities.Comissao.update(comissao.id, {
            status: "cancelada",
            observacao: `Comissão cancelada - Devolução ${devolucao.codigo_devolucao}`
          });
        }
      } catch (error) {
        console.error("Erro ao cancelar comissão:", error);
      }

      return base44.entities.Devolucao.update(devolucaoId, {
        status: "aprovada",
        data_finalizacao: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devolucoes'] });
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success("Devolução aprovada e estoque atualizado!");
    },
  });

  const resetForm = () => {
    setFormData({
      venda_id: "",
      codigo_venda: "",
      cliente_nome: "",
      tipo: "devolucao",
      itens_devolvidos: [],
      itens_troca: [],
      motivo_devolucao: "",
      forma_reembolso: "dinheiro",
      observacoes: ""
    });
    setDialogDevolucao(false);
  };

  const selecionarVenda = (venda) => {
    setFormData({
      ...formData,
      venda_id: venda.id,
      codigo_venda: venda.codigo_venda,
      cliente_nome: venda.cliente_nome,
      itens_devolvidos: venda.itens.map(item => ({
        ...item,
        motivo: "",
        valor_reembolso: item.subtotal
      }))
    });
    setDialogVenda(false);
  };

  const handleSubmit = () => {
    // CRÍTICO: Validações completas
    if (!formData.venda_id || formData.itens_devolvidos.length === 0) {
      toast.error("Selecione a venda e os itens!");
      return;
    }

    if (!formData.motivo_devolucao || formData.motivo_devolucao.trim() === "") {
      toast.error("Informe o motivo da devolução!");
      return;
    }

    const valorTotal = formData.itens_devolvidos.reduce((sum, i) => sum + (parseFloat(i.valor_reembolso) || 0), 0);

    if (valorTotal <= 0) {
      toast.error("Valor total de reembolso deve ser maior que zero!");
      return;
    }

    createMutation.mutate({
      ...formData,
      valor_total_reembolso: valorTotal
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RotateCcw className="w-7 h-7 text-orange-600" />
            Devoluções e Trocas
          </h1>
          <p className="text-slate-500">Gerencie devoluções de produtos</p>
        </div>
        <Button onClick={() => setDialogDevolucao(true)} className="bg-orange-600">
          <Plus className="w-4 h-4 mr-2" />
          Nova Devolução
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Venda</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Reembolso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devolucoes.map((dev) => (
                <TableRow key={dev.id}>
                  <TableCell className="font-mono">{dev.codigo_devolucao}</TableCell>
                  <TableCell className="font-mono text-xs">{dev.codigo_venda}</TableCell>
                  <TableCell>{dev.cliente_nome}</TableCell>
                  <TableCell>
                    <Badge variant={dev.tipo === "devolucao" ? "destructive" : "default"}>
                      {dev.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>{dev.itens_devolvidos?.length || 0}</TableCell>
                  <TableCell className="font-bold text-orange-600">R$ {dev.valor_total_reembolso?.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={dev.status === "aprovada" ? "default" : dev.status === "pendente" ? "secondary" : "destructive"}>
                      {dev.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {dev.status === "pendente" && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => aprovarMutation.mutate(dev.id)} className="bg-green-600">
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600">
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogDevolucao} onOpenChange={() => resetForm()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-orange-600" />
              Nova Devolução/Troca
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Seleção da Venda */}
            <div className="bg-slate-50 p-4 rounded-lg border">
              <Label className="text-base font-semibold mb-3 block">1. Selecionar Venda Original</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.codigo_venda}
                  readOnly
                  placeholder="Clique em Buscar para selecionar a venda"
                  className="flex-1 bg-white"
                />
                <Button onClick={() => setDialogVenda(true)} variant="outline" className="gap-2">
                  <Search className="w-4 h-4" />
                  Buscar Venda
                </Button>
              </div>

              {formData.cliente_nome && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    Cliente: <strong>{formData.cliente_nome}</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Itens da Venda para Devolução */}
            {formData.itens_devolvidos.length > 0 && (
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <Label className="text-base font-semibold mb-3 block">2. Itens para Devolução</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Foto</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="w-20">Qtd</TableHead>
                      <TableHead className="w-32">Valor Unit.</TableHead>
                      <TableHead className="w-32">Reembolso</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.itens_devolvidos.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="p-2">
                          {item.imagem_url ? (
                            <img
                              src={item.imagem_url}
                              alt={item.produto_nome}
                              className="w-10 h-10 object-cover rounded border"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center">
                              <Package className="w-4 h-4 text-slate-400" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{item.produto_nome}</TableCell>
                        <TableCell>{item.quantidade}</TableCell>
                        <TableCell>R$ {(item.preco_unitario || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.valor_reembolso}
                            onChange={(e) => {
                              const novosItens = [...formData.itens_devolvidos];
                              novosItens[index].valor_reembolso = parseFloat(e.target.value) || 0;
                              setFormData({ ...formData, itens_devolvidos: novosItens });
                            }}
                            className="w-28"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const novosItens = formData.itens_devolvidos.filter((_, i) => i !== index);
                              setFormData({ ...formData, itens_devolvidos: novosItens });
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Total do Reembolso */}
                <div className="mt-4 p-3 bg-white rounded-lg border flex justify-between items-center">
                  <span className="font-semibold">Total do Reembolso:</span>
                  <span className="text-2xl font-bold text-orange-600">
                    R$ {formData.itens_devolvidos.reduce((sum, i) => sum + (parseFloat(i.valor_reembolso) || 0), 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Informações da Devolução */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Operação</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="devolucao">Devolução (Reembolso)</SelectItem>
                    <SelectItem value="troca">Troca de Produto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Forma de Reembolso</Label>
                <Select value={formData.forma_reembolso} onValueChange={(v) => setFormData({ ...formData, forma_reembolso: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="estorno_cartao">Estorno Cartão</SelectItem>
                    <SelectItem value="credito_loja">Crédito na Loja</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Motivo da Devolução *</Label>
              <Textarea
                value={formData.motivo_devolucao}
                onChange={(e) => setFormData({ ...formData, motivo_devolucao: e.target.value })}
                placeholder="Descreva o motivo da devolução..."
                rows={3}
                className="resize-none"
              />
            </div>

            <div>
              <Label>Observações Adicionais</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Observações internas (opcional)"
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            <Button onClick={handleSubmit} className="bg-orange-600 gap-2">
              <Check className="w-4 h-4" />
              Registrar Devolução
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogVenda} onOpenChange={setDialogVenda}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Selecionar Venda para Devolução</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Buscar por código, cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {vendas
                .filter(v => v.status === "finalizada")
                .filter(v =>
                  v.codigo_venda?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  v.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .slice(0, 50)
                .map(venda => (
                  <div
                    key={venda.id}
                    className="p-3 border rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => selecionarVenda(venda)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-mono font-bold text-blue-600">{venda.codigo_venda}</div>
                        <div className="text-sm text-slate-700 mt-1">{venda.cliente_nome || "Cliente não identificado"}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">R$ {(venda.valor_total || 0).toFixed(2)}</div>
                        <div className="text-xs text-slate-500">{format(new Date(venda.data_venda), 'dd/MM/yyyy')}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded inline-block">
                      {venda.itens?.length || 0} produto(s)
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}