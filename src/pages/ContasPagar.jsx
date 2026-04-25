import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLoja } from "@/contexts/LojaContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputMoeda, parseValorBRL } from "@/components/ui/input-moeda";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, AlertCircle, Clock, DollarSign, Repeat, ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, isAfter, isBefore, startOfDay } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ContasPagar() {
  const navigate = useNavigate();
  const { lojaFiltroId } = useLoja();
  const [dialogConta, setDialogConta] = useState(false);
  const [dialogBaixa, setDialogBaixa] = useState(false);
  const [dialogFornecedor, setDialogFornecedor] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState(null);
  const [buscaTexto, setBuscaTexto] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [filtroSituacao, setFiltroSituacao] = useState("todos");
  const [paginaTab, setPaginaTab] = useState({ vencidas: 1, hoje: 1, futuras: 1, todas: 1, comissoes: 1 });
  const ITENS_POR_PAGINA = 20;
  const [formData, setFormData] = useState({
    fornecedor_id: "",
    fornecedor_nome: "",
    descricao: "",
    valor_total: "",
    data_vencimento: "",
    categoria: "fornecedor"
  });

  const queryClient = useQueryClient();

  const { data: contas = [] } = useQuery({
    queryKey: ['contas-pagar', lojaFiltroId],
    queryFn: async () => {
      try {
        return lojaFiltroId
          ? await base44.entities.ContaPagar.filter({ loja_id: lojaFiltroId }, { order: '-data_vencimento' })
          : lojaFiltroId ? await base44.entities.ContaPagar.filter({ loja_id: lojaFiltroId }, { order: '-data_vencimento' }) : await base44.entities.ContaPagar.list('-data_vencimento');
      } catch {
        return [];
      }
    },
    refetchInterval: 15000
  });

  const { data: comissoes = [] } = useQuery({
    queryKey: ['comissoes', lojaFiltroId],
    queryFn: async () => {
      try {
        return lojaFiltroId
          ? await base44.entities.Comissao.filter({ loja_id: lojaFiltroId })
          : lojaFiltroId ? await base44.entities.Comissao.filter({ loja_id: lojaFiltroId }) : await base44.entities.Comissao.list();
      } catch {
        return [];
      }
    },
    refetchInterval: 15000
  });

  const { data: fornecedores = [] } = useQuery({
    queryKey: ['fornecedores', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.Fornecedor.filter({ loja_id: lojaFiltroId }, { order: 'nome_fantasia' })
      : lojaFiltroId ? base44.entities.Fornecedor.filter({ loja_id: lojaFiltroId }, { order: 'nome_fantasia' }) : base44.entities.Fornecedor.list('nome_fantasia'),
  });

  // CORREÇÃO: Buscar categorias dinâmicas do banco
  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias-despesa'],
    queryFn: async () => {
      try {
        return lojaFiltroId ? await base44.entities.CategoriaDespesa.filter({ loja_id: lojaFiltroId }, { order: 'nome' }) : await base44.entities.CategoriaDespesa.list('nome');
      } catch {
        // Fallback para categorias padrão se a tabela não existir
        return [
          { id: '1', nome: 'Fornecedor' },
          { id: '2', nome: 'Aluguel' },
          { id: '3', nome: 'Funcionários' },
          { id: '4', nome: 'Marketing' },
          { id: '5', nome: 'Manutenção' },
          { id: '6', nome: 'Outros' }
        ];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ContaPagar.create({
      ...data,
      loja_id: lojaFiltroId || null
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-pagar'] });
      toast.success("Conta criada!");
      setDialogConta(false);
      setFormData({ fornecedor_id: "", fornecedor_nome: "", descricao: "", valor_total: "", data_vencimento: "", categoria: "fornecedor" });
    },
  });

  const handleSubmit = () => {
    // CRÍTICO: Validações financeiras
    if (!formData.fornecedor_nome || !formData.descricao || !formData.valor_total || !formData.data_vencimento) {
      toast.error("Preencha todos os campos!");
      return;
    }
    
    const valorNumerico = parseValorBRL(formData.valor_total);
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      toast.error("Valor deve ser maior que zero!");
      return;
    }

    createMutation.mutate({
      fornecedor_id: formData.fornecedor_id || null,
      fornecedor_nome: formData.fornecedor_nome,
      descricao: formData.descricao,
      categoria: formData.categoria,
      valor: valorNumerico,
      status: "pendente",
      data_vencimento: formData.data_vencimento,
      loja_id: lojaFiltroId || null
    });
  };

  const selecionarFornecedor = (fornecedor) => {
    setFormData({
      ...formData,
      fornecedor_id: fornecedor.id,
      fornecedor_nome: fornecedor.nome_fantasia
    });
    setDialogFornecedor(false);
  };

  const baixarMutation = useMutation({
    mutationFn: async ({ id }) => {
      // CRÍTICO: Verificar status atual antes de pagar (evitar pagamento duplo)
      const contaAtual = await base44.entities.ContaPagar.get(id);
      if (contaAtual.status === "pago") {
        throw new Error(`Esta conta já foi paga em ${contaAtual.data_pagamento || 'data desconhecida'}.`);
      }
      return base44.entities.ContaPagar.update(id, {
        status: "pago",
        data_pagamento: new Date().toISOString().split('T')[0]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-pagar'] });
      toast.success("Conta paga!");
      setDialogBaixa(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao pagar conta.");
    },
  });

  const hoje = startOfDay(new Date());
  const contasVencidas = contas.filter(c => c.status !== "pago" && isBefore(new Date(c.data_vencimento), hoje));
  const contasHoje = contas.filter(c => c.status !== "pago" && format(new Date(c.data_vencimento), 'yyyy-MM-dd') === format(hoje, 'yyyy-MM-dd'));
  const contasFuturas = contas.filter(c => c.status !== "pago" && isAfter(startOfDay(new Date(c.data_vencimento)), hoje));

  // CRÍTICO: Incluir comissões pendentes
  const comissoesPendentes = comissoes.filter(c => c.status === 'pendente');
  const totalComissoesPendentes = comissoesPendentes.reduce((sum, c) => sum + (parseFloat(c.valor_comissao) || 0), 0);

  // CRÍTICO: Cálculos seguros dos totais — saldo restante (valor - valor_pago)
  const totalVencidas = contasVencidas.reduce((sum, c) => sum + Math.max(0, (parseFloat(c.valor) || 0) - (parseFloat(c.valor_pago) || 0)), 0);
  const totalHoje = contasHoje.reduce((sum, c) => sum + Math.max(0, (parseFloat(c.valor) || 0) - (parseFloat(c.valor_pago) || 0)), 0);
  const totalFuturas = contasFuturas.reduce((sum, c) => sum + Math.max(0, (parseFloat(c.valor) || 0) - (parseFloat(c.valor_pago) || 0)), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Contas a Pagar</h1>
          <p className="text-slate-500">Gerencie pagamentos</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => navigate(createPageUrl("ContasRecorrentes"))} variant="outline" className="bg-purple-50">
            <Repeat className="w-4 h-4 mr-2" />
            Contas Recorrentes
          </Button>
          <Button onClick={() => setDialogConta(true)} className="bg-red-600">
            <Plus className="w-4 h-4 mr-2" />
            Nova Conta
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Vencidas</p>
                <p className="text-2xl font-bold text-red-600">R$ {totalVencidas.toFixed(2)}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Vencem Hoje</p>
                <p className="text-2xl font-bold text-orange-600">R$ {totalHoje.toFixed(2)}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Futuras</p>
                <p className="text-2xl font-bold text-blue-600">R$ {totalFuturas.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Input
              placeholder="Buscar por fornecedor ou descrição..."
              value={buscaTexto}
              onChange={(e) => { setBuscaTexto(e.target.value); setPaginaTab({ vencidas: 1, hoje: 1, futuras: 1, todas: 1, comissoes: 1 }); }}
              className="flex-1 min-w-[250px]"
            />
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas Categorias</SelectItem>
                {categorias.filter(c => c.ativo !== false && c.tipo === 'pagar').map(cat => (
                  <SelectItem key={cat.id} value={cat.nome.toLowerCase()}>
                    {cat.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroSituacao} onValueChange={setFiltroSituacao}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas Situações</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="vencidas">
        <TabsList>
          <TabsTrigger value="vencidas">Vencidas ({contasVencidas.length})</TabsTrigger>
          <TabsTrigger value="hoje">Hoje ({contasHoje.length})</TabsTrigger>
          <TabsTrigger value="futuras">Futuras ({contasFuturas.length})</TabsTrigger>
          <TabsTrigger value="comissoes" className="text-purple-600">Comissões ({comissoesPendentes.length})</TabsTrigger>
          <TabsTrigger value="todas">Todas</TabsTrigger>
        </TabsList>

        {['vencidas', 'hoje', 'futuras', 'todas'].map((tab) => {
          const listaBase = tab === 'vencidas' ? contasVencidas : tab === 'hoje' ? contasHoje : tab === 'futuras' ? contasFuturas : contas;
          const lista = listaBase.filter(c => {
            const matchBusca = !buscaTexto ||
              c.fornecedor_nome?.toLowerCase().includes(buscaTexto.toLowerCase()) ||
              c.descricao?.toLowerCase().includes(buscaTexto.toLowerCase());
            const matchCategoria = filtroCategoria === "todos" || c.categoria === filtroCategoria;
            const matchSituacao = filtroSituacao === "todos" || c.status === filtroSituacao;
            return matchBusca && matchCategoria && matchSituacao;
          });

          const pag = paginaTab[tab] || 1;
          const totalPaginas = Math.ceil(lista.length / ITENS_POR_PAGINA);

          return (
            <TabsContent key={tab} value={tab}>
              <Card>
                <CardContent className="p-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Situação</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lista.slice((pag - 1) * ITENS_POR_PAGINA, pag * ITENS_POR_PAGINA).map((conta) => (
                        <TableRow key={conta.id}>
                          <TableCell>{conta.fornecedor_nome}</TableCell>
                          <TableCell>{conta.descricao}</TableCell>
                          <TableCell><Badge variant="outline">{conta.categoria}</Badge></TableCell>
                          <TableCell>{format(new Date(conta.data_vencimento), 'dd/MM/yyyy')}</TableCell>
                          <TableCell className="font-semibold text-red-600">R$ {(parseFloat(conta.valor) || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={conta.status === "pago" ? "default" : "destructive"}>
                              {conta.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {conta.status !== "pago" && (
                              <Button size="sm" onClick={() => { setContaSelecionada(conta); setDialogBaixa(true); }}>
                                Pagar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {lista.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                            Nenhuma conta encontrada
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {totalPaginas > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <span className="text-sm text-slate-500">
                        Mostrando {((pag - 1) * ITENS_POR_PAGINA) + 1}-{Math.min(pag * ITENS_POR_PAGINA, lista.length)} de {lista.length}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled={pag <= 1} onClick={() => setPaginaTab(prev => ({ ...prev, [tab]: prev[tab] - 1 }))}>
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm font-medium px-2">{pag} / {totalPaginas}</span>
                        <Button variant="outline" size="sm" disabled={pag >= totalPaginas} onClick={() => setPaginaTab(prev => ({ ...prev, [tab]: prev[tab] + 1 }))}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}

        <TabsContent value="comissoes">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-purple-600">Total Pendente: R$ {totalComissoesPendentes.toFixed(2)}</span>
                </div>
                <Button variant="outline" className="text-purple-600" onClick={() => navigate(createPageUrl("Comissoes"))}>
                  Gerenciar Comissões
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comissoesPendentes.filter(c => {
                    const matchBusca = !buscaTexto ||
                      c.vendedor_nome?.toLowerCase().includes(buscaTexto.toLowerCase()) ||
                      'comissão'.includes(buscaTexto.toLowerCase());
                    return matchBusca;
                  }).slice(((paginaTab.comissoes || 1) - 1) * ITENS_POR_PAGINA, (paginaTab.comissoes || 1) * ITENS_POR_PAGINA).map((comissao) => (
                    <TableRow key={`comissao-${comissao.id}`} className="bg-purple-50/50">
                      <TableCell className="font-medium">{comissao.vendedor_nome || 'Vendedor'}</TableCell>
                      <TableCell>Comissão - Venda #{comissao.venda_id?.slice(0, 8)}</TableCell>
                      <TableCell>{comissao.created_date ? format(new Date(comissao.created_date), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell className="font-semibold text-purple-600">R$ {(parseFloat(comissao.valor_comissao) || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">pendente</Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="text-purple-600" onClick={() => navigate(createPageUrl("Comissoes"))}>
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {comissoesPendentes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                        Nenhuma comissão pendente
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogConta} onOpenChange={setDialogConta}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Conta a Pagar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Fornecedor</Label>
              <div className="flex gap-2">
                <Input 
                  value={formData.fornecedor_nome}
                  readOnly
                  placeholder="Selecione um fornecedor"
                  className="flex-1"
                />
                <Button onClick={() => setDialogFornecedor(true)} variant="outline">
                  Selecionar
                </Button>
              </div>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={formData.categoria} onValueChange={(v) => setFormData({...formData, categoria: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.filter(c => c.ativo !== false && c.tipo === 'pagar').map(cat => (
                    <SelectItem key={cat.id} value={cat.nome.toLowerCase()}>
                      {cat.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input 
                value={formData.descricao}
                onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                placeholder="Ex: Compra de produtos, aluguel..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor</Label>
                <InputMoeda
                  value={formData.valor_total}
                  onChange={(valor) => setFormData({...formData, valor_total: valor})}
                />
              </div>
              <div>
                <Label>Vencimento</Label>
                <Input type="date" value={formData.data_vencimento} onChange={(e) => setFormData({...formData, data_vencimento: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogConta(false)}>Cancelar</Button>
            <Button onClick={handleSubmit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogFornecedor} onOpenChange={setDialogFornecedor}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecionar Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {fornecedores.filter(f => f.ativo !== false).map(fornecedor => (
              <Button
                key={fornecedor.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => selecionarFornecedor(fornecedor)}
              >
                <div className="text-left">
                  <div className="font-semibold">{fornecedor.nome_fantasia}</div>
                  <div className="text-sm text-slate-500">{fornecedor.telefone}</div>
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogBaixa} onOpenChange={setDialogBaixa}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
          </DialogHeader>
          {contaSelecionada && (
            <div className="p-4 bg-slate-50 rounded">
              <p className="text-sm">Fornecedor: {contaSelecionada.fornecedor_nome}</p>
              <p className="text-lg font-bold text-red-600">Valor: R$ {(parseFloat(contaSelecionada.valor) || 0).toFixed(2)}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogBaixa(false)}>Cancelar</Button>
            <Button
              onClick={() => baixarMutation.mutate({ id: contaSelecionada.id })}
              disabled={baixarMutation.isPending}
            >
              {baixarMutation.isPending ? "Processando..." : "Confirmar Pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}