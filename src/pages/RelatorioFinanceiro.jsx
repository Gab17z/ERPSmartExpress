import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useLoja } from "@/contexts/LojaContext";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subDays, isWithinInterval, parseISO, startOfMonth, startOfDay } from "date-fns";
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, Download, ArrowRight, Calendar, Receipt, CreditCard } from "lucide-react";
import DateRangeFilter from "@/components/DateRangeFilter";
import { toast } from "sonner";
import { exportFinanceiroPDF } from "@/utils/pdfExport";

const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6'];

export default function RelatorioFinanceiro() {
  const { lojaFiltroId } = useLoja();
  const navigate = useNavigate();
  const hoje = new Date();
  const [filtro, setFiltro] = useState({
    dataInicio: format(startOfMonth(hoje), 'yyyy-MM-dd'),
    dataFim: format(hoje, 'yyyy-MM-dd')
  });

  const filtrarPorData = (data) => {
    if (!data) return false;
    try {
      const dataComparar = data.includes('T') ? data.split('T')[0] : data;
      return dataComparar >= filtro.dataInicio && dataComparar <= filtro.dataFim;
    } catch {
      return false;
    }
  };

  const { data: vendas = [] } = useQuery({
    queryKey: ['vendas', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.Venda.filter({ loja_id: lojaFiltroId }, { order: '-created_date' })
      : base44.entities.Venda.list('-created_date'),
  });

  const { data: contasReceber = [] } = useQuery({
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
  });

  const { data: contasPagar = [] } = useQuery({
    queryKey: ['contas-pagar', lojaFiltroId],
    queryFn: async () => {
      try {
        return lojaFiltroId
          ? await base44.entities.ContaPagar.filter({ loja_id: lojaFiltroId }, { order: '-data_vencimento' })
          : await base44.entities.ContaPagar.list('-data_vencimento');
      } catch {
        return [];
      }
    },
  });

  const { data: comissoes = [] } = useQuery({
    queryKey: ['comissoes', lojaFiltroId],
    queryFn: async () => {
      try {
        return lojaFiltroId
          ? await base44.entities.Comissao.filter({ loja_id: lojaFiltroId })
          : await base44.entities.Comissao.list();
      } catch {
        return [];
      }
    },
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.Produto.filter({ loja_id: lojaFiltroId })
      : base44.entities.Produto.list(),
  });

  // CORREÇÃO: Adicionar MovimentacaoCaixa para incluir sangria/suplemento
  const { data: movimentacoesCaixa = [] } = useQuery({
    queryKey: ['movimentacoes-caixa', lojaFiltroId],
    queryFn: async () => {
      try {
        return lojaFiltroId
          ? await base44.entities.MovimentacaoCaixa.filter({ loja_id: lojaFiltroId }, { order: '-created_date' })
          : await base44.entities.MovimentacaoCaixa.list('-created_date');
      } catch {
        return [];
      }
    },
  });

  // Cálculos baseados no período
  const vendasPeriodo = vendas.filter(v => v.status === 'finalizada' && filtrarPorData(v.created_date));
  const contasRecebidasPeriodo = contasReceber.filter(c => c.status === 'pago' && c.data_pagamento && filtrarPorData(c.data_pagamento));
  const contasPagasPeriodo = contasPagar.filter(c => c.status === 'pago' && c.data_pagamento && filtrarPorData(c.data_pagamento));
  const comissoesPagasPeriodo = comissoes.filter(c => c.status === 'pago' && c.data_pagamento && filtrarPorData(c.data_pagamento));

  // CORREÇÃO: Filtrar movimentações de caixa (sangria/suplemento)
  const sangriasPeriodo = movimentacoesCaixa.filter(m =>
    m.tipo === 'sangria' && filtrarPorData(m.created_date)
  );
  const suplementosPeriodo = movimentacoesCaixa.filter(m =>
    m.tipo === 'suplemento' && filtrarPorData(m.created_date)
  );
  const totalSangrias = sangriasPeriodo.reduce((sum, m) => sum + (parseFloat(m.valor) || 0), 0);
  const totalSuplementos = suplementosPeriodo.reduce((sum, m) => sum + (parseFloat(m.valor) || 0), 0);

  // CRÍTICO: Valores financeiros com validação
  const receitaVendas = vendasPeriodo.reduce((sum, v) => sum + (parseFloat(v.valor_total) || 0), 0);
  const receitaOutras = contasRecebidasPeriodo.reduce((sum, c) => sum + (parseFloat(c.valor_pago || c.valor) || 0), 0);
  const receitaTotal = receitaVendas + receitaOutras + totalSuplementos;

  // CRÍTICO: Despesas = Contas Pagas + Comissões Pagas + Sangrias
  const despesasContasPagar = contasPagasPeriodo.reduce((sum, c) => sum + (parseFloat(c.valor) || 0), 0);
  const despesasComissoes = comissoesPagasPeriodo.reduce((sum, c) => sum + (parseFloat(c.valor_comissao) || 0), 0);
  const despesasTotal = despesasContasPagar + despesasComissoes + totalSangrias;
  const saldo = receitaTotal - despesasTotal;

  // CRÍTICO: Lucro com validação (alinhado com Dashboard)
  const lucroVendas = vendasPeriodo.reduce((sum, venda) => {
    const custoTotal = venda.itens?.reduce((itemSum, item) => {
      // CORREÇÃO: Priorizar custo congelado da venda
      const custoCongelado = item.preco_custo ?? item.custo_unitario;
      const custoProduto = custoCongelado != null ? custoCongelado : (produtos.find(p => p.id === item.produto_id)?.preco_custo ?? 0);
      return itemSum + ((parseFloat(custoProduto) || 0) * (parseInt(item.quantidade) || 0));
    }, 0) || 0;
    return sum + ((parseFloat(venda.valor_total) || 0) - custoTotal);
  }, 0);

  const margemLucro = receitaVendas > 0 ? (lucroVendas / receitaVendas) * 100 : 0;

  // Pendências
  const contasReceberPendentes = contasReceber.filter(c => c.status !== 'pago').reduce((sum, c) => sum + ((parseFloat(c.valor) || 0) - (parseFloat(c.valor_pago) || 0)), 0);
  const contasPagarPendentes = contasPagar.filter(c => c.status !== 'pago').reduce((sum, c) => sum + Math.max(0, (parseFloat(c.valor) || 0) - (parseFloat(c.valor_pago) || 0)), 0);

  // Contas vencidas
  const hojeDate = startOfDay(new Date());
  const contasReceberVencidas = contasReceber.filter(c => c.status !== 'pago' && new Date(c.data_vencimento) < hojeDate);
  const contasPagarVencidas = contasPagar.filter(c => c.status !== 'pago' && new Date(c.data_vencimento) < hojeDate);

  // Fluxo de caixa diário
  const diasPeriodo = Math.ceil((new Date(filtro.dataFim) - new Date(filtro.dataInicio)) / (1000 * 60 * 60 * 24)) + 1;
  const fluxoDiario = Array.from({ length: Math.min(diasPeriodo, 60) }, (_, i) => {
    const data = new Date(filtro.dataInicio);
    data.setDate(data.getDate() + i);
    const dataStr = format(data, 'yyyy-MM-dd');
    
    const entradasVendasDia = vendas.filter(v =>
      v.status === 'finalizada' &&
      format(new Date(v.created_date), 'yyyy-MM-dd') === dataStr
    ).reduce((sum, v) => sum + (parseFloat(v.valor_total) || 0), 0);

    // CORREÇÃO: Incluir suplementos nas entradas
    const suplementosDia = movimentacoesCaixa.filter(m =>
      m.tipo === 'suplemento' &&
      format(new Date(m.created_date), 'yyyy-MM-dd') === dataStr
    ).reduce((sum, m) => sum + (parseFloat(m.valor) || 0), 0);

    const entradasDia = entradasVendasDia + suplementosDia;

    // Saídas do dia = Contas Pagas + Comissões Pagas + Sangrias
    const saidasContasPagarDia = contasPagar.filter(c =>
      c.status === 'pago' &&
      c.data_pagamento &&
      format(new Date(c.data_pagamento), 'yyyy-MM-dd') === dataStr
    ).reduce((sum, c) => sum + (parseFloat(c.valor) || 0), 0);

    const saidasComissoesDia = comissoes.filter(c =>
      c.status === 'pago' &&
      c.data_pagamento &&
      format(new Date(c.data_pagamento), 'yyyy-MM-dd') === dataStr
    ).reduce((sum, c) => sum + (parseFloat(c.valor_comissao) || 0), 0);

    // CORREÇÃO: Incluir sangrias nas saídas
    const sangriasDia = movimentacoesCaixa.filter(m =>
      m.tipo === 'sangria' &&
      format(new Date(m.created_date), 'yyyy-MM-dd') === dataStr
    ).reduce((sum, m) => sum + (parseFloat(m.valor) || 0), 0);

    const saidasDia = saidasContasPagarDia + saidasComissoesDia + sangriasDia;
    
    return {
      data: format(data, 'dd/MM'),
      entradas: entradasDia,
      saidas: saidasDia,
      saldo: entradasDia - saidasDia
    };
  });

  // CRÍTICO: Despesas por categoria (Contas + Comissões)
  const despesasPorCategoria = contasPagasPeriodo.reduce((acc, c) => {
    const cat = c.categoria || 'outros';
    acc[cat] = (acc[cat] || 0) + (parseFloat(c.valor) || 0);
    return acc;
  }, {});

  // Adicionar comissões como categoria separada
  const totalComissoesPagas = comissoesPagasPeriodo.reduce((sum, c) => sum + (parseFloat(c.valor_comissao) || 0), 0);
  if (totalComissoesPagas > 0) {
    despesasPorCategoria['comissões'] = totalComissoesPagas;
  }

  // CORREÇÃO: Adicionar sangrias como categoria separada
  if (totalSangrias > 0) {
    despesasPorCategoria['sangrias'] = totalSangrias;
  }

  const dadosDespesas = Object.entries(despesasPorCategoria).map(([cat, valor]) => ({
    name: cat.toUpperCase(),
    value: valor
  })).sort((a, b) => b.value - a.value);

  // Receitas vs Despesas
  const dadosComparacao = [
    { name: 'Receitas', valor: receitaTotal },
    { name: 'Despesas', valor: despesasTotal },
    { name: 'Lucro', valor: Math.max(0, saldo) }
  ];

  const exportarCSV = () => {
    const headers = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor', 'Situação'];
    const rows = [
      ...vendasPeriodo.map(v => [
        format(new Date(v.created_date), 'dd/MM/yyyy'),
        'Receita',
        `Venda ${v.codigo_venda}`,
        'Venda',
        (parseFloat(v.valor_total) || 0).toFixed(2),
        v.status
      ]),
      ...contasRecebidasPeriodo.map(c => [
        format(new Date(c.data_pagamento), 'dd/MM/yyyy'),
        'Receita',
        c.descricao,
        'Conta a Receber',
        (parseFloat(c.valor_pago || c.valor) || 0).toFixed(2),
        c.status
      ]),
      ...contasPagasPeriodo.map(c => [
        format(new Date(c.data_pagamento), 'dd/MM/yyyy'),
        'Despesa',
        c.descricao,
        c.categoria,
        (parseFloat(c.valor) || 0).toFixed(2),
        c.status
      ]),
      ...comissoesPagasPeriodo.map(c => [
        format(new Date(c.data_pagamento), 'dd/MM/yyyy'),
        'Despesa',
        `Comissão - ${c.vendedor_nome}`,
        'comissões',
        (parseFloat(c.valor_comissao) || 0).toFixed(2),
        'pago'
      ]),
      // CORREÇÃO: Incluir sangrias e suplementos na exportação
      ...sangriasPeriodo.map(m => [
        format(new Date(m.created_date), 'dd/MM/yyyy'),
        'Despesa',
        m.descricao || 'Sangria de caixa',
        'sangrias',
        (parseFloat(m.valor) || 0).toFixed(2),
        'realizado'
      ]),
      ...suplementosPeriodo.map(m => [
        format(new Date(m.created_date), 'dd/MM/yyyy'),
        'Receita',
        m.descricao || 'Suplemento de caixa',
        'suplementos',
        (parseFloat(m.valor) || 0).toFixed(2),
        'realizado'
      ])
    ];

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_financeiro_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success("Relatório exportado!");
  };

  const exportarPDF = () => {
    const resumo = {
      'Receita Total': `R$ ${receitaTotal.toFixed(2)}`,
      'Despesas Total': `R$ ${despesasTotal.toFixed(2)}`,
      'Saldo': `R$ ${saldo.toFixed(2)}`,
      'Margem de Lucro': `${margemLucro.toFixed(1)}%`
    };

    const headers = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor'];
    const data = [
      ...vendasPeriodo.map(v => [
        format(new Date(v.created_date), 'dd/MM/yyyy'),
        'Receita',
        `Venda ${v.codigo_venda}`,
        'Venda',
        `R$ ${(parseFloat(v.valor_total) || 0).toFixed(2)}`
      ]),
      ...contasPagasPeriodo.map(c => [
        format(new Date(c.data_pagamento), 'dd/MM/yyyy'),
        'Despesa',
        c.descricao,
        c.categoria,
        `R$ ${(parseFloat(c.valor) || 0).toFixed(2)}`
      ])
    ];

    exportFinanceiroPDF(
      'Relatório Financeiro',
      resumo,
      headers,
      data,
      'relatorio_financeiro'
    );
    toast.success("PDF exportado!");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Relatório Financeiro</h1>
          <p className="text-slate-500">Visão consolidada das finanças</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportarPDF} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
          <Button onClick={exportarCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <DateRangeFilter onFilterChange={setFiltro} />

      {/* Atalhos Rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button 
          variant="outline" 
          className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-green-50 hover:border-green-500"
          onClick={() => navigate(createPageUrl("ContasReceber"))}
        >
          <DollarSign className="w-6 h-6 text-green-600" />
          <div className="text-left">
            <p className="text-xs text-slate-500">Contas a Receber</p>
            <p className="font-bold text-lg">R$ {contasReceberPendentes.toFixed(2)}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 ml-auto" />
        </Button>

        <Button 
          variant="outline" 
          className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-red-50 hover:border-red-500"
          onClick={() => navigate(createPageUrl("ContasPagar"))}
        >
          <Receipt className="w-6 h-6 text-red-600" />
          <div className="text-left">
            <p className="text-xs text-slate-500">Contas a Pagar</p>
            <p className="font-bold text-lg">R$ {contasPagarPendentes.toFixed(2)}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 ml-auto" />
        </Button>

        <Button 
          variant="outline" 
          className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-blue-50 hover:border-blue-500"
          onClick={() => navigate(createPageUrl("FluxoCaixa"))}
        >
          <Calendar className="w-6 h-6 text-blue-600" />
          <div className="text-left">
            <p className="text-xs text-slate-500">Fluxo de Caixa</p>
            <p className="font-bold text-lg">{vendasPeriodo.length}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 ml-auto" />
        </Button>

        <Button 
          variant="outline" 
          className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-purple-50 hover:border-purple-500"
          onClick={() => navigate(createPageUrl("DRE"))}
        >
          <CreditCard className="w-6 h-6 text-purple-600" />
          <div className="text-left">
            <p className="text-xs text-slate-500">DRE</p>
            <p className="font-bold text-lg">Acessar</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 ml-auto" />
        </Button>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-sm opacity-90">Receitas no Período</p>
            <p className="text-3xl font-bold">R$ {receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs opacity-75 mt-1">{vendasPeriodo.length} vendas</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingDown className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-sm opacity-90">Despesas no Período</p>
            <p className="text-3xl font-bold">R$ {despesasTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs opacity-75 mt-1">{contasPagasPeriodo.length} contas + {comissoesPagasPeriodo.length} comissões</p>
          </CardContent>
        </Card>

        <Card className={`border-none shadow-lg bg-gradient-to-br ${saldo >= 0 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-orange-600'} text-white`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-sm opacity-90">Saldo do Período</p>
            <p className="text-3xl font-bold">R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs opacity-75 mt-1">Margem: {margemLucro.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-sm opacity-90">Contas Vencidas</p>
            <p className="text-3xl font-bold">{contasReceberVencidas.length + contasPagarVencidas.length}</p>
            <p className="text-xs opacity-75 mt-1">Requer atenção</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {(contasReceberVencidas.length > 0 || contasPagarVencidas.length > 0) && (
        <Card className="border-l-4 border-l-red-500 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Atenção: Contas Vencidas</h3>
                {contasReceberVencidas.length > 0 && (
                  <p className="text-sm text-red-700 mt-1">
                    {contasReceberVencidas.length} conta(s) a receber vencida(s) • Total: R$ {contasReceberVencidas.reduce((s, c) => s + ((parseFloat(c.valor) || 0) - (parseFloat(c.valor_pago) || 0)), 0).toFixed(2)}
                  </p>
                )}
                {contasPagarVencidas.length > 0 && (
                  <p className="text-sm text-red-700 mt-1">
                    {contasPagarVencidas.length} conta(s) a pagar vencida(s) • Total: R$ {contasPagarVencidas.reduce((s, c) => s + Math.max(0, (parseFloat(c.valor) || 0) - (parseFloat(c.valor_pago) || 0)), 0).toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="fluxo">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="fluxo">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="comparacao">Receitas x Despesas</TabsTrigger>
          <TabsTrigger value="despesas">Despesas</TabsTrigger>
          <TabsTrigger value="receber">A Receber</TabsTrigger>
          <TabsTrigger value="pagar">A Pagar</TabsTrigger>
        </TabsList>

        <TabsContent value="fluxo">
          <Card>
            <CardHeader>
              <CardTitle>Fluxo de Caixa - Entradas e Saídas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={fluxoDiario}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" angle={-45} textAnchor="end" height={80} style={{ fontSize: '11px' }} />
                  <YAxis />
                  <Tooltip formatter={(value) => `R$ ${(value || 0).toFixed(2)}`} />
                  <Legend />
                  <Line type="monotone" dataKey="entradas" stroke="#10b981" name="Entradas" strokeWidth={2} />
                  <Line type="monotone" dataKey="saidas" stroke="#ef4444" name="Saídas" strokeWidth={2} />
                  <Line type="monotone" dataKey="saldo" stroke="#3b82f6" name="Saldo" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparacao">
          <Card>
            <CardHeader>
              <CardTitle>Comparação Receitas x Despesas x Lucro</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={dadosComparacao}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `R$ ${(value || 0).toFixed(2)}`} />
                  <Bar dataKey="valor" fill="#3b82f6">
                    {dadosComparacao.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#ef4444' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="despesas">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Despesas por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dadosDespesas}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {dadosDespesas.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `R$ ${(value || 0).toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detalhamento por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dadosDespesas.map((cat, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell className="font-bold text-red-600">R$ {(cat.value || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {despesasTotal > 0 ? (((cat.value || 0) / despesasTotal) * 100).toFixed(1) : '0.0'}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="receber">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Contas a Receber Pendentes
                <Button size="sm" onClick={() => navigate(createPageUrl("ContasReceber"))}>
                  Ver Todas <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor Pendente</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contasReceber.filter(c => c.status !== 'pago').slice(0, 15).map(conta => (
                    <TableRow key={conta.id} className={new Date(conta.data_vencimento) < hojeDate ? 'bg-red-50' : ''}>
                      <TableCell className="font-medium">{conta.cliente_nome}</TableCell>
                      <TableCell className="text-sm">{conta.descricao}</TableCell>
                      <TableCell>{format(new Date(conta.data_vencimento), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="font-bold text-green-600">R$ {((conta.valor || 0) - (conta.valor_pago || 0)).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={conta.status === 'parcial' ? 'secondary' : 'destructive'}>
                          {conta.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagar">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Contas a Pagar Pendentes
                <Button size="sm" onClick={() => navigate(createPageUrl("ContasPagar"))}>
                  Ver Todas <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contasPagar.filter(c => c.status !== 'pago').slice(0, 15).map(conta => (
                    <TableRow key={conta.id} className={new Date(conta.data_vencimento) < hojeDate ? 'bg-red-50' : ''}>
                      <TableCell className="font-medium">{conta.fornecedor_nome}</TableCell>
                      <TableCell className="text-sm">{conta.descricao}</TableCell>
                      <TableCell><Badge variant="outline">{conta.categoria}</Badge></TableCell>
                      <TableCell>{format(new Date(conta.data_vencimento), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="font-bold text-red-600">R$ {Math.max(0, (parseFloat(conta.valor) || 0) - (parseFloat(conta.valor_pago) || 0)).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}