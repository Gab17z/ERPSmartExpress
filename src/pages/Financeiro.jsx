import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Wallet,
  PiggyBank,
  Receipt,
  FileText,
  Building2,
  Calendar,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart as PieChartIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts";
import { format, subDays, startOfMonth, endOfMonth, startOfDay, addDays, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Financeiro() {
  const [periodo, setPeriodo] = useState("30");
  const [activeTab, setActiveTab] = useState("visao-geral");
  const [paginaVencidas, setPaginaVencidas] = useState(1);
  const ITENS_POR_PAGINA = 20;

  // Queries
  const { data: vendas = [], isLoading: loadingVendas } = useQuery({
    queryKey: ['vendas'],
    queryFn: () => base44.entities.Venda.list('-created_date'),
  });

  const { data: contasReceber = [], isLoading: loadingReceber } = useQuery({
    queryKey: ['contas-receber'],
    queryFn: () => base44.entities.ContaReceber.list('-created_date'),
  });

  const { data: contasPagar = [], isLoading: loadingPagar } = useQuery({
    queryKey: ['contas-pagar'],
    queryFn: () => base44.entities.ContaPagar.list('-created_date'),
  });

  const { data: movimentacoes = [] } = useQuery({
    queryKey: ['movimentacoes'],
    queryFn: () => base44.entities.MovimentacaoCaixa.list('-created_date'),
  });

  const { data: contasBancarias = [] } = useQuery({
    queryKey: ['contas-bancarias'],
    queryFn: () => base44.entities.ContaBancaria.list(),
  });

  const { data: caixas = [] } = useQuery({
    queryKey: ['caixas'],
    queryFn: () => base44.entities.Caixa.list('-created_date'),
  });

  // Calculos consolidados
  const dadosFinanceiros = useMemo(() => {
    const hoje = new Date();
    const diasPeriodo = parseInt(periodo);
    const dataInicio = subDays(hoje, diasPeriodo);

    // Vendas do periodo
    const vendasPeriodo = vendas.filter(v => {
      const dataVenda = new Date(v.created_date);
      return dataVenda >= dataInicio && v.status === 'finalizada';
    });

    const faturamentoBruto = vendasPeriodo.reduce((sum, v) => sum + (v.subtotal || v.valor_total || 0), 0);
    const descontos = vendasPeriodo.reduce((sum, v) => sum + (v.desconto_total || v.desconto || 0), 0);
    const faturamentoLiquido = faturamentoBruto - descontos;

    // Contas a receber
    const receberPendente = contasReceber
      .filter(c => c.status === 'pendente')
      .reduce((sum, c) => sum + (c.valor || 0), 0);

    const receberVencido = contasReceber
      .filter(c => c.status === 'pendente' && new Date(c.data_vencimento) < hoje)
      .reduce((sum, c) => sum + (c.valor || 0), 0);

    const receberHoje = contasReceber
      .filter(c => c.status === 'pendente' && isSameDay(new Date(c.data_vencimento), hoje))
      .reduce((sum, c) => sum + (c.valor || 0), 0);

    // Contas a pagar
    const pagarPendente = contasPagar
      .filter(c => c.status === 'pendente')
      .reduce((sum, c) => sum + (c.valor || 0), 0);

    const pagarVencido = contasPagar
      .filter(c => c.status === 'pendente' && new Date(c.data_vencimento) < hoje)
      .reduce((sum, c) => sum + (c.valor || 0), 0);

    const pagarHoje = contasPagar
      .filter(c => c.status === 'pendente' && isSameDay(new Date(c.data_vencimento), hoje))
      .reduce((sum, c) => sum + (c.valor || 0), 0);

    // Saldo em caixa (calculado a partir dos campos reais - saldo_atual não existe na tabela)
    const caixaAberto = caixas.find(c => c.status === 'aberto');
    const saldoCaixa = caixaAberto
      ? (parseFloat(caixaAberto.valor_inicial) || 0) +
        (parseFloat(caixaAberto.total_vendas) || 0) +
        (parseFloat(caixaAberto.total_suprimentos) || 0) -
        (parseFloat(caixaAberto.total_sangrias) || 0)
      : 0;

    // Saldo bancario
    const saldoBancario = contasBancarias.reduce((sum, c) => sum + (c.saldo || 0), 0);

    // Saldo total
    const saldoTotal = saldoCaixa + saldoBancario;

    // Previsao proximos 7 dias
    const proximos7Dias = [];
    for (let i = 0; i < 7; i++) {
      const data = addDays(hoje, i);
      const receber = contasReceber
        .filter(c => c.status === 'pendente' && isSameDay(new Date(c.data_vencimento), data))
        .reduce((sum, c) => sum + (c.valor || 0), 0);
      const pagar = contasPagar
        .filter(c => c.status === 'pendente' && isSameDay(new Date(c.data_vencimento), data))
        .reduce((sum, c) => sum + (c.valor || 0), 0);

      proximos7Dias.push({
        data: format(data, 'dd/MM', { locale: ptBR }),
        dataCompleta: data,
        receber,
        pagar,
        saldo: receber - pagar
      });
    }

    // Evolucao diaria do periodo
    const evolucaoDiaria = [];
    for (let i = diasPeriodo - 1; i >= 0; i--) {
      const data = subDays(hoje, i);
      const vendasDia = vendasPeriodo.filter(v =>
        isSameDay(new Date(v.created_date), data)
      );
      const faturamentoDia = vendasDia.reduce((sum, v) => sum + (v.valor_total || 0), 0);

      evolucaoDiaria.push({
        data: format(data, 'dd/MM', { locale: ptBR }),
        faturamento: faturamentoDia,
        vendas: vendasDia.length
      });
    }

    // Formas de pagamento
    const formasPagamento = {};
    vendasPeriodo.forEach(v => {
      if (v.pagamentos && Array.isArray(v.pagamentos)) {
        v.pagamentos.forEach(p => {
          const forma = p.forma_pagamento || p.forma || 'outros';
          if (!formasPagamento[forma]) {
            formasPagamento[forma] = { valor: 0, count: 0 };
          }
          formasPagamento[forma].valor += p.valor || 0;
          formasPagamento[forma].count++;
        });
      }
    });

    const formasPagamentoArray = Object.entries(formasPagamento).map(([nome, dados]) => ({
      nome: formatarFormaPagamento(nome),
      valor: dados.valor,
      count: dados.count
    })).sort((a, b) => b.valor - a.valor);

    return {
      faturamentoBruto,
      faturamentoLiquido,
      descontos,
      receberPendente,
      receberVencido,
      receberHoje,
      pagarPendente,
      pagarVencido,
      pagarHoje,
      saldoCaixa,
      saldoBancario,
      saldoTotal,
      proximos7Dias,
      evolucaoDiaria,
      formasPagamento: formasPagamentoArray,
      totalVendas: vendasPeriodo.length,
      ticketMedio: vendasPeriodo.length > 0 ? faturamentoLiquido / vendasPeriodo.length : 0
    };
  }, [vendas, contasReceber, contasPagar, caixas, contasBancarias, periodo]);

  // Contas vencidas
  const contasVencidas = useMemo(() => {
    const hoje = new Date();
    const receberVencidas = contasReceber
      .filter(c => c.status === 'pendente' && new Date(c.data_vencimento) < hoje)
      .map(c => ({ ...c, tipo: 'receber' }));
    const pagarVencidas = contasPagar
      .filter(c => c.status === 'pendente' && new Date(c.data_vencimento) < hoje)
      .map(c => ({ ...c, tipo: 'pagar' }));

    return [...receberVencidas, ...pagarVencidas]
      .sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento));
  }, [contasReceber, contasPagar]);

  function formatarFormaPagamento(forma) {
    const mapa = {
      dinheiro: 'Dinheiro',
      pix: 'PIX',
      cartao_credito: 'Cartão Crédito',
      cartao_debito: 'Cartão Débito',
      credito: 'Cartão Crédito',
      credito_parcelado: 'Créd. Parcelado',
      debito: 'Cartão Débito',
      cheque: 'Cheque',
      boleto: 'Boleto',
      transferencia: 'Transferência',
      a_prazo: 'A Prazo',
      outros: 'Outros'
    };
    return mapa[forma] || forma;
  }

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
  };

  const isLoading = loadingVendas || loadingReceber || loadingPagar;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-gray-500 mt-1">Visão consolidada das finanças da empresa</p>
        </div>
        <div className="flex gap-2">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="15">Últimos 15 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="60">Últimos 60 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-white to-green-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-12 h-12 text-green-600 bg-green-100 p-2.5 rounded-xl shadow-sm" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Faturamento Líquido</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatarMoeda(dadosFinanceiros.faturamentoLiquido)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {dadosFinanceiros.totalVendas} vendas | Ticket: {formatarMoeda(dadosFinanceiros.ticketMedio)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-white to-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <ArrowDownRight className="w-12 h-12 text-blue-600 bg-blue-100 p-2.5 rounded-xl shadow-sm" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">A Receber</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatarMoeda(dadosFinanceiros.receberPendente)}
                </p>
                {dadosFinanceiros.receberVencido > 0 ? (
                  <p className="text-xs text-red-500 mt-1">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    {formatarMoeda(dadosFinanceiros.receberVencido)} vencido
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 mt-1">Nenhuma conta vencida</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-white to-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <ArrowUpRight className="w-12 h-12 text-red-600 bg-red-100 p-2.5 rounded-xl shadow-sm" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">A Pagar</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatarMoeda(dadosFinanceiros.pagarPendente)}
                </p>
                {dadosFinanceiros.pagarVencido > 0 ? (
                  <p className="text-xs text-red-500 mt-1">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    {formatarMoeda(dadosFinanceiros.pagarVencido)} vencido
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 mt-1">Nenhuma conta vencida</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-l-4 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br ${dadosFinanceiros.saldoTotal >= 0 ? 'border-l-emerald-500 from-white to-emerald-50' : 'border-l-orange-500 from-white to-orange-50'}`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Wallet className={`w-12 h-12 p-2.5 rounded-xl shadow-sm ${dadosFinanceiros.saldoTotal >= 0 ? 'text-emerald-600 bg-emerald-100' : 'text-orange-600 bg-orange-100'}`} />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Saldo Total</p>
                <p className={`text-2xl font-bold ${dadosFinanceiros.saldoTotal >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                  {formatarMoeda(dadosFinanceiros.saldoTotal)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Caixa: {formatarMoeda(dadosFinanceiros.saldoCaixa)} | Banco: {formatarMoeda(dadosFinanceiros.saldoBancario)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="fluxo">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="vencidas">
            Contas Vencidas
            {contasVencidas.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">{contasVencidas.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="acessos">Acessos Rápidos</TabsTrigger>
        </TabsList>

        {/* Visao Geral */}
        <TabsContent value="visao-geral" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Grafico de Evolucao */}
            <Card>
              <CardHeader>
                <CardTitle>Evolução do Faturamento</CardTitle>
                <CardDescription>Últimos {periodo} dias</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dadosFinanceiros.evolucaoDiaria}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="data" />
                    <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value) => formatarMoeda(value)}
                      labelFormatter={(label) => `Data: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="faturamento"
                      stroke="#3b82f6"
                      fill="#93c5fd"
                      name="Faturamento"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Formas de Pagamento */}
            <Card>
              <CardHeader>
                <CardTitle>Formas de Pagamento</CardTitle>
                <CardDescription>Distribuição no período</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dadosFinanceiros.formasPagamento}
                      dataKey="valor"
                      nameKey="nome"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ nome, percent }) => `${nome} ${(percent * 100).toFixed(0)}%`}
                    >
                      {dadosFinanceiros.formasPagamento.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatarMoeda(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Previsão Próximos 7 Dias */}
          <Card>
            <CardHeader>
              <CardTitle>Previsão Próximos 7 Dias</CardTitle>
              <CardDescription>Entradas e saídas previstas</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dadosFinanceiros.proximos7Dias}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" />
                  <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => formatarMoeda(value)} />
                  <Legend />
                  <Bar dataKey="receber" fill="#10b981" name="A Receber" />
                  <Bar dataKey="pagar" fill="#ef4444" name="A Pagar" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fluxo de Caixa */}
        <TabsContent value="fluxo">
          <Card>
            <CardHeader>
              <CardTitle>Fluxo de Caixa - Próximos 7 Dias</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Entradas</TableHead>
                    <TableHead className="text-right">Saidas</TableHead>
                    <TableHead className="text-right">Saldo do Dia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosFinanceiros.proximos7Dias.map((dia, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {format(dia.dataCompleta, "EEEE, dd/MM", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatarMoeda(dia.receber)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatarMoeda(dia.pagar)}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${dia.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatarMoeda(dia.saldo)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contas Vencidas */}
        <TabsContent value="vencidas">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                Contas Vencidas
              </CardTitle>
              <CardDescription>
                {contasVencidas.length} contas com vencimento atrasado
              </CardDescription>
            </CardHeader>
            <CardContent>
              {contasVencidas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <p>Nenhuma conta vencida!</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Dias em Atraso</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contasVencidas.slice((paginaVencidas - 1) * ITENS_POR_PAGINA, paginaVencidas * ITENS_POR_PAGINA).map((conta) => {
                        const diasAtrasados = Math.floor(
                          (new Date() - new Date(conta.data_vencimento)) / (1000 * 60 * 60 * 24)
                        );
                        return (
                          <TableRow key={conta.id}>
                            <TableCell>
                              <Badge variant={conta.tipo === 'receber' ? 'default' : 'destructive'}>
                                {conta.tipo === 'receber' ? 'Receber' : 'Pagar'}
                              </Badge>
                            </TableCell>
                            <TableCell>{conta.descricao || '-'}</TableCell>
                            <TableCell>
                              {format(new Date(conta.data_vencimento), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="destructive">{diasAtrasados} dias</Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatarMoeda(conta.valor)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {Math.ceil(contasVencidas.length / ITENS_POR_PAGINA) > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <span className="text-sm text-slate-500">
                        Mostrando {((paginaVencidas - 1) * ITENS_POR_PAGINA) + 1}-{Math.min(paginaVencidas * ITENS_POR_PAGINA, contasVencidas.length)} de {contasVencidas.length}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled={paginaVencidas <= 1} onClick={() => setPaginaVencidas(p => p - 1)}>
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm font-medium px-2">{paginaVencidas} / {Math.ceil(contasVencidas.length / ITENS_POR_PAGINA)}</span>
                        <Button variant="outline" size="sm" disabled={paginaVencidas >= Math.ceil(contasVencidas.length / ITENS_POR_PAGINA)} onClick={() => setPaginaVencidas(p => p + 1)}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Acessos Rapidos */}
        <TabsContent value="acessos">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: 'Contas a Receber', icon: ArrowDownRight, url: 'ContasReceber', bg: 'bg-blue-100', text: 'text-blue-600', desc: 'Gerenciar recebimentos' },
              { title: 'Contas a Pagar', icon: ArrowUpRight, url: 'ContasPagar', bg: 'bg-red-100', text: 'text-red-600', desc: 'Gerenciar pagamentos' },
              { title: 'Fluxo de Caixa', icon: TrendingUp, url: 'FluxoCaixa', bg: 'bg-green-100', text: 'text-green-600', desc: 'Projeção financeira' },
              { title: 'Contas Bancárias', icon: Building2, url: 'ContasBancarias', bg: 'bg-purple-100', text: 'text-purple-600', desc: 'Saldos e movimentações' },
              { title: 'Centro de Custos', icon: PieChartIcon, url: 'CentroCustos', bg: 'bg-orange-100', text: 'text-orange-600', desc: 'Análise por categoria' },
              { title: 'Conciliação', icon: CheckCircle, url: 'ConciliacaoBancaria', bg: 'bg-cyan-100', text: 'text-cyan-600', desc: 'Conferência bancária' },
              { title: 'Contas Recorrentes', icon: RefreshCw, url: 'ContasRecorrentes', bg: 'bg-pink-100', text: 'text-pink-600', desc: 'Despesas fixas' },
              { title: 'DRE', icon: BarChart3, url: 'DRE', bg: 'bg-indigo-100', text: 'text-indigo-600', desc: 'Demonstrativo de resultados' },
              { title: 'Movimentação', icon: Receipt, url: 'MovimentacaoFinanceira', bg: 'bg-teal-100', text: 'text-teal-600', desc: 'Histórico de lançamentos' },
            ].map((item) => {
              const IconComponent = item.icon;
              return (
                <Link key={item.url} to={createPageUrl(item.url)}>
                  <Card className="hover:border-blue-300 hover:shadow-md transition-all cursor-pointer h-full">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 ${item.bg} rounded-xl`}>
                          <IconComponent className={`w-6 h-6 ${item.text}`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{item.title}</h3>
                          <p className="text-sm text-gray-500">{item.desc}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
