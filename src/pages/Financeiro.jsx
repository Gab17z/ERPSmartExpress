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

    // Saldo em caixa
    const caixaAberto = caixas.find(c => c.status === 'aberto');
    const saldoCaixa = caixaAberto?.saldo_atual || 0;

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
          const forma = p.forma || 'outros';
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
      credito: 'Cartao Credito',
      credito_parcelado: 'Credito Parcelado',
      debito: 'Cartao Debito',
      boleto: 'Boleto',
      transferencia: 'Transferencia',
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
          <p className="text-gray-500 mt-1">Visao consolidada das financas da empresa</p>
        </div>
        <div className="flex gap-2">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Ultimos 7 dias</SelectItem>
              <SelectItem value="15">Ultimos 15 dias</SelectItem>
              <SelectItem value="30">Ultimos 30 dias</SelectItem>
              <SelectItem value="60">Ultimos 60 dias</SelectItem>
              <SelectItem value="90">Ultimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Faturamento</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatarMoeda(dadosFinanceiros.faturamentoLiquido)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {dadosFinanceiros.totalVendas} vendas | Ticket: {formatarMoeda(dadosFinanceiros.ticketMedio)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">A Receber</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatarMoeda(dadosFinanceiros.receberPendente)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <ArrowDownRight className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            {dadosFinanceiros.receberVencido > 0 && (
              <p className="text-xs text-red-500 mt-2">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                {formatarMoeda(dadosFinanceiros.receberVencido)} vencido
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">A Pagar</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatarMoeda(dadosFinanceiros.pagarPendente)}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <ArrowUpRight className="w-6 h-6 text-red-600" />
              </div>
            </div>
            {dadosFinanceiros.pagarVencido > 0 && (
              <p className="text-xs text-red-500 mt-2">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                {formatarMoeda(dadosFinanceiros.pagarVencido)} vencido
              </p>
            )}
          </CardContent>
        </Card>

        <Card className={dadosFinanceiros.saldoTotal >= 0 ? 'border-green-200' : 'border-red-200'}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Saldo Total</p>
                <p className={`text-2xl font-bold ${dadosFinanceiros.saldoTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatarMoeda(dadosFinanceiros.saldoTotal)}
                </p>
              </div>
              <div className={`p-3 rounded-full ${dadosFinanceiros.saldoTotal >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                <Wallet className={`w-6 h-6 ${dadosFinanceiros.saldoTotal >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Caixa: {formatarMoeda(dadosFinanceiros.saldoCaixa)} | Banco: {formatarMoeda(dadosFinanceiros.saldoBancario)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="visao-geral">Visao Geral</TabsTrigger>
          <TabsTrigger value="fluxo">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="vencidas">Contas Vencidas</TabsTrigger>
          <TabsTrigger value="acessos">Acessos Rapidos</TabsTrigger>
        </TabsList>

        {/* Visao Geral */}
        <TabsContent value="visao-geral" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Grafico de Evolucao */}
            <Card>
              <CardHeader>
                <CardTitle>Evolucao do Faturamento</CardTitle>
                <CardDescription>Ultimos {periodo} dias</CardDescription>
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
                <CardDescription>Distribuicao no periodo</CardDescription>
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

          {/* Previsao Proximos 7 Dias */}
          <Card>
            <CardHeader>
              <CardTitle>Previsao Proximos 7 Dias</CardTitle>
              <CardDescription>Entradas e saidas previstas</CardDescription>
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
              <CardTitle>Fluxo de Caixa - Proximos 7 Dias</CardTitle>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descricao</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Dias Atrasados</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contasVencidas.slice(0, 20).map((conta) => {
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Acessos Rapidos */}
        <TabsContent value="acessos">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: 'Contas a Receber', icon: ArrowDownRight, url: 'ContasReceber', color: 'blue', desc: 'Gerenciar recebimentos' },
              { title: 'Contas a Pagar', icon: ArrowUpRight, url: 'ContasPagar', color: 'red', desc: 'Gerenciar pagamentos' },
              { title: 'Fluxo de Caixa', icon: TrendingUp, url: 'FluxoCaixa', color: 'green', desc: 'Projecao financeira' },
              { title: 'Contas Bancarias', icon: Building2, url: 'ContasBancarias', color: 'purple', desc: 'Saldos e movimentacoes' },
              { title: 'Centro de Custos', icon: PieChartIcon, url: 'CentroCustos', color: 'orange', desc: 'Analise por categoria' },
              { title: 'Conciliacao', icon: CheckCircle, url: 'ConciliacaoBancaria', color: 'cyan', desc: 'Conferencia bancaria' },
              { title: 'Contas Recorrentes', icon: RefreshCw, url: 'ContasRecorrentes', color: 'pink', desc: 'Despesas fixas' },
              { title: 'DRE', icon: BarChart3, url: 'DRE', color: 'indigo', desc: 'Demonstrativo de resultados' },
              { title: 'Movimentacao', icon: Receipt, url: 'MovimentacaoFinanceira', color: 'teal', desc: 'Historico de lancamentos' },
            ].map((item) => {
              const IconComponent = item.icon;
              return (
                <Link key={item.url} to={createPageUrl(item.url)}>
                  <Card className="hover:border-blue-300 transition-colors cursor-pointer h-full">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 bg-${item.color}-100 rounded-full`}>
                          <IconComponent className={`w-6 h-6 text-${item.color}-600`} />
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
