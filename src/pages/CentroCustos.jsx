import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { format, isWithinInterval, parseISO, startOfMonth, startOfDay, endOfDay } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import DateRangeFilter from "@/components/DateRangeFilter";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function CentroCustos() {
  const { lojaFiltroId } = useLoja();
  const hoje = new Date();
  const [filtro, setFiltro] = useState({
    dataInicio: format(startOfMonth(hoje), 'yyyy-MM-dd'),
    dataFim: format(hoje, 'yyyy-MM-dd')
  });
  const [visualizacao, setVisualizacao] = useState('pago'); // 'pago' ou 'todos'
  const [pagina, setPagina] = useState(1);
  const ITENS_POR_PAGINA = 20;

  const filtrarPorData = (data) => {
    if (!data) return false;
    try {
      return isWithinInterval(parseISO(data), {
        start: startOfDay(parseISO(filtro.dataInicio)),
        end: endOfDay(parseISO(filtro.dataFim))
      });
    } catch {
      return false;
    }
  };

  const { data: contasPagar = [] } = useQuery({
    queryKey: ['contas-pagar', lojaFiltroId],
    queryFn: async () => {
      try {
        return lojaFiltroId
          ? await base44.entities.ContaPagar.filter({ loja_id: lojaFiltroId }, { order: '-created_date' })
          : lojaFiltroId ? await base44.entities.ContaPagar.filter({ loja_id: lojaFiltroId }, { order: '-created_date' }) : await base44.entities.ContaPagar.list('-created_date');
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
          ? await base44.entities.Comissao.filter({ loja_id: lojaFiltroId }, { order: '-created_date' })
          : lojaFiltroId ? await base44.entities.Comissao.filter({ loja_id: lojaFiltroId }, { order: '-created_date' }) : await base44.entities.Comissao.list('-created_date');
      } catch {
        return [];
      }
    },
  });

  // Filtrar por data e status
  const contasFiltradas = contasPagar.filter(c => {
    const dataRef = c.data_pagamento || c.created_date;
    const passaFiltroData = filtrarPorData(dataRef);
    const passaFiltroStatus = visualizacao === 'todos' || c.status === 'pago';
    return passaFiltroData && passaFiltroStatus;
  });

  const comissoesFiltradas = comissoes.filter(c => {
    const dataRef = c.data_pagamento || c.created_date;
    const passaFiltroData = filtrarPorData(dataRef);
    const passaFiltroStatus = visualizacao === 'todos' || c.status === 'pago';
    return passaFiltroData && passaFiltroStatus;
  });

  // Agrupar por categoria
  const custoPorCategoria = contasFiltradas.reduce((acc, conta) => {
    const cat = conta.categoria || 'outros';
    acc[cat] = (acc[cat] || 0) + (parseFloat(conta.valor) || 0);
    return acc;
  }, {});

  // Adicionar comissões como categoria
  const totalComissoes = comissoesFiltradas.reduce((sum, c) => sum + (parseFloat(c.valor_comissao) || 0), 0);
  if (totalComissoes > 0) {
    custoPorCategoria['comissões'] = totalComissoes;
  }

  const dadosGrafico = Object.entries(custoPorCategoria).map(([name, value]) => ({
    name: name.replace(/_/g, ' ').toUpperCase(),
    value
  }));

  const totalCustos = dadosGrafico.reduce((sum, d) => sum + d.value, 0);

  // Criar lista detalhada de todas as despesas
  const todasDespesas = [
    ...contasFiltradas.map(c => ({
      id: c.id,
      tipo: 'conta',
      descricao: c.descricao || 'Sem descrição',
      categoria: c.categoria || 'outros',
      valor: parseFloat(c.valor) || 0,
      status: c.status,
      data: c.data_pagamento || c.created_date,
      fornecedor: c.fornecedor_nome || '-'
    })),
    ...comissoesFiltradas.map(c => ({
      id: c.id,
      tipo: 'comissao',
      descricao: `Comissão - ${c.vendedor_nome}`,
      categoria: 'comissões',
      valor: parseFloat(c.valor_comissao) || 0,
      status: c.status,
      data: c.data_pagamento || c.created_date,
      fornecedor: c.vendedor_nome || '-'
    }))
  ].sort((a, b) => new Date(b.data) - new Date(a.data));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Centro de Custos</h1>
        <p className="text-slate-500">Análise de despesas por categoria</p>
      </div>

      <DateRangeFilter onFilterChange={(f) => { setFiltro(f); setPagina(1); }} />

      <Tabs value={visualizacao} onValueChange={setVisualizacao}>
        <TabsList>
          <TabsTrigger value="pago">Apenas Pagos</TabsTrigger>
          <TabsTrigger value="todos">Todos (incluindo pendentes)</TabsTrigger>
        </TabsList>
      </Tabs>

      {dadosGrafico.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-slate-500 text-lg">Nenhuma despesa encontrada no período selecionado.</p>
            <p className="text-slate-400 text-sm mt-2">
              {visualizacao === 'pago'
                ? 'Tente selecionar "Todos" para ver despesas pendentes.'
                : 'Cadastre contas a pagar ou pague comissões para visualizar dados.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Total de Custos: R$ {totalCustos.toFixed(2)}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={dadosGrafico}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dadosGrafico.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dadosGrafico.map((categoria, idx) => (
              <Card key={idx}>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">{categoria.name}</h3>
                  <p className="text-2xl font-bold" style={{ color: COLORS[idx % COLORS.length] }}>
                    R$ {categoria.value.toFixed(2)}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    {totalCustos > 0 ? ((categoria.value / totalCustos) * 100).toFixed(1) : 0}% do total
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detalhamento das Despesas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Fornecedor/Vendedor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todasDespesas.slice((pagina - 1) * ITENS_POR_PAGINA, pagina * ITENS_POR_PAGINA).map((despesa) => (
                      <TableRow key={despesa.id}>
                        <TableCell className="whitespace-nowrap">
                          {despesa.data ? format(new Date(despesa.data), 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell className="font-medium">{despesa.descricao}</TableCell>
                        <TableCell className="capitalize">{despesa.categoria}</TableCell>
                        <TableCell>{despesa.fornecedor}</TableCell>
                        <TableCell>
                          <Badge variant={despesa.status === 'pago' ? 'default' : 'secondary'}>
                            {despesa.status === 'pago' ? 'Pago' : 'Pendente'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-red-600">
                          R$ {despesa.valor.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {Math.ceil(todasDespesas.length / ITENS_POR_PAGINA) > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-sm text-slate-500">
                    Mostrando {((pagina - 1) * ITENS_POR_PAGINA) + 1}-{Math.min(pagina * ITENS_POR_PAGINA, todasDespesas.length)} de {todasDespesas.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-medium px-2">{pagina} / {Math.ceil(todasDespesas.length / ITENS_POR_PAGINA)}</span>
                    <Button variant="outline" size="sm" disabled={pagina >= Math.ceil(todasDespesas.length / ITENS_POR_PAGINA)} onClick={() => setPagina(p => p + 1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}