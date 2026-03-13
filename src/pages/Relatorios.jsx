import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { Download, TrendingUp, DollarSign, Package, Users, Shield, ArrowUpDown, ArrowUp, ArrowDown, Printer } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import { imprimirCupomVenda } from "@/utils/imprimirCupom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Relatorios() {
  const [periodoInicio, setPeriodoInicio] = useState(() => {
    const inicio = startOfMonth(new Date());
    return `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}-${String(inicio.getDate()).padStart(2, '0')}`;
  });

  const [periodoFim, setPeriodoFim] = useState(() => {
    const fim = endOfMonth(new Date());
    return `${fim.getFullYear()}-${String(fim.getMonth() + 1).padStart(2, '0')}-${String(fim.getDate()).padStart(2, '0')}`;
  });

  // Estado para ordenação da tabela de vendas detalhadas
  const [sortConfig, setSortConfig] = useState({ key: 'data_hora', direction: 'desc' });

  // Estado para ordenação da tabela de lucratividade
  const [sortLucratividade, setSortLucratividade] = useState({ key: 'data', direction: 'desc' });

  // Estado para ordenação da tabela de itens
  const [sortItens, setSortItens] = useState({ key: 'valor', direction: 'desc' });

  // Estado para ordenação da tabela de descontos
  const [sortDescontos, setSortDescontos] = useState({ key: 'data_hora', direction: 'desc' });

  const { user } = useAuth();

  // Verificar se é admin pelo cargo
  const isAdmin = user?.cargo?.nome?.toLowerCase().includes('admin') ||
    user?.cargo?.nome?.toLowerCase().includes('super') ||
    user?.permissoes?.relatorios === true;

  const { data: vendas = [] } = useQuery({
    queryKey: ['vendas'],
    queryFn: () => base44.entities.Venda.list('-created_date'),
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => base44.entities.Produto.list(),
  });

  const { data: ordensServico = [] } = useQuery({
    queryKey: ['ordens-servico'],
    queryFn: () => base44.entities.OrdemServico.list(),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list(),
  });

  const { data: logsDesconto = [] } = useQuery({
    queryKey: ['logs-desconto'],
    queryFn: () => base44.entities.LogDesconto.list('-created_date'),
  });

  const { data: comissoes = [] } = useQuery({
    queryKey: ['comissoes'],
    queryFn: async () => {
      try {
        return await base44.entities.Comissao.list();
      } catch {
        return [];
      }
    },
  });

  // Filtrar dados pelo período
  const vendasPeriodo = vendas.filter(v => {
    const dataVenda = new Date(v.created_date);
    // Adjust dataFim to include the entire day
    const finalDate = new Date(periodoFim);
    finalDate.setHours(23, 59, 59, 999);
    return dataVenda >= new Date(periodoInicio) && dataVenda <= finalDate && v.status === 'finalizada';
  });

  // Calcular métricas
  const totalVendas = vendasPeriodo.length;
  const faturamentoTotal = vendasPeriodo.reduce((sum, v) => sum + (v.valor_total || 0), 0);
  const ticketMedio = totalVendas > 0 ? faturamentoTotal / totalVendas : 0;

  const formatarData = (data) => {
    const d = new Date(data);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    return `${dia}/${mes}/${ano}`;
  };

  const formatarDataHora = (data) => {
    const d = new Date(data);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${min}`;
  };

  // Função para ordenar vendas
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    }
    return sortConfig.direction === 'asc'
      ? <ArrowUp className="w-4 h-4 ml-1" />
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  // Funções para ordenação da tabela de lucratividade
  const handleSortLucratividade = (key) => {
    setSortLucratividade(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIconLucratividade = (key) => {
    if (sortLucratividade.key !== key) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    }
    return sortLucratividade.direction === 'asc'
      ? <ArrowUp className="w-4 h-4 ml-1" />
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  // Funções para ordenação da tabela de itens
  const handleSortItens = (key) => {
    setSortItens(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIconItens = (key) => {
    if (sortItens.key !== key) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    }
    return sortItens.direction === 'asc'
      ? <ArrowUp className="w-4 h-4 ml-1" />
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  // Funções para ordenação da tabela de descontos
  const handleSortDescontos = (key) => {
    setSortDescontos(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIconDescontos = (key) => {
    if (sortDescontos.key !== key) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    }
    return sortDescontos.direction === 'asc'
      ? <ArrowUp className="w-4 h-4 ml-1" />
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  // Ordenar vendas do período
  const vendasOrdenadas = [...vendasPeriodo].sort((a, b) => {
    const direction = sortConfig.direction === 'asc' ? 1 : -1;

    switch (sortConfig.key) {
      case 'data_hora':
        return direction * (new Date(a.data_venda || a.created_date) - new Date(b.data_venda || b.created_date));
      case 'codigo':
        return direction * (a.codigo_venda || '').localeCompare(b.codigo_venda || '');
      case 'cliente':
        return direction * (a.cliente_nome || '').localeCompare(b.cliente_nome || '');
      case 'vendedor':
        return direction * (a.vendedor_nome || '').localeCompare(b.vendedor_nome || '');
      case 'produtos':
        const prodA = a.itens?.map(i => i.produto_nome).join(', ') || '';
        const prodB = b.itens?.map(i => i.produto_nome).join(', ') || '';
        return direction * prodA.localeCompare(prodB);
      case 'qtd_itens':
        return direction * ((a.itens?.length || 0) - (b.itens?.length || 0));
      case 'forma_pgto':
        const pgtoA = a.pagamentos?.[0]?.forma_pagamento || '';
        const pgtoB = b.pagamentos?.[0]?.forma_pagamento || '';
        return direction * pgtoA.localeCompare(pgtoB);
      case 'valor':
        return direction * ((a.valor_total || 0) - (b.valor_total || 0));
      case 'status':
        return direction * (a.status || '').localeCompare(b.status || '');
      default:
        return 0;
    }
  });

  // Vendas por dia
  const vendasPorDia = Array.from({ length: 30 }, (_, i) => {
    const data = subDays(new Date(), 29 - i);
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dataStr = `${data.getFullYear()}-${mes}-${dia}`;

    const vendasDia = vendasPeriodo.filter(v => {
      const vendaDate = new Date(v.created_date);
      const vendaDia = String(vendaDate.getDate()).padStart(2, '0');
      const vendaMes = String(vendaDate.getMonth() + 1).padStart(2, '0');
      const vendaAno = vendaDate.getFullYear();
      return `${vendaAno}-${vendaMes}-${vendaDia}` === dataStr;
    });

    return {
      data: `${dia}/${mes}`,
      vendas: vendasDia.length,
      valor: vendasDia.reduce((sum, v) => sum + (v.valor_total || 0), 0)
    };
  });

  // Produtos mais vendidos
  const produtosVendidos = {};
  vendasPeriodo.forEach(venda => {
    venda.itens?.forEach(item => {
      if (produtosVendidos[item.produto_nome]) {
        produtosVendidos[item.produto_nome].quantidade += item.quantidade;
        produtosVendidos[item.produto_nome].valor += item.subtotal;
      } else {
        produtosVendidos[item.produto_nome] = {
          quantidade: item.quantidade,
          valor: item.subtotal
        };
      }
    });
  });

  const topProdutos = Object.entries(produtosVendidos)
    .sort((a, b) => b[1].quantidade - a[1].quantidade)
    .slice(0, 10)
    .map(([nome, dados]) => ({
      nome: nome.length > 20 ? nome.substring(0, 20) + '...' : nome,
      quantidade: dados.quantidade,
      valor: dados.valor
    }));

  // Vendas por forma de pagamento
  const vendasPorPagamento = {};
  vendasPeriodo.forEach(venda => {
    venda.pagamentos?.forEach(pag => {
      const forma = pag.forma_pagamento;
      vendasPorPagamento[forma] = (vendasPorPagamento[forma] || 0) + pag.valor;
    });
  });

  const dadosPagamento = Object.entries(vendasPorPagamento).map(([forma, valor]) => ({
    name: forma.replace(/_/g, ' ').toUpperCase(),
    value: valor
  }));

  // Lucro estimado
  const lucroTotal = vendasPeriodo.reduce((sum, venda) => {
    const custoTotal = venda.itens?.reduce((itemSum, item) => {
      const produto = produtos.find(p => p.id === item.produto_id);
      return itemSum + ((produto?.preco_custo || 0) * item.quantidade);
    }, 0) || 0;

    const comissoesVenda = comissoes.filter(c => c.venda_id === venda.id && c.status === 'pago');
    const valorComissaoTotal = comissoesVenda.reduce((acc, c) => acc + (parseFloat(c.valor_comissao) || 0), 0);

    return sum + (venda.valor_total - custoTotal - valorComissaoTotal);
  }, 0);

  const margemMedia = faturamentoTotal > 0 ? (lucroTotal / faturamentoTotal) * 100 : 0;

  // Vendas por vendedor (incluindo comissões pagas)
  const vendasPorVendedor = {};
  vendasPeriodo.forEach(venda => {
    const vendedor = venda.vendedor_nome || "Sem vendedor";
    const custoVenda = venda.itens?.reduce((sum, item) => {
      const produto = produtos.find(p => p.id === item.produto_id);
      return sum + ((produto?.preco_custo || 0) * item.quantidade);
    }, 0) || 0;

    // CRÍTICO: Incluir comissão paga como custo
    const comissaoVenda = comissoes.find(c => c.venda_id === venda.id && c.status === 'pago');
    const valorComissao = comissaoVenda ? (parseFloat(comissaoVenda.valor_comissao) || 0) : 0;

    const lucroVenda = (venda.valor_total || 0) - custoVenda - valorComissao;

    if (vendasPorVendedor[vendedor]) {
      vendasPorVendedor[vendedor].quantidade++;
      vendasPorVendedor[vendedor].valor += (venda.valor_total || 0);
      vendasPorVendedor[vendedor].lucro += lucroVenda;
    } else {
      vendasPorVendedor[vendedor] = {
        quantidade: 1,
        valor: (venda.valor_total || 0),
        lucro: lucroVenda
      };
    }
  });

  const dadosVendedores = Object.entries(vendasPorVendedor).map(([nome, dados]) => ({
    nome,
    vendas: dados.quantidade,
    valor: dados.valor,
    lucro: dados.lucro,
    ticket_medio: dados.quantidade > 0 ? dados.valor / dados.quantidade : 0
  }));

  // Vendas por item
  const vendasPorItem = {};
  vendasPeriodo.forEach(venda => {
    venda.itens?.forEach(item => {
      if (vendasPorItem[item.produto_nome]) {
        vendasPorItem[item.produto_nome].quantidade += item.quantidade;
        vendasPorItem[item.produto_nome].valor += item.subtotal;
        vendasPorItem[item.produto_nome].vendas++;
      } else {
        vendasPorItem[item.produto_nome] = {
          quantidade: item.quantidade,
          valor: item.subtotal,
          vendas: 1
        };
      }
    });
  });

  const dadosItens = Object.entries(vendasPorItem)
    .map(([nome, dados]) => ({
      nome: nome.length > 25 ? nome.substring(0, 25) + '...' : nome,
      nomeCompleto: nome,
      quantidade: dados.quantidade,
      valor: dados.valor,
      vendas: dados.vendas,
      valorMedio: dados.vendas > 0 ? dados.valor / dados.vendas : 0
    }));

  // Ordenar itens
  const dadosItensOrdenados = [...dadosItens].sort((a, b) => {
    const direction = sortItens.direction === 'asc' ? 1 : -1;

    switch (sortItens.key) {
      case 'posicao':
        return direction * (a.valor - b.valor); // Posição é por valor
      case 'nome':
        return direction * (a.nomeCompleto || '').localeCompare(b.nomeCompleto || '');
      case 'quantidade':
        return direction * (a.quantidade - b.quantidade);
      case 'vendas':
        return direction * (a.vendas - b.vendas);
      case 'valor':
        return direction * (a.valor - b.valor);
      case 'valorMedio':
        return direction * (a.valorMedio - b.valorMedio);
      default:
        return 0;
    }
  }).slice(0, 20);

  // CRÍTICO: Lucratividade com validação (incluindo comissões)
  const lucroDetalhado = vendasPeriodo.map(venda => {
    const custoTotal = venda.itens?.reduce((sum, item) => {
      const produto = produtos.find(p => p.id === item.produto_id);
      return sum + ((parseFloat(produto?.preco_custo) || 0) * (parseInt(item.quantidade) || 0));
    }, 0) || 0;

    // CRÍTICO: Buscar comissão paga dessa venda
    const comissaoVenda = comissoes.find(c => c.venda_id === venda.id && c.status === 'pago');
    const valorComissao = comissaoVenda ? (parseFloat(comissaoVenda.valor_comissao) || 0) : 0;

    const valorVenda = parseFloat(venda.valor_total) || 0;
    const custoTotalComComissao = custoTotal + valorComissao;
    const lucro = valorVenda - custoTotalComComissao;
    const margem = valorVenda > 0 ? (lucro / valorVenda) * 100 : 0;

    return {
      codigo: venda.codigo_venda,
      data: formatarData(venda.created_date),
      dataRaw: new Date(venda.created_date),
      vendedor: venda.vendedor_nome || 'N/A',
      valor: (venda.valor_total || 0),
      custo: custoTotalComComissao,
      lucro: lucro,
      margem: margem
    };
  });

  // Ordenar lucratividade
  const lucroDetalhadoOrdenado = [...lucroDetalhado].sort((a, b) => {
    const direction = sortLucratividade.direction === 'asc' ? 1 : -1;

    switch (sortLucratividade.key) {
      case 'codigo':
        return direction * (a.codigo || '').localeCompare(b.codigo || '');
      case 'data':
        return direction * (a.dataRaw - b.dataRaw);
      case 'vendedor':
        return direction * (a.vendedor || '').localeCompare(b.vendedor || '');
      case 'valor':
        return direction * (a.valor - b.valor);
      case 'custo':
        return direction * (a.custo - b.custo);
      case 'lucro':
        return direction * (a.lucro - b.lucro);
      case 'margem':
        return direction * (a.margem - b.margem);
      default:
        return 0;
    }
  });

  // Filtrar e ordenar logs de desconto
  const logsDescontoFiltrados = logsDesconto.filter(log => {
    const dataLog = new Date(log.data_hora || log.created_date);
    const finalDate = new Date(periodoFim);
    finalDate.setHours(23, 59, 59, 999);
    return dataLog >= new Date(periodoInicio) && dataLog <= finalDate;
  });

  const logsDescontoOrdenados = [...logsDescontoFiltrados].sort((a, b) => {
    const direction = sortDescontos.direction === 'asc' ? 1 : -1;

    switch (sortDescontos.key) {
      case 'data_hora':
        return direction * (new Date(a.data_hora || a.created_date) - new Date(b.data_hora || b.created_date));
      case 'codigo_venda':
        return direction * (a.codigo_venda || '').localeCompare(b.codigo_venda || '');
      case 'vendedor':
        return direction * (a.vendedor_nome || '').localeCompare(b.vendedor_nome || '');
      case 'valor_venda':
        return direction * ((a.valor_venda || 0) - (b.valor_venda || 0));
      case 'valor_desconto':
        return direction * ((a.valor_desconto || 0) - (b.valor_desconto || 0));
      case 'percentual':
        return direction * ((a.percentual_desconto || 0) - (b.percentual_desconto || 0));
      case 'autorizado_por':
        return direction * (a.autorizado_por || '').localeCompare(b.autorizado_por || '');
      case 'codigo_barras':
        return direction * (a.codigo_barras_usado || '').localeCompare(b.codigo_barras_usado || '');
      default:
        return 0;
    }
  });

  // Exportar para Excel
  const exportarExcel = () => {
    const dados = vendasPeriodo.map(venda => ({
      'Código': venda.codigo_venda,
      'Data': formatarData(venda.created_date),
      'Cliente': venda.cliente_nome || 'Não identificado',
      'Vendedor': venda.vendedor_nome,
      'Valor Total': venda.valor_total,
      'Desconto': venda.desconto_total,
      'Status': venda.status
    }));

    const headers = Object.keys(dados[0] || {});
    const csvContent = [
      headers.join(','),
      ...dados.map(row => headers.map(header => {
        let value = row[header];
        if (typeof value === 'string' && value.includes(',')) {
          value = `"${value}"`; // Enclose in double quotes if it contains commas
        }
        return value;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);

    const dataAtual = new Date();
    const ano = dataAtual.getFullYear();
    const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
    const dia = String(dataAtual.getDate()).padStart(2, '0');

    link.setAttribute('download', `relatorio_vendas_${ano}-${mes}-${dia}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Relatório exportado!");
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 text-orange-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-orange-900 mb-2">Acesso Restrito</h2>
            <p className="text-orange-700">Apenas administradores podem acessar relatórios completos.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Relatórios</h1>
          <p className="text-slate-500">Análise de desempenho e métricas</p>
        </div>
        <Button onClick={exportarExcel} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar Excel
        </Button>
      </div>

      {/* Filtros */}
      <Card className="border-none shadow-lg">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="periodoInicio">Período Inicial</Label>
              <Input
                id="periodoInicio"
                type="date"
                value={periodoInicio}
                onChange={(e) => setPeriodoInicio(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="periodoFim">Período Final</Label>
              <Input
                id="periodoFim"
                type="date"
                value={periodoFim}
                onChange={(e) => setPeriodoFim(e.target.value)}
                className="mt-1"
              />
            </div>
            {/* The "Aplicar Filtros" button doesn't actually trigger a re-filter with the current setup, 
                as the `vendasPeriodo` and derived data are re-calculated on every `periodoInicio`/`periodoFim` change.
                If filtering was expensive, it would require an explicit button click to set a state that triggers the filter. */}
            <div className="flex items-end">
              <Button className="w-full" onClick={() => toast.info("Filtros aplicados automaticamente.")}>Aplicar Filtros</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total de Vendas</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{totalVendas}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Faturamento</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  R$ {faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Ticket Médio</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">
                  R$ {ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Margem Média</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {margemMedia.toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <Tabs defaultValue="vendas" className="space-y-6">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="lucratividade">Lucratividade</TabsTrigger>
          <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
          <TabsTrigger value="itens">Itens</TabsTrigger>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
          <TabsTrigger value="descontos">Descontos</TabsTrigger>
        </TabsList>

        <TabsContent value="vendas" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Vendas por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={vendasPorDia}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="vendas" stroke="#3b82f6" name="Quantidade" />
                  <Line yAxisId="right" type="monotone" dataKey="valor" stroke="#10b981" name="Valor (R$)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Vendas Detalhadas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:bg-slate-100 select-none"
                      onClick={() => handleSort('data_hora')}
                    >
                      <div className="flex items-center">
                        Data/Hora {getSortIcon('data_hora')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-slate-100 select-none"
                      onClick={() => handleSort('codigo')}
                    >
                      <div className="flex items-center">
                        Código {getSortIcon('codigo')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-slate-100 select-none"
                      onClick={() => handleSort('cliente')}
                    >
                      <div className="flex items-center">
                        Cliente {getSortIcon('cliente')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-slate-100 select-none"
                      onClick={() => handleSort('vendedor')}
                    >
                      <div className="flex items-center">
                        Vendedor/PDV {getSortIcon('vendedor')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-slate-100 select-none"
                      onClick={() => handleSort('produtos')}
                    >
                      <div className="flex items-center">
                        Produtos {getSortIcon('produtos')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-slate-100 select-none"
                      onClick={() => handleSort('qtd_itens')}
                    >
                      <div className="flex items-center">
                        Qtd Itens {getSortIcon('qtd_itens')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-slate-100 select-none"
                      onClick={() => handleSort('forma_pgto')}
                    >
                      <div className="flex items-center">
                        Forma Pgto {getSortIcon('forma_pgto')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-slate-100 select-none"
                      onClick={() => handleSort('valor')}
                    >
                      <div className="flex items-center">
                        Valor {getSortIcon('valor')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-slate-100 select-none"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center">
                        Status {getSortIcon('status')}
                      </div>
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendasOrdenadas.map((venda) => (
                    <TableRow key={venda.id} className="hover:bg-slate-50">
                      <TableCell className="text-xs">{formatarDataHora(venda.data_venda || venda.created_date)}</TableCell>
                      <TableCell className="font-mono text-xs">{venda.codigo_venda}</TableCell>
                      <TableCell className="text-sm">{venda.cliente_nome || 'Não identificado'}</TableCell>
                      <TableCell className="text-sm">
                        {venda.vendedor_nome}
                        {venda.vendedor_nome?.includes('Online') && (
                          <Badge className="ml-2 bg-purple-100 text-purple-800">WEB</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs max-w-xs truncate">
                        {venda.itens?.map(i => i.produto_nome).join(', ')}
                      </TableCell>
                      <TableCell className="text-center">{venda.itens?.length || 0}</TableCell>
                      <TableCell>
                        {venda.pagamentos?.map((p, idx) => (
                          <Badge key={idx} variant="outline" className="mr-1 text-xs">
                            {p.forma_pagamento?.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </TableCell>
                      <TableCell className="font-bold text-green-600">R$ {(parseFloat(venda.valor_total) || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={venda.status === 'finalizada' ? 'default' : 'destructive'}>
                          {venda.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-slate-500 hover:text-cyan-600"
                          title="Reimprimir cupom"
                          onClick={() => imprimirCupomVenda({ ...venda, _reimpressao: true })}
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lucratividade" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Análise de Lucratividade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700">Lucro Total</p>
                  <p className="text-2xl font-bold text-green-900">
                    R$ {lucroTotal.toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">Margem Média</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {margemMedia.toFixed(1)}%
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-700">Custo Total</p>
                  <p className="text-2xl font-bold text-purple-900">
                    R$ {(faturamentoTotal - lucroTotal).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th
                        className="p-2 text-left cursor-pointer hover:bg-slate-200 select-none"
                        onClick={() => handleSortLucratividade('codigo')}
                      >
                        <div className="flex items-center">
                          Código {getSortIconLucratividade('codigo')}
                        </div>
                      </th>
                      <th
                        className="p-2 text-left cursor-pointer hover:bg-slate-200 select-none"
                        onClick={() => handleSortLucratividade('data')}
                      >
                        <div className="flex items-center">
                          Data {getSortIconLucratividade('data')}
                        </div>
                      </th>
                      <th
                        className="p-2 text-left cursor-pointer hover:bg-slate-200 select-none"
                        onClick={() => handleSortLucratividade('vendedor')}
                      >
                        <div className="flex items-center">
                          Vendedor {getSortIconLucratividade('vendedor')}
                        </div>
                      </th>
                      <th
                        className="p-2 text-right cursor-pointer hover:bg-slate-200 select-none"
                        onClick={() => handleSortLucratividade('valor')}
                      >
                        <div className="flex items-center justify-end">
                          Valor {getSortIconLucratividade('valor')}
                        </div>
                      </th>
                      <th
                        className="p-2 text-right cursor-pointer hover:bg-slate-200 select-none"
                        onClick={() => handleSortLucratividade('custo')}
                      >
                        <div className="flex items-center justify-end">
                          Custo {getSortIconLucratividade('custo')}
                        </div>
                      </th>
                      <th
                        className="p-2 text-right cursor-pointer hover:bg-slate-200 select-none"
                        onClick={() => handleSortLucratividade('lucro')}
                      >
                        <div className="flex items-center justify-end">
                          Lucro {getSortIconLucratividade('lucro')}
                        </div>
                      </th>
                      <th
                        className="p-2 text-right cursor-pointer hover:bg-slate-200 select-none"
                        onClick={() => handleSortLucratividade('margem')}
                      >
                        <div className="flex items-center justify-end">
                          Margem {getSortIconLucratividade('margem')}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lucroDetalhadoOrdenado.slice(0, 20).map((item, index) => (
                      <tr key={index} className="border-b hover:bg-slate-50">
                        <td className="p-2">{item.codigo}</td>
                        <td className="p-2">{item.data}</td>
                        <td className="p-2">{item.vendedor}</td>
                        <td className="p-2 text-right">R$ {item.valor.toFixed(2)}</td>
                        <td className="p-2 text-right text-red-600">R$ {item.custo.toFixed(2)}</td>
                        <td className="p-2 text-right text-green-600 font-semibold">
                          R$ {item.lucro.toFixed(2)}
                        </td>
                        <td className="p-2 text-right">
                          <span className={`font-semibold ${item.margem > 30 ? 'text-green-600' : item.margem > 15 ? 'text-blue-600' : 'text-orange-600'}`}>
                            {item.margem.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendedores" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Desempenho por Vendedor</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={dadosVendedores}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nome" />
                  <YAxis yAxisId="left" domain={[0, 'auto']} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 'auto']} />
                  <Tooltip formatter={(value, name) => [`R$ ${value.toFixed(2)}`, name]} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="vendas" fill="#3b82f6" name="Quantidade de Vendas" />
                  <Bar yAxisId="right" dataKey="valor" fill="#10b981" name="Valor Total (R$)" />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dadosVendedores.map((vendedor, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">{vendedor.nome}</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Vendas:</span>
                        <span className="font-semibold">{vendedor.vendas}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total:</span>
                        <span className="font-semibold text-green-600">
                          R$ {vendedor.valor.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Lucro:</span>
                        <span className="font-semibold text-blue-600">
                          R$ {vendedor.lucro.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Ticket Médio:</span>
                        <span className="font-semibold">
                          R$ {vendedor.ticket_medio.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="itens" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Vendas por Item</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th
                        className="p-2 text-left cursor-pointer hover:bg-slate-200 select-none"
                        onClick={() => handleSortItens('posicao')}
                      >
                        <div className="flex items-center">
                          # {getSortIconItens('posicao')}
                        </div>
                      </th>
                      <th
                        className="p-2 text-left cursor-pointer hover:bg-slate-200 select-none"
                        onClick={() => handleSortItens('nome')}
                      >
                        <div className="flex items-center">
                          Produto {getSortIconItens('nome')}
                        </div>
                      </th>
                      <th
                        className="p-2 text-right cursor-pointer hover:bg-slate-200 select-none"
                        onClick={() => handleSortItens('quantidade')}
                      >
                        <div className="flex items-center justify-end">
                          Qtd Vendida {getSortIconItens('quantidade')}
                        </div>
                      </th>
                      <th
                        className="p-2 text-right cursor-pointer hover:bg-slate-200 select-none"
                        onClick={() => handleSortItens('vendas')}
                      >
                        <div className="flex items-center justify-end">
                          Nº Vendas {getSortIconItens('vendas')}
                        </div>
                      </th>
                      <th
                        className="p-2 text-right cursor-pointer hover:bg-slate-200 select-none"
                        onClick={() => handleSortItens('valor')}
                      >
                        <div className="flex items-center justify-end">
                          Valor Total {getSortIconItens('valor')}
                        </div>
                      </th>
                      <th
                        className="p-2 text-right cursor-pointer hover:bg-slate-200 select-none"
                        onClick={() => handleSortItens('valorMedio')}
                      >
                        <div className="flex items-center justify-end">
                          Valor Médio {getSortIconItens('valorMedio')}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dadosItensOrdenados.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-slate-50">
                        <td className="p-2">
                          <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                            <span className="text-xs font-bold text-blue-600">#{index + 1}</span>
                          </div>
                        </td>
                        <td className="p-2 font-medium">{item.nome}</td>
                        <td className="p-2 text-right font-semibold">{item.quantidade}</td>
                        <td className="p-2 text-right">{item.vendas}</td>
                        <td className="p-2 text-right text-green-600 font-semibold">
                          R$ {item.valor.toFixed(2)}
                        </td>
                        <td className="p-2 text-right">
                          R$ {item.valorMedio.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagamentos" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Distribuição por Forma de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={dadosPagamento}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={150}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dadosPagamento.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="descontos" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Histórico de Descontos Autorizados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead
                        className="cursor-pointer hover:bg-slate-100 select-none"
                        onClick={() => handleSortDescontos('data_hora')}
                      >
                        <div className="flex items-center">
                          Data/Hora {getSortIconDescontos('data_hora')}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-slate-100 select-none"
                        onClick={() => handleSortDescontos('codigo_venda')}
                      >
                        <div className="flex items-center">
                          Código Venda {getSortIconDescontos('codigo_venda')}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-slate-100 select-none"
                        onClick={() => handleSortDescontos('vendedor')}
                      >
                        <div className="flex items-center">
                          Vendedor {getSortIconDescontos('vendedor')}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-slate-100 select-none"
                        onClick={() => handleSortDescontos('valor_venda')}
                      >
                        <div className="flex items-center">
                          Valor Venda {getSortIconDescontos('valor_venda')}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-slate-100 select-none"
                        onClick={() => handleSortDescontos('valor_desconto')}
                      >
                        <div className="flex items-center">
                          Desconto {getSortIconDescontos('valor_desconto')}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-slate-100 select-none"
                        onClick={() => handleSortDescontos('percentual')}
                      >
                        <div className="flex items-center">
                          % {getSortIconDescontos('percentual')}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-slate-100 select-none"
                        onClick={() => handleSortDescontos('autorizado_por')}
                      >
                        <div className="flex items-center">
                          Autorizado Por {getSortIconDescontos('autorizado_por')}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-slate-100 select-none"
                        onClick={() => handleSortDescontos('codigo_barras')}
                      >
                        <div className="flex items-center">
                          Código Barras {getSortIconDescontos('codigo_barras')}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsDescontoOrdenados.map((log) => (
                      <TableRow key={log.id} className="hover:bg-slate-50">
                        <TableCell className="text-sm">
                          {formatarDataHora(log.data_hora || log.created_date)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{log.codigo_venda || '-'}</TableCell>
                        <TableCell>{log.vendedor_nome || '-'}</TableCell>
                        <TableCell className="text-green-600 font-semibold">
                          R$ {(log.valor_venda || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-red-600 font-semibold">
                          R$ {(log.valor_desconto || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.percentual_desconto > 20 ? "destructive" : "secondary"}>
                            {(log.percentual_desconto || 0).toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{log.autorizado_por || '-'}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">
                          {log.codigo_barras_usado || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {logsDescontoOrdenados.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                          Nenhum desconto autorizado no período
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  💡 <strong>Dica:</strong> Use este relatório para auditar descontos autorizados e identificar padrões.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}