import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useLoja } from "@/contexts/LojaContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Percent, Store } from "lucide-react";
import DateRangeFilter from "@/components/DateRangeFilter";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function RentabilidadeLoja() {
  const { lojaFiltroId } = useLoja();
  const hoje = new Date();
  const [filtro, setFiltro] = useState({
    dataInicio: format(hoje, 'yyyy-MM-01'),
    dataFim: format(hoje, 'yyyy-MM-dd')
  });
  const [lojaFiltro, setLojaFiltro] = useState("todas");

  const { data: lojas = [] } = useQuery({
    queryKey: ['lojas'],
    queryFn: () => base44.entities.Loja.list(),
    refetchInterval: 30000
  });

  const { data: vendas = [] } = useQuery({
    queryKey: ['vendas', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.Venda.filter({ loja_id: lojaFiltroId })
      : base44.entities.Venda.list('-created_date'),
    refetchInterval: 30000
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.Produto.filter({ loja_id: lojaFiltroId })
      : base44.entities.Produto.list(),
    refetchInterval: 30000
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

  const filtrarPorData = (data) => {
    if (!data) return false;
    try {
      const dataComparar = data.includes('T') ? data.split('T')[0] : data;
      return dataComparar >= filtro.dataInicio && dataComparar <= filtro.dataFim;
    } catch {
      return false;
    }
  };

  const calcularRentabilidade = () => {
    const lojasFiltradas = lojaFiltro === "todas" ? lojas : lojas.filter(l => l.id === lojaFiltro);
    
    return lojasFiltradas.map(loja => {
      const vendasLoja = vendas.filter(v => 
        v.loja_id === loja.id && 
        v.status === 'finalizada' &&
        filtrarPorData(v.data_venda || v.created_date)
      );

      // CRÍTICO: Cálculos com validação
      const faturamento = vendasLoja.reduce((sum, v) => sum + (parseFloat(v.valor_total) || 0), 0);
      
      let custoTotal = 0;
      vendasLoja.forEach(venda => {
        venda.itens?.forEach(item => {
          const produto = produtos.find(p => p.id === item.produto_id);
          const custo = parseFloat(produto?.preco_custo) || 0;
          const qtd = parseInt(item.quantidade) || 0;
          custoTotal += custo * qtd;
        });
      });

      // CRÍTICO: Incluir comissões pagas como custo
      const vendasIds = vendasLoja.map(v => v.id);
      const comissoesLoja = comissoes.filter(c => 
        vendasIds.includes(c.venda_id) && 
        c.status === 'pago' && 
        c.data_pagamento &&
        filtrarPorData(c.data_pagamento)
      );
      const custoComissoes = comissoesLoja.reduce((sum, c) => sum + (parseFloat(c.valor_comissao) || 0), 0);

      const custoTotalComComissoes = custoTotal + custoComissoes;
      const lucro = faturamento - custoTotalComComissoes;
      const margemLucro = faturamento > 0 ? (lucro / faturamento) * 100 : 0;

      return {
        loja: loja.nome,
        faturamento,
        custo: custoTotalComComissoes,
        lucro,
        margem: margemLucro,
        vendas: vendasLoja.length,
        ticketMedio: vendasLoja.length > 0 ? faturamento / vendasLoja.length : 0,
        comissoesPagas: custoComissoes
      };
    }).sort((a, b) => b.lucro - a.lucro);
  };

  const rentabilidade = calcularRentabilidade();
  const lucroTotal = rentabilidade.reduce((sum, r) => sum + r.lucro, 0);
  const faturamentoTotal = rentabilidade.reduce((sum, r) => sum + r.faturamento, 0);
  const margemMedia = faturamentoTotal > 0 ? (lucroTotal / faturamentoTotal) * 100 : 0;

  const dadosGrafico = rentabilidade.map(r => ({
    loja: r.loja,
    Faturamento: r.faturamento,
    Custo: r.custo,
    Lucro: r.lucro
  }));

  const dadosPizza = rentabilidade.map(r => ({
    name: r.loja,
    value: r.lucro
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            Rentabilidade por Loja
          </h1>
          <p className="text-slate-500">Análise de lucratividade e margem de cada filial</p>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Filtrar Loja:</Label>
            <Select value={lojaFiltro} onValueChange={setLojaFiltro}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as Lojas</SelectItem>
                {lojas.map(loja => (
                  <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <DateRangeFilter onFilterChange={setFiltro} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Lucro Total</p>
                <p className="text-2xl font-bold text-green-600">R$ {lucroTotal.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Faturamento Total</p>
                <p className="text-2xl font-bold text-blue-600">R$ {faturamentoTotal.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Percent className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Margem Média</p>
                <p className="text-2xl font-bold text-purple-600">{margemMedia.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Faturamento vs Lucro</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="loja" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                <Legend />
                <Bar dataKey="Faturamento" fill="#3b82f6" />
                <Bar dataKey="Custo" fill="#ef4444" />
                <Bar dataKey="Lucro" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Lucro</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dadosPizza}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dadosPizza.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ranking de Rentabilidade</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Posição</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
                <TableHead className="text-right">Margem</TableHead>
                <TableHead className="text-right">Vendas</TableHead>
                <TableHead className="text-right">Ticket Médio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rentabilidade.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Badge variant={idx === 0 ? "default" : "secondary"}>
                      {idx + 1}º
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold flex items-center gap-2">
                    <Store className="w-4 h-4" />
                    {item.loja}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    R$ {item.faturamento.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    R$ {item.custo.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-green-600">
                    R$ {item.lucro.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {item.margem >= 30 ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                      <Badge variant={item.margem >= 30 ? "default" : "secondary"}>
                        {item.margem.toFixed(1)}%
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{item.vendas}</TableCell>
                  <TableCell className="text-right">
                    R$ {item.ticketMedio.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}