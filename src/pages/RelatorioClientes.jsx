import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useLoja } from "@/contexts/LojaContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Calendar, Phone, Mail, Download, Filter } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import DateRangeFilter from "@/components/DateRangeFilter";
import { format, differenceInDays, parseISO } from "date-fns";
import { toast } from "sonner";
import { exportToPDF } from "@/utils/pdfExport";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function RelatorioClientes() {
  const { lojaFiltroId } = useLoja();
  const hoje = new Date();
  const [filtro, setFiltro] = useState({
    dataInicio: format(new Date(hoje.getFullYear(), hoje.getMonth(), 1), 'yyyy-MM-dd'),
    dataFim: format(hoje, 'yyyy-MM-dd')
  });
  const [buscaTexto, setBuscaTexto] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroFonte, setFiltroFonte] = useState("todos");

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.Cliente.filter({ loja_id: lojaFiltroId })
      : base44.entities.Cliente.list(),
  });

  const { data: vendas = [] } = useQuery({
    queryKey: ['vendas', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.Venda.filter({ loja_id: lojaFiltroId })
      : base44.entities.Venda.list(),
  });

  const { data: ordensServico = [] } = useQuery({
    queryKey: ['ordens-servico', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.OrdemServico.filter({ loja_id: lojaFiltroId })
      : base44.entities.OrdemServico.list(),
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

  const clientesComDados = clientes.map(cliente => {
    const vendasCliente = vendas.filter(v => v.cliente_id === cliente.id && v.status === 'finalizada');
    const vendasPeriodo = vendasCliente.filter(v => filtrarPorData(v.created_date));
    const osCliente = ordensServico.filter(os => os.cliente_id === cliente.id);
    const osPeriodo = osCliente.filter(os => filtrarPorData(os.created_date));

    const totalGasto = vendasCliente.reduce((sum, v) => sum + (parseFloat(v.valor_total) || 0), 0);
    const totalGastoPeriodo = vendasPeriodo.reduce((sum, v) => sum + (parseFloat(v.valor_total) || 0), 0);

    // CORREÇÃO: Ordenar vendas por data antes de pegar a última compra
    const vendasOrdenadas = [...vendasCliente].sort((a, b) =>
      new Date(b.created_date) - new Date(a.created_date)
    );
    const ultimaCompra = vendasOrdenadas.length > 0 ? new Date(vendasOrdenadas[0].created_date) : null;
    const diasSemComprar = ultimaCompra ? differenceInDays(new Date(), ultimaCompra) : 999;
    const ticketMedio = vendasCliente.length > 0 ? totalGasto / vendasCliente.length : 0;

    return {
      ...cliente,
      totalCompras: vendasCliente.length,
      comprasPeriodo: vendasPeriodo.length,
      totalGasto,
      totalGastoPeriodo,
      totalOS: osCliente.length,
      osPeriodo: osPeriodo.length,
      ultimaCompra,
      diasSemComprar,
      ticketMedio,
      status: diasSemComprar <= 30 ? 'ativo' : diasSemComprar <= 90 ? 'regular' : 'inativo'
    };
  });

  // Aplicar filtros
  const clientesFiltrados = clientesComDados.filter(c => {
    const matchBusca = !buscaTexto || 
      c.nome_completo?.toLowerCase().includes(buscaTexto.toLowerCase()) ||
      c.cpf_cnpj?.includes(buscaTexto) ||
      c.telefone1?.includes(buscaTexto);
    const matchStatus = filtroStatus === "todos" || c.status === filtroStatus;
    const matchFonte = filtroFonte === "todos" || c.fonte === filtroFonte;
    return matchBusca && matchStatus && matchFonte;
  });

  const topClientes = [...clientesFiltrados].sort((a, b) => b.totalGastoPeriodo - a.totalGastoPeriodo).slice(0, 20);
  const clientesInativos = clientesFiltrados.filter(c => c.diasSemComprar > 90);
  const clientesNovos = clientesFiltrados.filter(c => {
    const dataCadastro = parseISO(c.created_date);
    return filtrarPorData(c.created_date);
  });

  // Estatísticas
  const totalClientesAtivos = clientesFiltrados.filter(c => c.status === 'ativo').length;
  const ticketMedioGeral = clientesFiltrados.reduce((sum, c) => sum + c.ticketMedio, 0) / (clientesFiltrados.length || 1);
  const totalReceitaPeriodo = clientesFiltrados.reduce((sum, c) => sum + c.totalGastoPeriodo, 0);

  // Dados por fonte
  const clientesPorFonte = clientesFiltrados.reduce((acc, c) => {
    const fonte = c.fonte || 'outros';
    if (!acc[fonte]) acc[fonte] = 0;
    acc[fonte]++;
    return acc;
  }, {});

  const dadosFonte = Object.entries(clientesPorFonte).map(([fonte, quantidade]) => ({
    name: fonte.replace('_', ' ').toUpperCase(),
    value: quantidade
  }));

  // Dados frequência de compra
  const dadosFrequencia = [
    { name: 'Alta (< 30 dias)', value: clientesFiltrados.filter(c => c.diasSemComprar <= 30).length },
    { name: 'Média (30-90 dias)', value: clientesFiltrados.filter(c => c.diasSemComprar > 30 && c.diasSemComprar <= 90).length },
    { name: 'Baixa (> 90 dias)', value: clientesFiltrados.filter(c => c.diasSemComprar > 90).length }
  ];

  const exportarCSV = () => {
    const headers = ['Nome', 'Telefone', 'Email', 'Total Compras', 'Total Gasto', 'Ticket Médio', 'Última Compra', 'Dias sem Comprar', 'Status'];
    const rows = clientesFiltrados.map(c => [
      c.nome_completo,
      c.telefone1,
      c.email || '',
      c.totalCompras,
      c.totalGasto.toFixed(2),
      c.ticketMedio.toFixed(2),
      c.ultimaCompra ? format(c.ultimaCompra, 'dd/MM/yyyy') : 'Nunca',
      c.diasSemComprar,
      c.status
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_clientes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success("Relatório exportado!");
  };

  const exportarPDF = () => {
    const headers = ['Nome', 'Telefone', 'Total Compras', 'Total Gasto', 'Ticket Médio', 'Última Compra', 'Status'];
    const data = clientesFiltrados.map(c => [
      c.nome_completo || '-',
      c.telefone1 || '-',
      c.totalCompras,
      `R$ ${c.totalGasto.toFixed(2)}`,
      `R$ ${c.ticketMedio.toFixed(2)}`,
      c.ultimaCompra ? format(c.ultimaCompra, 'dd/MM/yyyy') : 'Nunca',
      c.status
    ]);

    exportToPDF(
      'Relatório de Clientes',
      headers,
      data,
      'relatorio_clientes',
      { periodo: `${filtro.dataInicio} a ${filtro.dataFim}` }
    );
    toast.success("PDF exportado!");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Relatório de Clientes</h1>
          <p className="text-slate-500">Análise detalhada do relacionamento com clientes</p>
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

      {/* Filtros Avançados */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="w-5 h-5 text-slate-400" />
            <Input
              placeholder="Buscar por nome, telefone ou CPF/CNPJ..."
              value={buscaTexto}
              onChange={(e) => setBuscaTexto(e.target.value)}
              className="flex-1 min-w-[250px]"
            />
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Status</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="regular">Regulares</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroFonte} onValueChange={setFiltroFonte}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas Fontes</SelectItem>
                <SelectItem value="loja_fisica">Loja Física</SelectItem>
                <SelectItem value="anuncio_online">Anúncio Online</SelectItem>
                <SelectItem value="indicacao">Indicação</SelectItem>
                <SelectItem value="redes_sociais">Redes Sociais</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 opacity-80" />
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-sm opacity-90">Total de Clientes</p>
            <p className="text-3xl font-bold">{clientes.length}</p>
            <p className="text-xs opacity-75 mt-1">Ativos: {totalClientesAtivos}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 opacity-80" />
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-sm opacity-90">Receita no Período</p>
            <p className="text-3xl font-bold">R$ {totalReceitaPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <ShoppingCart className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-sm opacity-90">Ticket Médio</p>
            <p className="text-3xl font-bold">R$ {ticketMedioGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-8 h-8 opacity-80" />
              <TrendingDown className="w-5 h-5" />
            </div>
            <p className="text-sm opacity-90">Clientes Inativos</p>
            <p className="text-3xl font-bold">{clientesInativos.length}</p>
            <p className="text-xs opacity-75 mt-1">Sem comprar há 90+ dias</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Origem dos Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dadosFonte}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dadosFonte.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Frequência de Compra</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosFrequencia}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} style={{ fontSize: '12px' }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="top">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="top">Top Clientes</TabsTrigger>
          <TabsTrigger value="novos">Novos</TabsTrigger>
          <TabsTrigger value="inativos">Inativos</TabsTrigger>
          <TabsTrigger value="completo">Visão Completa</TabsTrigger>
        </TabsList>

        {/* Top Clientes */}
        <TabsContent value="top">
          <Card>
            <CardHeader>
              <CardTitle>Top 20 Clientes por Faturamento</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pos.</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Compras</TableHead>
                    <TableHead>Total Gasto</TableHead>
                    <TableHead>Ticket Médio</TableHead>
                    <TableHead>Última Compra</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topClientes.map((cliente, idx) => (
                    <TableRow key={cliente.id}>
                      <TableCell>
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center">
                          {idx + 1}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{cliente.nome_completo}</TableCell>
                      <TableCell>{cliente.telefone1}</TableCell>
                      <TableCell>{cliente.totalCompras}</TableCell>
                      <TableCell className="font-bold text-green-600">R$ {cliente.totalGasto.toFixed(2)}</TableCell>
                      <TableCell>R$ {cliente.ticketMedio.toFixed(2)}</TableCell>
                      <TableCell className="text-sm">
                        {cliente.ultimaCompra ? format(cliente.ultimaCompra, 'dd/MM/yyyy') : 'Nunca'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={cliente.status === 'ativo' ? 'default' : cliente.status === 'regular' ? 'secondary' : 'destructive'}>
                          {cliente.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clientes Novos */}
        <TabsContent value="novos">
          <Card>
            <CardHeader>
              <CardTitle>Clientes Novos no Período ({clientesNovos.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Fonte</TableHead>
                    <TableHead>Compras</TableHead>
                    <TableHead>Total Gasto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesNovos.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium">{cliente.nome_completo}</TableCell>
                      <TableCell>{cliente.telefone1}</TableCell>
                      <TableCell className="text-sm">{cliente.email || '-'}</TableCell>
                      <TableCell>{format(parseISO(cliente.created_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{cliente.fonte || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>{cliente.totalCompras}</TableCell>
                      <TableCell className="font-semibold text-green-600">R$ {cliente.totalGasto.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clientes Inativos */}
        <TabsContent value="inativos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-500" />
                Clientes Inativos - Oportunidade de Reativação ({clientesInativos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Última Compra</TableHead>
                    <TableHead>Dias sem Comprar</TableHead>
                    <TableHead>Total Gasto</TableHead>
                    <TableHead>Compras</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesInativos.slice(0, 30).map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium">{cliente.nome_completo}</TableCell>
                      <TableCell>
                        <a href={`https://wa.me/55${cliente.telefone1?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-green-600 hover:underline">
                          <Phone className="w-3 h-3" />
                          {cliente.telefone1}
                        </a>
                      </TableCell>
                      <TableCell className="text-sm">
                        {cliente.email ? (
                          <a href={`mailto:${cliente.email}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                            <Mail className="w-3 h-3" />
                            {cliente.email}
                          </a>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{cliente.ultimaCompra ? format(cliente.ultimaCompra, 'dd/MM/yyyy') : 'Nunca'}</TableCell>
                      <TableCell className="text-red-600 font-bold">{cliente.diasSemComprar} dias</TableCell>
                      <TableCell className="font-semibold">R$ {cliente.totalGasto.toFixed(2)}</TableCell>
                      <TableCell>{cliente.totalCompras}</TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(`https://wa.me/55${cliente.telefone1?.replace(/\D/g, '')}?text=Olá ${cliente.nome_completo}! Sentimos sua falta! 😊`, '_blank')}
                        >
                          <Phone className="w-3 h-3 mr-1" />
                          Contatar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Visão Completa */}
        <TabsContent value="completo">
          <Card>
            <CardHeader>
              <CardTitle>Todos os Clientes - Visão Completa ({clientesFiltrados.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Compras</TableHead>
                    <TableHead>OS</TableHead>
                    <TableHead>Total Gasto</TableHead>
                    <TableHead>Ticket Médio</TableHead>
                    <TableHead>Última Atividade</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesFiltrados.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium">{cliente.nome_completo}</TableCell>
                      <TableCell className="text-sm font-mono">{cliente.cpf_cnpj || '-'}</TableCell>
                      <TableCell>{cliente.telefone1}</TableCell>
                      <TableCell>
                        <div className="text-center">
                          <div className="font-bold">{cliente.totalCompras}</div>
                          {cliente.comprasPeriodo > 0 && (
                            <div className="text-xs text-green-600">+{cliente.comprasPeriodo} no período</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <div className="font-bold">{cliente.totalOS}</div>
                          {cliente.osPeriodo > 0 && (
                            <div className="text-xs text-blue-600">+{cliente.osPeriodo} no período</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-green-600">R$ {cliente.totalGasto.toFixed(2)}</TableCell>
                      <TableCell>R$ {cliente.ticketMedio.toFixed(2)}</TableCell>
                      <TableCell className="text-sm">
                        {cliente.ultimaCompra ? (
                          <div>
                            <div>{format(cliente.ultimaCompra, 'dd/MM/yyyy')}</div>
                            <div className="text-xs text-slate-500">há {cliente.diasSemComprar} dias</div>
                          </div>
                        ) : 'Nunca'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          cliente.status === 'ativo' ? 'default' : 
                          cliente.status === 'regular' ? 'secondary' : 
                          'destructive'
                        }>
                          {cliente.status}
                        </Badge>
                      </TableCell>
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