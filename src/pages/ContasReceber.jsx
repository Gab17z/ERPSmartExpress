import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLoja } from "@/contexts/LojaContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputMoeda, parseValorBRL, formatarValorBRL } from "@/components/ui/input-moeda";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, DollarSign, AlertCircle, CheckCircle2, Clock, Loader2, ChevronsUpDown, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, isAfter, isBefore, startOfDay } from "date-fns";

export default function ContasReceber() {
  const { lojaFiltroId } = useLoja();
  const [dialogConta, setDialogConta] = useState(false);
  const [dialogBaixa, setDialogBaixa] = useState(false);
  const [clienteOpen, setClienteOpen] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState(null);
  const [valorBaixa, setValorBaixa] = useState("");
  const [buscaTexto, setBuscaTexto] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState("todos");
  const [paginaTab, setPaginaTab] = useState({ vencidas: 1, hoje: 1, futuras: 1, todas: 1 });
  const ITENS_POR_PAGINA = 20;
  const [formData, setFormData] = useState({
    cliente_id: "",
    cliente_nome: "",
    descricao: "",
    valor_total: "",
    data_vencimento: ""
  });

  // CORREÇÃO: Estado para evitar pagamentos duplicados
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const lastPaymentRef = useRef(null); // Para idempotência

  const queryClient = useQueryClient();

  const { data: contas = [] } = useQuery({
    queryKey: ['contas-receber', lojaFiltroId],
    queryFn: async () => {
        try {
          return lojaFiltroId
            ? await base44.entities.ContaReceber.filter({ loja_id: lojaFiltroId }, { order: '-data_vencimento' })
            : await base44.entities.ContaReceber.list('-data_vencimento');
        } catch {
          return [];
        }
      },
    refetchInterval: 30000
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.Cliente.filter({ loja_id: lojaFiltroId }, { order: 'nome_completo' })
      : base44.entities.Cliente.list('nome_completo'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ContaReceber.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-receber'] });
      toast.success("Conta criada!");
      setDialogConta(false);
      setFormData({ cliente_id: "", cliente_nome: "", descricao: "", valor_total: "", data_vencimento: "" });
    },
  });

  const handleSubmit = () => {
    // CRÍTICO: Validações financeiras
    if (!formData.cliente_nome || !formData.descricao || !formData.valor_total || !formData.data_vencimento) {
      toast.error("Preencha todos os campos!");
      return;
    }

    const valorNumerico = parseValorBRL(formData.valor_total);
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      toast.error("Valor deve ser maior que zero!");
      return;
    }

    createMutation.mutate({
      cliente_id: formData.cliente_id || null,
      cliente_nome: formData.cliente_nome,
      descricao: formData.descricao,
      valor: valorNumerico,
      valor_pago: 0,
      status: "pendente",
      data_vencimento: formData.data_vencimento,
      loja_id: lojaFiltroId || user?.loja_id || null
    });
  };

  const selecionarCliente = (cliente) => {
    setFormData({
      ...formData,
      cliente_id: cliente.id,
      cliente_nome: cliente.nome_completo
    });
    setClienteOpen(false);
  };

  const baixarMutation = useMutation({
    mutationFn: async ({ id, valor }) => {
      // CORREÇÃO: Verificar idempotência para evitar pagamentos duplicados
      const paymentKey = `${id}_${valor}_${Date.now()}`;
      if (lastPaymentRef.current && Date.now() - lastPaymentRef.current.timestamp < 5000) {
        if (lastPaymentRef.current.id === id && lastPaymentRef.current.valor === valor) {
          throw new Error("Pagamento já processado. Aguarde alguns segundos.");
        }
      }

      // CRÍTICO: Validação de baixa
      if (valor <= 0) {
        throw new Error("Valor da baixa deve ser maior que zero!");
      }

      // CORREÇÃO: Usar matemática de centavos para evitar erros de precisão
      const valorCentavos = Math.round(valor * 100);

      // CORREÇÃO: Buscar dados FRESCOS do banco para evitar race condition
      const contaAtual = await base44.entities.ContaReceber.get(id);
      if (!contaAtual) {
        throw new Error("Conta não encontrada!");
      }

      // Verificar se conta já foi paga
      if (contaAtual.status === "pago") {
        throw new Error("Esta conta já foi totalmente paga!");
      }

      // CRÍTICO: Cálculos seguros de baixa com centavos
      const valorTotalCentavos = Math.round((parseFloat(contaAtual.valor) || 0) * 100);
      const valorRecebidoCentavos = Math.round((parseFloat(contaAtual.valor_pago) || 0) * 100);
      const valorPendenteCentavos = valorTotalCentavos - valorRecebidoCentavos;

      if (valorCentavos > valorPendenteCentavos) {
        throw new Error(`Valor excede o pendente! Máximo: R$ ${(valorPendenteCentavos / 100).toFixed(2)}`);
      }

      const novoValorRecebidoCentavos = valorRecebidoCentavos + valorCentavos;
      const novoValorRecebido = novoValorRecebidoCentavos / 100;
      const novaSituacao = novoValorRecebidoCentavos >= valorTotalCentavos ? "pago" : "parcial";

      // Registrar pagamento para idempotência
      lastPaymentRef.current = { id, valor, timestamp: Date.now() };

      return await base44.entities.ContaReceber.update(id, {
        valor_pago: novoValorRecebido,
        status: novaSituacao,
        data_pagamento: novaSituacao === "pago" ? new Date().toISOString().split('T')[0] : (contaAtual.data_pagamento || null)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-receber'] });
      toast.success("Baixa realizada com sucesso!");
      setDialogBaixa(false);
      setIsProcessingPayment(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao processar baixa");
      setIsProcessingPayment(false);
    },
  });

  const hoje = startOfDay(new Date());
  
  const contasVencidas = contas.filter(c => c.status !== "pago" && isBefore(new Date(c.data_vencimento), hoje));
  const contasHoje = contas.filter(c => c.status !== "pago" && format(new Date(c.data_vencimento), 'yyyy-MM-dd') === format(hoje, 'yyyy-MM-dd'));
  const contasFuturas = contas.filter(c => c.status !== "pago" && isAfter(new Date(c.data_vencimento), hoje));

  // CRÍTICO: Cálculos seguros dos totais pendentes
  const totalVencidas = contasVencidas.reduce((sum, c) => sum + ((parseFloat(c.valor) || 0) - (parseFloat(c.valor_pago) || 0)), 0);
  const totalHoje = contasHoje.reduce((sum, c) => sum + ((parseFloat(c.valor) || 0) - (parseFloat(c.valor_pago) || 0)), 0);
  const totalFuturas = contasFuturas.reduce((sum, c) => sum + ((parseFloat(c.valor) || 0) - (parseFloat(c.valor_pago) || 0)), 0);

  const abrirDialogBaixa = (conta) => {
    setContaSelecionada(conta);
    const valorPendente = ((parseFloat(conta.valor) || 0) - (parseFloat(conta.valor_pago) || 0)).toFixed(2);
    setValorBaixa(formatarValorBRL(valorPendente.replace('.', '')));
    setDialogBaixa(true);
  };

  // Aplicar filtros
  const contasFiltradas = contas.filter(c => {
    const matchBusca = !buscaTexto || 
      c.cliente_nome?.toLowerCase().includes(buscaTexto.toLowerCase()) ||
      c.descricao?.toLowerCase().includes(buscaTexto.toLowerCase());
    const matchSituacao = filtroSituacao === "todos" || c.status === filtroSituacao;
    return matchBusca && matchSituacao;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Contas a Receber</h1>
          <p className="text-slate-500">Gerencie recebimentos</p>
        </div>
        <Button onClick={() => setDialogConta(true)} className="bg-green-600">
          <Plus className="w-4 h-4 mr-2" />
          Nova Conta
        </Button>
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
              placeholder="Buscar por cliente ou descrição..."
              value={buscaTexto}
              onChange={(e) => { setBuscaTexto(e.target.value); setPaginaTab({ vencidas: 1, hoje: 1, futuras: 1, todas: 1 }); }}
              className="flex-1 min-w-[250px]"
            />
            <Select value={filtroSituacao} onValueChange={setFiltroSituacao}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas Situações</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
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
          <TabsTrigger value="todas">Todas</TabsTrigger>
        </TabsList>

        {['vencidas', 'hoje', 'futuras', 'todas'].map((tab) => {
          const listaBase = tab === 'vencidas' ? contasVencidas : tab === 'hoje' ? contasHoje : tab === 'futuras' ? contasFuturas : contas;
          const lista = listaBase.filter(c => {
            const matchBusca = !buscaTexto || 
              c.cliente_nome?.toLowerCase().includes(buscaTexto.toLowerCase()) ||
              c.descricao?.toLowerCase().includes(buscaTexto.toLowerCase());
            const matchSituacao = filtroSituacao === "todos" || c.status === filtroSituacao;
            return matchBusca && matchSituacao;
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
                        <TableHead>Cliente</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Recebido</TableHead>
                        <TableHead>Situação</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lista.slice((pag - 1) * ITENS_POR_PAGINA, pag * ITENS_POR_PAGINA).map((conta) => (
                        <TableRow key={conta.id}>
                          <TableCell>{conta.cliente_nome}</TableCell>
                          <TableCell>{conta.descricao}</TableCell>
                          <TableCell>{format(new Date(conta.data_vencimento), 'dd/MM/yyyy')}</TableCell>
                          <TableCell className="font-semibold">R$ {(parseFloat(conta.valor) || 0).toFixed(2)}</TableCell>
                          <TableCell>R$ {(conta.valor_pago || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={conta.status === "pago" ? "default" : conta.status === "parcial" ? "secondary" : "destructive"}>
                              {conta.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {conta.status !== "pago" && (
                              <Button size="sm" onClick={() => abrirDialogBaixa(conta)}>
                                Baixar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
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
      </Tabs>

      <Dialog open={dialogConta} onOpenChange={setDialogConta}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Conta a Receber</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cliente</Label>
              <Popover open={clienteOpen} onOpenChange={setClienteOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clienteOpen}
                    className="w-full justify-between font-normal"
                  >
                    {formData.cliente_nome || "Selecione um cliente..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar cliente..." />
                    <CommandList>
                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      <CommandGroup>
                        {clientes.filter(c => c.ativo !== false).map((cliente) => (
                          <CommandItem
                            key={cliente.id}
                            value={cliente.nome_completo}
                            onSelect={() => selecionarCliente(cliente)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.cliente_id === cliente.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{cliente.nome_completo}</span>
                              {cliente.telefone1 && (
                                <span className="text-xs text-muted-foreground">{cliente.telefone1}</span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input 
                value={formData.descricao}
                onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                placeholder="Ex: Venda a prazo, Serviço..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor Total</Label>
                <InputMoeda
                  value={formData.valor_total}
                  onChange={(valor) => setFormData({ ...formData, valor_total: valor })}
                />
              </div>
              <div>
                <Label>Data de Vencimento</Label>
                <Input 
                  type="date"
                  value={formData.data_vencimento}
                  onChange={(e) => setFormData({...formData, data_vencimento: e.target.value})}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogConta(false)}>Cancelar</Button>
            <Button onClick={handleSubmit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogBaixa} onOpenChange={setDialogBaixa}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Baixar Conta a Receber</DialogTitle>
          </DialogHeader>
          {contaSelecionada && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded">
                <p className="text-sm text-slate-600">Cliente: {contaSelecionada.cliente_nome}</p>
                <p className="text-sm text-slate-600">Total: R$ {contaSelecionada.valor?.toFixed(2)}</p>
                <p className="text-sm text-slate-600">Recebido: R$ {(contaSelecionada.valor_pago || 0).toFixed(2)}</p>
                <p className="text-sm font-bold">Falta: R$ {(contaSelecionada.valor - (contaSelecionada.valor_pago || 0)).toFixed(2)}</p>
              </div>
              <div>
                <Label>Valor a Receber</Label>
                <InputMoeda
                  value={valorBaixa}
                  onChange={setValorBaixa}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogBaixa(false)} disabled={isProcessingPayment}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (isProcessingPayment) return;
                setIsProcessingPayment(true);
                baixarMutation.mutate({ id: contaSelecionada.id, valor: parseValorBRL(valorBaixa) });
              }}
              disabled={isProcessingPayment || baixarMutation.isPending}
            >
              {isProcessingPayment || baixarMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                "Confirmar Baixa"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}