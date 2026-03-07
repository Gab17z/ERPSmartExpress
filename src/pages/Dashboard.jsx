import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
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
  const isAdmin = user?.cargo?.nome?.toLowerCase() === 'administrador' ||
                  user?.permissoes?.administrador_sistema === true;

  const { data: vendas = [], isLoading: loadingVendas } = useQuery({
    queryKey: ['vendas'],
    queryFn: () => base44.entities.Venda.list('-created_date'),
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
    queryKey: ['ordens-servico'],
    queryFn: () => base44.entities.OrdemServico.list('-created_date'),
  });

  const { data: caixas = [] } = useQuery({
    queryKey: ['caixas'],
    queryFn: () => base44.entities.Caixa.list('-created_date', 10),
  });

  const { data: comissoes = [] } = useQuery({
    queryKey: ['comissoes'],
    queryFn: async () => {
      try {
        return await base44.entities.Comissao.list();
      } catch (error) {
        // CORREÇÃO: Logar erro para debug
        console.error("Erro ao carregar comissões:", error);
        return [];
      }
    },
  });

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

  const faturamentoPeriodo = vendasPeriodo.reduce((sum, v) => sum + (v.valor_total || 0), 0);
  const faturamentoHoje = vendasHoje.reduce((sum, v) => sum + (v.valor_total || 0), 0);
  const faturamentoTotal = vendasFinalizadas.reduce((sum, v) => sum + (v.valor_total || 0), 0);
  const ticketMedio = vendasPeriodo.length > 0 ? faturamentoPeriodo / vendasPeriodo.length : 0;

  // CRÍTICO: Calcular lucro com validação (incluindo comissões pagas)
  // CORREÇÃO: Só calcular se produtos estiverem carregados para evitar race condition
  const lucroPeriodo = loadingProdutos ? 0 : vendasPeriodo.reduce((sum, venda) => {
    const custoTotal = venda.itens?.reduce((itemSum, item) => {
      const produto = produtos.find(p => p.id === item.produto_id);
      // Se produto não encontrado, usar custo do item se disponível
      const custoProduto = produto?.preco_custo ?? item.custo_unitario ?? 0;
      return itemSum + ((parseFloat(custoProduto) || 0) * (parseInt(item.quantidade) || 0));
    }, 0) || 0;

    // CORREÇÃO: Buscar TODAS as comissões dessa venda, não só a primeira
    const comissoesVenda = comissoes.filter(c => c.venda_id === venda.id && c.status === 'pago');
    const valorComissaoTotal = comissoesVenda.reduce((acc, c) => acc + (parseFloat(c.valor_comissao) || 0), 0);

    return sum + ((parseFloat(venda.valor_total) || 0) - custoTotal - valorComissaoTotal);
  }, 0);

  const margemLucro = faturamentoPeriodo > 0 ? (lucroPeriodo / faturamentoPeriodo) * 100 : 0;

  // CRÍTICO: Filtro correto de estoque baixo
  const produtosBaixoEstoque = produtos.filter(p => 
    p.ativo !== false && (p.estoque_atual || 0) <= (p.estoque_minimo || 0) && (p.estoque_minimo || 0) > 0
  );

  const osAbertas = ordensServico.filter(os => 
    !['entregue', 'cancelado'].includes(os.status)
  );

  // Vendas por vendedor - memoizado para performance
  const topVendedores = useMemo(() => {
    const vendasPorVendedor = {};
    vendasPeriodo.forEach(venda => {
      const vendedor = venda.vendedor_nome || "Sem vendedor";
      if (vendasPorVendedor[vendedor]) {
        vendasPorVendedor[vendedor].quantidade++;
        vendasPorVendedor[vendedor].valor += venda.valor_total;
      } else {
        vendasPorVendedor[vendedor] = {
          quantidade: 1,
          valor: venda.valor_total
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
  }, [vendasPeriodo]);

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
        valor: vendasDia.reduce((sum, v) => sum + (v.valor_total || 0), 0)
      };
    });
  }, [vendasFinalizadas, dateRange]);

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
  const dadosStatusOS = useMemo(() => {
    const statusOS = ordensServico.reduce((acc, os) => {
      const status = os.status || 'recebido';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(statusOS).map(([status, quantidade]) => ({
      name: status.replace(/_/g, ' ').toUpperCase(),
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
          <p className="text-slate-500">Métricas e indicadores - {getNomePeriodo()}</p>
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

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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
      </div>

      {/* Top Vendedores e Produtos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      </div>

    </div>
  );
}