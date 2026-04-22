import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useLoja } from "@/contexts/LojaContext";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  Wrench,
  AlertCircle,
  ArrowUpRight,
  Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Cell
} from "recharts";
import { format, subDays, startOfDay, startOfMonth, startOfYear, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Dashboard() {
  const [dateRange, setDateRange] = useState(30);
  const [periodo, setPeriodo] = useState("dia"); // dia, mes, ano - PADRÃO: HOJE
  const [periodoSelecionado, setPeriodoSelecionado] = useState(7);

  // Usar o novo sistema de autenticação
  const { user } = useAuth();
  const { lojaFiltroId, lojaLabel } = useLoja();
  const isAdmin = user?.cargo?.nome?.toLowerCase() === 'administrador' ||
                  user?.permissoes?.administrador_sistema === true;
  const podVerCustos = user?.permissoes?.visualizar_custos === true || isAdmin;

  const { data: vendas = [], isLoading: loadingVendas } = useQuery({
    queryKey: ['vendas', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.Venda.filter({ loja_id: lojaFiltroId }, { order: '-created_date' })
      : base44.entities.Venda.list('-created_date'),
  });

  const { data: produtos = [], isLoading: loadingProdutos } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => base44.entities.Produto.list(),
  });

  const { data: clientes = [], isLoading: loadingClientes } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('-created_date'),
  });

  const { data: ordensServico = [], isLoading: loadingOS } = useQuery({
    queryKey: ['ordens-servico', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.OrdemServico.filter({ loja_id: lojaFiltroId }, { order: '-created_date' })
      : base44.entities.OrdemServico.list('-created_date'),
  });

  const { data: caixas = [] } = useQuery({
    queryKey: ['caixas', lojaFiltroId],
    queryFn: () => base44.entities.Caixa.list('-created_date', 10),
  });

  const { data: comissoes = [], isLoading: loadingComissoes } = useQuery({
    queryKey: ['comissoes', lojaFiltroId],
    queryFn: async () => {
      try {
        return await base44.entities.Comissao.list();
      } catch (error) {
        console.error("Erro ao carregar comissões:", error);
        return [];
      }
    },
  });

  const { data: devolucoes = [] } = useQuery({
    queryKey: ['devolucoes', lojaFiltroId],
    queryFn: async () => {
      try {
        return await base44.entities.Devolucao.list();
      } catch {
        return [];
      }
    },
  });

  // Mapear devoluções aprovadas por venda para abatimento financeiro
  const devolucoesPorVenda = useMemo(() => {
    const mapa = {};
    devolucoes.filter(d => d.status === 'aprovada').forEach(d => {
      // Usar status aprovada
      if (!mapa[d.venda_id]) mapa[d.venda_id] = 0;
      mapa[d.venda_id] += parseFloat(d.valor_total) || 0;
    });
    return mapa;
  }, [devolucoes]);

  // Filtrar por período
  const getDataInicio = () => {
    const hoje = new Date();
    if (periodo === "dia") return startOfDay(hoje);
    if (periodo === "mes") return startOfMonth(hoje);
    if (periodo === "ano") return startOfYear(hoje);
    return startOfMonth(hoje);
  };

  const vendasPeriodo = vendas.filter(v => {
    const dataVenda = new Date(v.created_date);
    return dataVenda >= getDataInicio() && v.status === 'finalizada';
  });

  // Calcular KPIs
  const vendasFinalizadas = vendas.filter(v => v.status === 'finalizada');
  const vendasHoje = vendasFinalizadas.filter(v => {
    const dataVenda = new Date(v.created_date);
    const hoje = startOfDay(new Date());
    return dataVenda >= hoje;
  });

  const faturamentoPeriodo = vendasPeriodo.reduce((sum, v) => sum + Math.max(0, (parseFloat(v.valor_total) || 0) - (devolucoesPorVenda[v.id] || 0)), 0);
  const faturamentoHoje = vendasHoje.reduce((sum, v) => sum + Math.max(0, (parseFloat(v.valor_total) || 0) - (devolucoesPorVenda[v.id] || 0)), 0);
  const faturamentoTotal = vendasFinalizadas.reduce((sum, v) => sum + Math.max(0, (parseFloat(v.valor_total) || 0) - (devolucoesPorVenda[v.id] || 0)), 0);
  const ticketMedio = vendasPeriodo.length > 0 ? faturamentoPeriodo / vendasPeriodo.length : 0;

  // CRÍTICO: Calcular lucro com validação (incluindo comissões pagas)
  // CORREÇÃO: Só calcular se produtos estiverem carregados para evitar race condition
  const lucroPeriodo = (loadingProdutos || loadingComissoes) ? 0 : vendasPeriodo.reduce((sum, venda) => {
    // Calculamos o custo baseando na proporção do que não foi devolvido
    const valorOriginal = parseFloat(venda.valor_total) || 0;
    const valorDevolvido = devolucoesPorVenda[venda.id] || 0;
    const percentualRetido = valorOriginal > 0 ? Math.max(0, (valorOriginal - valorDevolvido) / valorOriginal) : 0;

    const custoTotalBase = venda.itens?.reduce((itemSum, item) => {
      // CORREÇÃO: Priorizar custo congelado no momento da venda (item.preco_custo ou item.custo_unitario)
      // Fallback para custo atual do cadastro apenas se não houver custo congelado
      const custoCongelado = item.preco_custo ?? item.custo_unitario;
      const custoProduto = custoCongelado != null ? custoCongelado : (produtos.find(p => p.id === item.produto_id)?.preco_custo ?? 0);
      return itemSum + ((parseFloat(custoProduto) || 0) * (parseInt(item.quantidade) || 0));
    }, 0) || 0;
    
    // O custo é retido apenas na mesma proporção do item que "não foi devolvido" financeiramente.
    // (Devoluções aprovadas já revertem estoque).
    const custoRetido = custoTotalBase * percentualRetido;

    const comissoesVenda = comissoes.filter(c => c.venda_id === venda.id && c.status === 'pago');
    const valorComissaoTotal = comissoesVenda.reduce((acc, c) => acc + (parseFloat(c.valor_comissao) || 0), 0);
    // Nota: Comissões pendentes (canceladas por conta de devolução) não chegam a ser pagas.

    const faturamentoBrutoVenda = Math.max(0, valorOriginal - valorDevolvido);

    return sum + (faturamentoBrutoVenda - custoRetido - valorComissaoTotal);
  }, 0);

  const margemLucro = faturamentoPeriodo > 0 ? (lucroPeriodo / faturamentoPeriodo) * 100 : 0;

  // CRÍTICO: Filtro correto de estoque baixo
  const produtosBaixoEstoque = produtos.filter(p => 
    p.ativo !== false && (p.estoque_atual || 0) <= (p.estoque_minimo || 0) && (p.estoque_minimo || 0) > 0
  );

  const osAbertas = ordensServico.filter(os =>
    !['entregue', 'faturada', 'cancelado'].includes(os.status)
  );

  // Mini-dashboard do vendedor: dados pessoais
  const meuId = user?.id;
  const minhasVendasPeriodo = vendasPeriodo.filter(v => v.vendedor_id === meuId);
  const minhasFaturamentoPeriodo = minhasVendasPeriodo.reduce((sum, v) => sum + Math.max(0, (parseFloat(v.valor_total) || 0) - (devolucoesPorVenda[v.id] || 0)), 0);
  const minhasComissoes = comissoes.filter(c => c.vendedor_id === meuId);
  const comissaoPendente = minhasComissoes.filter(c => c.status === 'pendente').reduce((sum, c) => sum + (parseFloat(c.valor_comissao) || 0), 0);
  const comissaoPaga = minhasComissoes.filter(c => c.status === 'pago').reduce((sum, c) => sum + (parseFloat(c.valor_comissao) || 0), 0);
  const minhasOsAbertas = ordensServico.filter(os =>
    os.tecnico_responsavel === user?.nome && !['entregue', 'faturada', 'cancelado'].includes(os.status)
  );

  // Vendas por vendedor - memoizado para performance
  const topVendedores = useMemo(() => {
    const vendasPorVendedor = {};
    vendasPeriodo.forEach(venda => {
      const vendedor = venda.vendedor_nome || "Sem vendedor";
      const valorLiquido = Math.max(0, (parseFloat(venda.valor_total) || 0) - (devolucoesPorVenda[venda.id] || 0));
      if (vendasPorVendedor[vendedor]) {
        vendasPorVendedor[vendedor].quantidade++;
        vendasPorVendedor[vendedor].valor += valorLiquido;
      } else {
        vendasPorVendedor[vendedor] = {
          quantidade: 1,
          valor: valorLiquido
        };
      }
    });

    return Object.entries(vendasPorVendedor)
      .sort((a, b) => b[1].valor - a[1].valor)
      .slice(0, 5)
      .map(([nome, dados]) => ({
        nome,
        vendas: dados.quantidade,
        valor: dados.valor
      }));
  }, [vendasPeriodo, devolucoesPorVenda]);

  // Dados para gráfico de vendas por dia - memoizado para performance
  const vendasPorDia = useMemo(() => {
    return Array.from({ length: dateRange }, (_, i) => {
      const data = subDays(new Date(), dateRange - 1 - i);
      const dataStr = format(data, 'yyyy-MM-dd');
      const vendasDia = vendasFinalizadas.filter(v => {
        const vendaDate = format(new Date(v.created_date), 'yyyy-MM-dd');
        return vendaDate === dataStr;
      });
      return {
        data: format(data, 'dd/MM'),
        vendas: vendasDia.length,
        valor: vendasDia.reduce((sum, v) => sum + Math.max(0, (v.valor_total || 0) - (devolucoesPorVenda[v.id] || 0)), 0)
      };
    });
  }, [vendasFinalizadas, dateRange, devolucoesPorVenda]);

  // Top 5 produtos mais vendidos - memoizado para performance
  const topProdutos = useMemo(() => {
    const produtosVendidos = {};
    vendasFinalizadas.forEach(venda => {
      venda.itens?.forEach(item => {
        if (produtosVendidos[item.produto_nome]) {
          produtosVendidos[item.produto_nome] += item.quantidade;
        } else {
          produtosVendidos[item.produto_nome] = item.quantidade;
        }
      });
    });

    return Object.entries(produtosVendidos)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nome, quantidade]) => ({ nome, quantidade }));
  }, [vendasFinalizadas]);

  // Status das OS - memoizado para performance
  const STATUS_LABELS_OS = {
    recebido: "Recebido",
    em_diagnostico: "Em Diagnóstico",
    aguardando_aprovacao: "Aguardando Aprovação",
    aprovado: "Aprovado",
    orcamento_reprovado: "Orç. Reprovado",
    aguardando_pecas: "Aguardando Peças",
    em_conserto: "Em Conserto",
    pronto: "Pronto",
    entregue: "Entregue",
    faturada: "Faturada",
    cancelado: "Cancelado"
  };

  const dadosStatusOS = useMemo(() => {
    const statusOS = ordensServico.reduce((acc, os) => {
      const status = os.status || 'recebido';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(statusOS).map(([status, quantidade]) => ({
      name: STATUS_LABELS_OS[status] || status,
      value: quantidade
    }));
  }, [ordensServico]);

  const getNomePeriodo = () => {
    if (periodo === "dia") return "Hoje";
    if (periodo === "mes") return "Este Mês";
    if (periodo === "ano") return "Este Ano";
    return "Este Mês";
  };

  const isLoading = loadingVendas || loadingProdutos || loadingClientes || loadingOS;

  const formatarDataHora = (dataStr) => {
    if (!dataStr) return 'N/A';
    const d = new Date(dataStr);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${min}`;
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-full">
      {/* Filtro de Período */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">Métricas e indicadores - {getNomePeriodo()} {lojaLabel ? `• ${lojaLabel}` : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-slate-400" />
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dia">Hoje</SelectItem>
              <SelectItem value="mes">Este Mês</SelectItem>
              <SelectItem value="ano">Este Ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mini-Dashboard do Vendedor */}
      {!podVerCustos && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-blue-100">
                    Minhas Vendas {getNomePeriodo()}
                  </CardTitle>
                  <ShoppingCart className="w-5 h-5 text-blue-100" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{minhasVendasPeriodo.length}</div>
                <p className="text-xs text-blue-100 mt-2">
                  R$ {minhasFaturamentoPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em vendas
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-green-100">
                    Comissão Pendente
                  </CardTitle>
                  <DollarSign className="w-5 h-5 text-green-100" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  R$ {comissaoPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-green-100 mt-2">
                  R$ {comissaoPaga.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} já recebido
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-orange-100">
                    Minhas OS Abertas
                  </CardTitle>
                  <Wrench className="w-5 h-5 text-orange-100" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{minhasOsAbertas.length}</div>
                <p className="text-xs text-orange-100 mt-2">
                  atribuídas a mim
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-purple-100">
                    Total Comissões
                  </CardTitle>
                  <TrendingUp className="w-5 h-5 text-purple-100" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{minhasComissoes.length}</div>
                <p className="text-xs text-purple-100 mt-2">
                  {minhasComissoes.filter(c => c.status === 'pendente').length} pendentes
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Últimas vendas do vendedor */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Minhas Últimas Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {minhasVendasPeriodo.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">Nenhuma venda no período</p>
                )}
                {minhasVendasPeriodo.slice(0, 10).map((venda, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{venda.codigo_venda}</p>
                      <p className="text-xs text-slate-500">{venda.cliente_nome || 'Cliente não identificado'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-green-600">
                        R$ {(venda.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-slate-400">
                        {venda.created_date ? format(new Date(venda.created_date), "dd/MM HH:mm") : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Dashboard Completo (Admin/Gerente) */}
      {podVerCustos && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-blue-100">
                    Faturamento {getNomePeriodo()}
                  </CardTitle>
                  <DollarSign className="w-5 h-5 text-blue-100" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  R$ {faturamentoPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-blue-100 mt-2">
                  {vendasPeriodo.length} vendas • Margem: {margemLucro.toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-green-100">
                    Lucro {getNomePeriodo()}
                  </CardTitle>
                  <TrendingUp className="w-5 h-5 text-green-100" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  R$ {lucroPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-green-100 mt-2">
                  Ticket médio: R$ {ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-orange-100">
                    OS Abertas
                  </CardTitle>
                  <Wrench className="w-5 h-5 text-orange-100" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{osAbertas.length}</div>
                <p className="text-xs text-orange-100 mt-2">
                  {ordensServico.length} ordens no total
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-purple-100">
                    Estoque Baixo
                  </CardTitle>
                  <Package className="w-5 h-5 text-purple-100" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{produtosBaixoEstoque.length}</div>
                <p className="text-xs text-purple-100 mt-2">
                  {produtos.length} produtos cadastrados
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Alertas */}
          {produtosBaixoEstoque.length > 0 && (
            <Card className="border-l-4 border-l-red-500 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900">
                      Produtos com Estoque Baixo
                    </h3>
                    <p className="text-sm text-red-700 mt-1">
                      {produtosBaixoEstoque.length} produto(s) estão abaixo do estoque mínimo
                    </p>
                    <Link to={createPageUrl("Produtos")}>
                      <Button variant="link" className="text-red-600 px-0 mt-2">
                        Ver Produtos <ArrowUpRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Gráficos (apenas para quem pode ver custos) */}
      {podVerCustos && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Vendas dos Últimos {dateRange} Dias</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={vendasPorDia}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="data" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  formatter={(value, name) => {
                    if (name === 'valor') return [`R$ ${value.toFixed(2)}`, 'Valor'];
                    return [value, 'Vendas'];
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="vendas" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Quantidade"
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="valor" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Valor (R$)"
                  dot={{ fill: '#10b981', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Status das Ordens de Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dadosStatusOS}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dadosStatusOS.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>}

      {/* Top Vendedores e Produtos */}
      {podVerCustos && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Top Vendedores - {getNomePeriodo()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topVendedores.map((vendedor, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{vendedor.nome}</p>
                      <p className="text-sm text-slate-500">{vendedor.vendas} vendas</p>
                    </div>
                  </div>
                  <span className="font-bold text-green-600">
                    R$ {vendedor.valor.toFixed(2)}
                  </span>
                </div>
              ))}
              {topVendedores.length === 0 && (
                <p className="text-center text-slate-500 py-8">Nenhuma venda no período</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Top 5 Produtos Mais Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProdutos.map((produto, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-green-600">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{produto.nome}</p>
                      <p className="text-sm text-slate-500">{produto.quantidade} unidades</p>
                    </div>
                  </div>
                </div>
              ))}
              {topProdutos.length === 0 && (
                <p className="text-center text-slate-500 py-8">Nenhuma venda registrada</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>}

    </div>
  );
}