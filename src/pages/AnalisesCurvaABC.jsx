import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, Package, DollarSign, Activity } from "lucide-react";
import { format, startOfMonth, subMonths } from "date-fns";
import DateRangeFilter from "@/components/DateRangeFilter";

export default function AnalisesCurvaABC() {
  const hoje = new Date();
  const [filtro, setFiltro] = useState({
    dataInicio: format(hoje, 'yyyy-MM-dd'),
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
    queryKey: ['vendas'],
    queryFn: () => base44.entities.Venda.list(),
    refetchInterval: 30000
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => base44.entities.Produto.list(),
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

  const vendasPeriodo = vendas.filter(v => v.status === 'finalizada' && filtrarPorData(v.data_venda || v.created_date));

  // CURVA ABC (incluindo comissões no cálculo de margem)
  const analiseABC = {};
  vendasPeriodo.forEach(venda => {
    venda.itens?.forEach(item => {
      if (!analiseABC[item.produto_id]) {
        analiseABC[item.produto_id] = {
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          quantidade_vendida: 0,
          receita_total: 0,
          margem_lucro: 0
        };
      }
      const qtd = parseFloat(item.quantidade) || 0;
      const subtotal = parseFloat(item.subtotal) || 0;
      analiseABC[item.produto_id].quantidade_vendida += qtd;
      analiseABC[item.produto_id].receita_total += subtotal;

      const produto = produtos.find(p => p.id === item.produto_id);
      if (produto) {
        const custoItem = (parseFloat(produto.preco_custo) || 0) * qtd;

        // CRÍTICO: Calcular proporção de comissão por item
        const comissaoVenda = comissoes.find(c => c.venda_id === venda.id && c.status === 'pago');
        const valorComissaoTotal = comissaoVenda ? (parseFloat(comissaoVenda.valor_comissao) || 0) : 0;
        const valorTotalVenda = parseFloat(venda.valor_total) || 0;
        const proporcaoItem = valorTotalVenda > 0 ? subtotal / valorTotalVenda : 0;
        const comissaoItem = valorComissaoTotal * proporcaoItem;

        analiseABC[item.produto_id].margem_lucro += (subtotal - custoItem - comissaoItem);
      }
    });
  });

  const produtosOrdenados = Object.values(analiseABC).sort((a, b) => b.receita_total - a.receita_total);
  const receitaTotal = produtosOrdenados.reduce((sum, p) => sum + p.receita_total, 0);

  let acumulado = 0;
  const curvaABC = produtosOrdenados.map((produto, idx) => {
    acumulado += produto.receita_total;
    const percentualAcumulado = (acumulado / receitaTotal) * 100;
    
    let classe = 'C';
    if (percentualAcumulado <= 80) classe = 'A';
    else if (percentualAcumulado <= 95) classe = 'B';

    return {
      ...produto,
      posicao: idx + 1,
      percentual_receita: (produto.receita_total / receitaTotal) * 100,
      percentual_acumulado: percentualAcumulado,
      classe: classe
    };
  });

  const classeA = curvaABC.filter(p => p.classe === 'A');
  const classeB = curvaABC.filter(p => p.classe === 'B');
  const classeC = curvaABC.filter(p => p.classe === 'C');

  // SAZONALIDADE
  const ultimosSeisMeses = [];
  for (let i = 5; i >= 0; i--) {
    const mes = subMonths(hoje, i);
    const mesInicio = format(startOfMonth(mes), 'yyyy-MM-dd');
    const mesFim = format(mes, 'yyyy-MM-dd');

    const vendasMes = vendas.filter(v => {
      if (v.status !== 'finalizada') return false;
      const dataVenda = v.data_venda?.split('T')[0] || v.created_date?.split('T')[0];
      return dataVenda >= mesInicio && dataVenda <= mesFim;
    });

    const totalMes = vendasMes.reduce((sum, v) => sum + v.valor_total, 0);

    ultimosSeisMeses.push({
      mes: format(mes, 'MMM/yy'),
      vendas: vendasMes.length,
      receita: totalMes
    });
  }

  // MARGEM POR CATEGORIA (incluindo comissões)
  const margemCategoria = {};
  vendasPeriodo.forEach(venda => {
    const comissaoVenda = comissoes.find(c => c.venda_id === venda.id && c.status === 'pago');
    const valorComissaoTotal = comissaoVenda ? (parseFloat(comissaoVenda.valor_comissao) || 0) : 0;
    
    venda.itens?.forEach(item => {
      const produto = produtos.find(p => p.id === item.produto_id);
      if (!produto) return;

      const categoria = produto.categoria || 'outros';
      if (!margemCategoria[categoria]) {
        margemCategoria[categoria] = { receita: 0, custo: 0, margem: 0 };
      }

      // Calcular proporção de comissão por item
      const proporcaoItem = venda.valor_total > 0 ? item.subtotal / venda.valor_total : 0;
      const comissaoItem = valorComissaoTotal * proporcaoItem;

      margemCategoria[categoria].receita += item.subtotal;
      margemCategoria[categoria].custo += (produto.preco_custo || 0) * item.quantidade + comissaoItem;
    });
  });

  const margensPorCategoria = Object.entries(margemCategoria).map(([cat, dados]) => ({
    categoria: cat,
    receita: dados.receita,
    margem: dados.receita - dados.custo,
    percentual: dados.receita > 0 ? ((dados.receita - dados.custo) / dados.receita) * 100 : 0
  })).sort((a, b) => b.margem - a.margem);

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="w-7 h-7 text-blue-600" />
          Análises Avançadas
        </h1>
        <p className="text-slate-500">Curva ABC, Sazonalidade e Margem por Categoria</p>
      </div>

      <DateRangeFilter onFilterChange={setFiltro} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-slate-500">Classe A (Top 80%)</p>
              <p className="text-3xl font-bold text-green-600">{classeA.length}</p>
              <p className="text-xs text-slate-500">produtos essenciais</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-slate-500">Classe B (80-95%)</p>
              <p className="text-3xl font-bold text-blue-600">{classeB.length}</p>
              <p className="text-xs text-slate-500">produtos importantes</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-slate-500">
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-slate-500">Classe C (95-100%)</p>
              <p className="text-3xl font-bold text-slate-600">{classeC.length}</p>
              <p className="text-xs text-slate-500">produtos ocasionais</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>📊 Curva ABC - Produtos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Posição</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead className="text-right">Qtd Vendida</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-right">% Receita</TableHead>
                <TableHead className="text-right">% Acumulado</TableHead>
                <TableHead className="text-right">Margem Lucro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {curvaABC.slice(0, 20).map((produto) => (
                <TableRow key={produto.produto_id}>
                  <TableCell>#{produto.posicao}</TableCell>
                  <TableCell className="font-semibold">{produto.produto_nome}</TableCell>
                  <TableCell>
                    <Badge className={
                      produto.classe === 'A' ? 'bg-green-600' : 
                      produto.classe === 'B' ? 'bg-blue-600' : 'bg-slate-600'
                    }>
                      {produto.classe}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{produto.quantidade_vendida}</TableCell>
                  <TableCell className="text-right font-bold text-green-600">
                    R$ {produto.receita_total.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">{produto.percentual_receita.toFixed(1)}%</TableCell>
                  <TableCell className="text-right">{produto.percentual_acumulado.toFixed(1)}%</TableCell>
                  <TableCell className="text-right font-semibold text-blue-600">
                    R$ {produto.margem_lucro.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>📈 Sazonalidade (Últimos 6 Meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={ultimosSeisMeses}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                <Line type="monotone" dataKey="receita" stroke="#3b82f6" strokeWidth={2} name="Receita" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>💰 Margem por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {margensPorCategoria.map((cat) => (
                  <TableRow key={cat.categoria}>
                    <TableCell className="font-semibold capitalize">{cat.categoria.replace(/_/g, ' ')}</TableCell>
                    <TableCell className="text-right">R$ {cat.receita.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold text-green-600">R$ {cat.margem.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Badge className={cat.percentual >= 30 ? 'bg-green-600' : cat.percentual >= 20 ? 'bg-blue-600' : 'bg-orange-600'}>
                        {cat.percentual.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}