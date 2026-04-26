import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLoja } from "@/contexts/LojaContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, Users, Check, Download, BarChart3, CheckCircle, Clock, AlertCircle, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { exportToPDF } from "@/utils/pdfExport";
import DateRangeFilter from "@/components/DateRangeFilter";
import {
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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Comissoes() {
  const { lojaFiltroId } = useLoja();
  const hoje = new Date();
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const [filtro, setFiltro] = useState({
    dataInicio: format(primeiroDiaMes, 'yyyy-MM-dd'),
    dataFim: format(hoje, 'yyyy-MM-dd')
  });
  const [vendedorSelecionado, setVendedorSelecionado] = useState("todos");
  const [paginaPendentes, setPaginaPendentes] = useState(1);
  const [paginaPagas, setPaginaPagas] = useState(1);
  const [paginaTodas, setPaginaTodas] = useState(1);
  const ITENS_POR_PAGINA = 15;

  const filtrarPorData = (data) => {
    if (!data) return false;
    try {
      const dataStr = typeof data === 'string' ? data : data.toISOString();
      const dataComparar = dataStr.includes('T') ? dataStr.split('T')[0] : dataStr;
      return dataComparar >= filtro.dataInicio && dataComparar <= filtro.dataFim;
    } catch {
      return false;
    }
  };

  const queryClient = useQueryClient();

  const { data: vendas = [] } = useQuery({
    queryKey: ['vendas', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.Venda.filter({ loja_id: lojaFiltroId })
      : base44.entities.Venda.list(),
    refetchInterval: 5 * 60 * 1000
  });

  const { data: comissoes = [] } = useQuery({
    queryKey: ['comissoes', lojaFiltroId],
    queryFn: async () => {
      try {
        return lojaFiltroId
          ? await base44.entities.Comissao.filter({ loja_id: lojaFiltroId }, { order: '-created_date' })
          : await base44.entities.Comissao.list('-created_date');
      } catch {
        return [];
      }
    },
    refetchInterval: 5 * 60 * 1000
  });

  const { data: usuariosSistema = [] } = useQuery({
    queryKey: ['usuarios-sistema', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.UsuarioSistema.filter({ loja_id: lojaFiltroId })
      : base44.entities.UsuarioSistema.list(),
  });

  const pagarComissaoMutation = useMutation({
    mutationFn: (id) => base44.entities.Comissao.update(id, {
      status: "pago",
      data_pagamento: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comissoes', lojaFiltroId] });
      toast.success("Comissão paga!");
    },
  });

  // CRÍTICO: Incluir comissões canceladas e pagas no filtro
  const comissoesFiltradas = comissoes
    .filter(c => c.status !== "cancelada") // Excluir apenas canceladas
    .filter(c => filtrarPorData(c.created_date))
    .filter(c => vendedorSelecionado === "todos" || c.vendedor_id === vendedorSelecionado);
  
  const comissoesPendentes = comissoesFiltradas.filter(c => c.status === "pendente");
  const comissoesPagas = comissoesFiltradas.filter(c => c.status === "pago");

  // CRÍTICO: Cálculos seguros com parseFloat
  const totalPendente = comissoesPendentes.reduce((sum, c) => sum + (parseFloat(c.valor_comissao) || 0), 0);
  const totalPago = comissoesPagas.reduce((sum, c) => sum + (parseFloat(c.valor_comissao) || 0), 0);

  // CRÍTICO: Cálculos por vendedor com parseFloat
  const porVendedor = usuariosSistema.map(usuario => {
    const comissoesUsuario = comissoesFiltradas.filter(c => c.vendedor_id === usuario.user_id);
    const totalComissao = comissoesUsuario.reduce((sum, c) => sum + (parseFloat(c.valor_comissao) || 0), 0);
    const totalVendido = comissoesUsuario.reduce((sum, c) => sum + (parseFloat(c.valor_venda) || 0), 0);
    const pendente = comissoesUsuario.filter(c => c.status === "pendente").reduce((sum, c) => sum + (parseFloat(c.valor_comissao) || 0), 0);
    const pago = comissoesUsuario.filter(c => c.status === "pago").reduce((sum, c) => sum + (parseFloat(c.valor_comissao) || 0), 0);

    return {
      nome: usuario.nome,
      total_comissao: totalComissao,
      total_vendido: totalVendido,
      quantidade_vendas: comissoesUsuario.length,
      pendente: pendente,
      pago: pago
    };
  }).filter(v => v.quantidade_vendas > 0).sort((a, b) => b.total_comissao - a.total_comissao);

  // Dados para gráfico de barras (Top vendedores)
  const dadosGraficoVendedores = porVendedor.slice(0, 6).map(v => ({
    nome: v.nome.split(' ')[0],
    Total: v.total_comissao,
    Pago: v.pago,
    Pendente: v.pendente
  }));

  // Dados para gráfico de pizza (Status geral)
  const dadosStatus = [
    { name: 'Pagas', value: comissoesPagas.length },
    { name: 'Pendentes', value: comissoesPendentes.length }
  ];

  // Helper para buscar código da venda
  const getCodigoVenda = (venda_id) => {
    const venda = vendas.find(v => v.id === venda_id);
    return venda?.codigo_venda || venda_id?.substring(0, 8) || '-';
  };

  const exportarCSV = () => {
    const csv = [
      ['Data Venda', 'Código Venda', 'Vendedor', 'Valor Venda', '% Comissão', 'Valor Comissão', 'Status', 'Data Pagamento'].join(','),
      ...comissoesFiltradas.map(c => [
        format(new Date(c.created_date), 'dd/MM/yyyy'),
        getCodigoVenda(c.venda_id),
        c.vendedor_nome,
        (parseFloat(c.valor_venda) || 0).toFixed(2),
        c.percentual,
        (parseFloat(c.valor_comissao) || 0).toFixed(2),
        c.status,
        c.data_pagamento ? format(new Date(c.data_pagamento), 'dd/MM/yyyy') : '-'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comissoes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast.success("Exportado!");
  };

  const exportarPDF = () => {
    try {
      if (comissoesFiltradas.length === 0) {
        toast.error('Não há dados para exportar');
        return;
      }

      const headers = ['Data', 'Venda', 'Vendedor', 'Valor Venda', '%', 'Comissão', 'Status'];
      const data = comissoesFiltradas.map(c => [
        format(new Date(c.created_date), 'dd/MM/yyyy'),
        getCodigoVenda(c.venda_id),
        c.vendedor_nome,
        `R$ ${(parseFloat(c.valor_venda) || 0).toFixed(2)}`,
        `${c.percentual}%`,
        `R$ ${(parseFloat(c.valor_comissao) || 0).toFixed(2)}`,
        c.status === 'pago' ? 'Pago' : 'Pendente'
      ]);

      exportToPDF('Relatório de Comissões', headers, data, 'comissoes.pdf');
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF');
    }
  };

  const paginar = (lista, pagina) => {
    const inicio = (pagina - 1) * ITENS_POR_PAGINA;
    return lista.slice(inicio, inicio + ITENS_POR_PAGINA);
  };

  const totalPaginasPendentes = Math.ceil(comissoesPendentes.length / ITENS_POR_PAGINA);
  const totalPaginasPagas = Math.ceil(comissoesPagas.length / ITENS_POR_PAGINA);
  const totalPaginasTodas = Math.ceil(comissoesFiltradas.length / ITENS_POR_PAGINA);

  const PaginacaoControle = ({ pagina, setPagina, totalPaginas, totalItens }) => {
    if (totalPaginas <= 1) return null;
    return (
      <div className="flex items-center justify-between mt-4 pt-4 border-t">
        <span className="text-sm text-slate-500">
          Mostrando {((pagina - 1) * ITENS_POR_PAGINA) + 1}-{Math.min(pagina * ITENS_POR_PAGINA, totalItens)} de {totalItens}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium px-2">{pagina} / {totalPaginas}</span>
          <Button variant="outline" size="sm" disabled={pagina >= totalPaginas} onClick={() => setPagina(p => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-green-600" />
            Comissões de Vendas
          </h1>
          <p className="text-slate-500">Acompanhe comissões por vendedor e período</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportarPDF} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button onClick={exportarCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      <DateRangeFilter onFilterChange={setFiltro} />

      <Card className="shadow-lg bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <Label className="text-sm font-semibold text-blue-900">Filtrar por Vendedor</Label>
              <Select value={vendedorSelecionado} onValueChange={setVendedorSelecionado}>
                <SelectTrigger className="mt-1 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Vendedores</SelectItem>
                  {porVendedor.map((v, idx) => (
                    <SelectItem key={idx} value={usuariosSistema.find(u => u.nome === v.nome)?.user_id || idx}>
                      {v.nome} - R$ {(parseFloat(v.total_comissao) || 0).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-orange-500 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-white to-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Clock className="w-12 h-12 text-orange-600 bg-orange-100 p-2.5 rounded-xl shadow-sm" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Pendentes</p>
                <p className="text-3xl font-bold text-orange-600">R$ {totalPendente.toFixed(2)}</p>
                <p className="text-xs text-slate-500 mt-1">{comissoesPendentes.length} comissões</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-white to-green-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-12 h-12 text-green-600 bg-green-100 p-2.5 rounded-xl shadow-sm" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Pagas</p>
                <p className="text-3xl font-bold text-green-600">R$ {totalPago.toFixed(2)}</p>
                <p className="text-xs text-slate-500 mt-1">{comissoesPagas.length} comissões</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-white to-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <DollarSign className="w-12 h-12 text-blue-600 bg-blue-100 p-2.5 rounded-xl shadow-sm" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Total Período</p>
                <p className="text-3xl font-bold text-blue-600">R$ {(totalPendente + totalPago).toFixed(2)}</p>
                <p className="text-xs text-slate-500 mt-1">{comissoesFiltradas.length} comissões</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-white to-purple-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Users className="w-12 h-12 text-purple-600 bg-purple-100 p-2.5 rounded-xl shadow-sm" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Vendedores</p>
                <p className="text-3xl font-bold text-purple-600">{porVendedor.length}</p>
                <p className="text-xs text-slate-500 mt-1">com vendas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Top Vendedores por Comissão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosGraficoVendedores}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="nome" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                <Tooltip 
                  formatter={(value) => `R$ ${value.toFixed(2)}`}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="Pago" fill="#10b981" name="Pago" />
                <Bar dataKey="Pendente" fill="#f59e0b" name="Pendente" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Status das Comissões</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dadosStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent, value }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dadosStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#f59e0b'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Ranking por Vendedor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Posição</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Vendas</TableHead>
                <TableHead className="text-right">Total Vendido</TableHead>
                <TableHead className="text-right">Comissão Total</TableHead>
                <TableHead className="text-right">Paga</TableHead>
                <TableHead className="text-right">Pendente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {porVendedor.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Nenhuma venda com comissão no período
                  </TableCell>
                </TableRow>
              ) : (
                porVendedor.map((v, idx) => (
                  <TableRow key={idx} className="hover:bg-blue-50 transition-colors">
                    <TableCell>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white shadow-md ${idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500' : idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400' : idx === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700' : 'bg-slate-300 text-slate-700'}`}>
                        #{idx + 1}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-slate-900">{v.nome}</TableCell>
                    <TableCell className="text-right font-semibold">{v.quantidade_vendas}</TableCell>
                    <TableCell className="text-right font-semibold text-slate-700">R$ {v.total_vendido.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold text-blue-600 text-lg">R$ {v.total_comissao.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-green-600 font-semibold">R$ {v.pago.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-orange-600 font-semibold">R$ {v.pendente.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Tabs defaultValue="pendentes">
        <TabsList>
          <TabsTrigger value="pendentes">
            <Clock className="w-4 h-4 mr-2" />
            Pendentes ({comissoesPendentes.length})
          </TabsTrigger>
          <TabsTrigger value="pagas">
            <CheckCircle className="w-4 h-4 mr-2" />
            Pagas ({comissoesPagas.length})
          </TabsTrigger>
          <TabsTrigger value="todas">
            Todas ({comissoesFiltradas.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pendentes">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Comissões Pendentes</span>
                <Badge variant="destructive">{comissoesPendentes.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data Venda</TableHead>
                    <TableHead>Código Venda</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Valor Venda</TableHead>
                    <TableHead>%</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comissoesPendentes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        Nenhuma comissão pendente no período selecionado
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginar(comissoesPendentes, paginaPendentes).map((com) => (
                      <TableRow key={com.id} className="hover:bg-orange-50">
                        <TableCell>{format(new Date(com.created_date), 'dd/MM/yyyy HH:mm')}</TableCell>
                        <TableCell className="font-mono text-xs">{getCodigoVenda(com.venda_id)}</TableCell>
                        <TableCell className="font-semibold">{com.vendedor_nome}</TableCell>
                        <TableCell>R$ {(parseFloat(com.valor_venda) || 0).toFixed(2)}</TableCell>
                        <TableCell><Badge variant="outline">{com.percentual}%</Badge></TableCell>
                        <TableCell className="font-bold text-green-600">R$ {(parseFloat(com.valor_comissao) || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => pagarComissaoMutation.mutate(com.id)} className="bg-green-600">
                            <Check className="w-4 h-4 mr-1" />
                            Pagar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <PaginacaoControle pagina={paginaPendentes} setPagina={setPaginaPendentes} totalPaginas={totalPaginasPendentes} totalItens={comissoesPendentes.length} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagas">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Comissões Pagas</span>
                <Badge className="bg-green-600">{comissoesPagas.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data Venda</TableHead>
                    <TableHead>Código Venda</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Valor Venda</TableHead>
                    <TableHead>%</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead>Data Pagamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comissoesPagas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        Nenhuma comissão paga no período selecionado
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginar(comissoesPagas, paginaPagas).map((com) => (
                      <TableRow key={com.id} className="hover:bg-green-50">
                        <TableCell>{format(new Date(com.created_date), 'dd/MM/yyyy HH:mm')}</TableCell>
                        <TableCell className="font-mono text-xs">{getCodigoVenda(com.venda_id)}</TableCell>
                        <TableCell className="font-semibold">{com.vendedor_nome}</TableCell>
                        <TableCell>R$ {(parseFloat(com.valor_venda) || 0).toFixed(2)}</TableCell>
                        <TableCell><Badge variant="outline">{com.percentual}%</Badge></TableCell>
                        <TableCell className="font-bold text-green-600">R$ {(parseFloat(com.valor_comissao) || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {com.data_pagamento ? format(new Date(com.data_pagamento), 'dd/MM/yyyy HH:mm') : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <PaginacaoControle pagina={paginaPagas} setPagina={setPaginaPagas} totalPaginas={totalPaginasPagas} totalItens={comissoesPagas.length} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="todas">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Todas as Comissões</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data Venda</TableHead>
                    <TableHead>Venda</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Valor Venda</TableHead>
                    <TableHead>%</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Pgto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comissoesFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        Nenhuma comissão encontrada no período selecionado
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginar(comissoesFiltradas, paginaTodas).map((com) => (
                      <TableRow key={com.id} className="hover:bg-slate-50">
                        <TableCell>{format(new Date(com.created_date), 'dd/MM/yyyy HH:mm')}</TableCell>
                        <TableCell className="font-mono text-xs">{getCodigoVenda(com.venda_id)}</TableCell>
                        <TableCell className="font-semibold">{com.vendedor_nome}</TableCell>
                        <TableCell>R$ {(parseFloat(com.valor_venda) || 0).toFixed(2)}</TableCell>
                        <TableCell><Badge variant="outline">{com.percentual}%</Badge></TableCell>
                        <TableCell className="font-bold text-green-600">R$ {(parseFloat(com.valor_comissao) || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={com.status === 'pago' ? 'default' : 'secondary'} className={com.status === 'pago' ? 'bg-green-600' : 'bg-orange-500'}>
                            {com.status === 'pago' ? 'Pago' : 'Pendente'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {com.data_pagamento ? format(new Date(com.data_pagamento), 'dd/MM/yyyy HH:mm') : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <PaginacaoControle pagina={paginaTodas} setPagina={setPaginaTodas} totalPaginas={totalPaginasTodas} totalItens={comissoesFiltradas.length} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}