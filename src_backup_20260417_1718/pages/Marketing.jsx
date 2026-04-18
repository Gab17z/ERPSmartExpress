import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import {
  Megaphone,
  Users,
  Gift,
  TrendingUp,
  Mail,
  MessageSquare,
  Calendar,
  Target,
  BarChart3,
  Plus,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Filter,
  Search,
  ChevronRight,
  Star,
  Heart,
  Award,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { format, subDays, startOfMonth, endOfMonth, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Marketing() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("visao-geral");
  const [dialogCampanha, setDialogCampanha] = useState(false);
  const [campanhaEditando, setCampanhaEditando] = useState(null);
  const [filtroSegmento, setFiltroSegmento] = useState("todos");
  const [buscaCliente, setBuscaCliente] = useState("");

  // Queries
  const { data: clientes = [], isLoading: loadingClientes } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('-created_date'),
  });

  const { data: vendas = [], isLoading: loadingVendas } = useQuery({
    queryKey: ['vendas'],
    queryFn: () => base44.entities.Venda.list('-created_date'),
  });

  const { data: cupons = [] } = useQuery({
    queryKey: ['cupons'],
    queryFn: () => base44.entities.CupomDesconto.list('-created_date'),
  });

  // Segmentacao de clientes
  const segmentacaoClientes = useMemo(() => {
    const hoje = new Date();
    const vendaFinalizadas = vendas.filter(v => v.status === 'finalizada');

    return clientes.map(cliente => {
      const vendasCliente = vendaFinalizadas.filter(v => v.cliente_id === cliente.id);
      const totalGasto = vendasCliente.reduce((sum, v) => sum + (v.valor_total || 0), 0);
      const ultimaCompra = vendasCliente.length > 0
        ? new Date(Math.max(...vendasCliente.map(v => new Date(v.created_date))))
        : null;
      const diasSemCompra = ultimaCompra ? differenceInDays(hoje, ultimaCompra) : 999;

      let segmento = 'inativo';
      let score = 0;

      if (vendasCliente.length >= 10 && totalGasto >= 5000) {
        segmento = 'vip';
        score = 100;
      } else if (vendasCliente.length >= 5 || totalGasto >= 2000) {
        segmento = 'frequente';
        score = 75;
      } else if (diasSemCompra <= 30 && vendasCliente.length > 0) {
        segmento = 'ativo';
        score = 50;
      } else if (diasSemCompra <= 90 && vendasCliente.length > 0) {
        segmento = 'ocasional';
        score = 25;
      } else if (vendasCliente.length === 0) {
        segmento = 'novo';
        score = 10;
      } else {
        segmento = 'inativo';
        score = 0;
      }

      return {
        ...cliente,
        totalCompras: vendasCliente.length,
        totalGasto,
        ultimaCompra,
        diasSemCompra,
        segmento,
        score
      };
    });
  }, [clientes, vendas]);

  // Estatisticas por segmento
  const estatisticasSegmento = useMemo(() => {
    const stats = {
      vip: { count: 0, totalGasto: 0, label: 'VIP', color: 'bg-purple-500', icon: Star },
      frequente: { count: 0, totalGasto: 0, label: 'Frequente', color: 'bg-blue-500', icon: Heart },
      ativo: { count: 0, totalGasto: 0, label: 'Ativo', color: 'bg-green-500', icon: CheckCircle },
      ocasional: { count: 0, totalGasto: 0, label: 'Ocasional', color: 'bg-yellow-500', icon: Clock },
      novo: { count: 0, totalGasto: 0, label: 'Novo', color: 'bg-cyan-500', icon: Users },
      inativo: { count: 0, totalGasto: 0, label: 'Inativo', color: 'bg-gray-500', icon: XCircle },
    };

    segmentacaoClientes.forEach(c => {
      if (stats[c.segmento]) {
        stats[c.segmento].count++;
        stats[c.segmento].totalGasto += c.totalGasto;
      }
    });

    return stats;
  }, [segmentacaoClientes]);

  // Clientes em risco (sem comprar há mais de 60 dias mas eram ativos)
  const clientesEmRisco = useMemo(() => {
    return segmentacaoClientes
      .filter(c => c.diasSemCompra >= 60 && c.diasSemCompra <= 180 && c.totalCompras >= 2)
      .sort((a, b) => b.totalGasto - a.totalGasto)
      .slice(0, 10);
  }, [segmentacaoClientes]);

  // Aniversariantes do mes
  const aniversariantesMes = useMemo(() => {
    const mesAtual = new Date().getMonth() + 1;
    return clientes.filter(c => {
      if (!c.data_nascimento) return false;
      const mes = new Date(c.data_nascimento).getMonth() + 1;
      return mes === mesAtual;
    });
  }, [clientes]);

  // Clientes filtrados
  const clientesFiltrados = useMemo(() => {
    let lista = segmentacaoClientes;

    if (filtroSegmento !== 'todos') {
      lista = lista.filter(c => c.segmento === filtroSegmento);
    }

    if (buscaCliente) {
      const termo = buscaCliente.toLowerCase();
      lista = lista.filter(c =>
        c.nome_completo?.toLowerCase().includes(termo) ||
        c.telefone?.includes(termo) ||
        c.email?.toLowerCase().includes(termo)
      );
    }

    return lista.sort((a, b) => b.score - a.score);
  }, [segmentacaoClientes, filtroSegmento, buscaCliente]);

  // KPIs de Marketing
  const kpis = useMemo(() => {
    const totalClientes = clientes.length;
    const clientesAtivos = segmentacaoClientes.filter(c =>
      ['vip', 'frequente', 'ativo'].includes(c.segmento)
    ).length;
    const taxaRetencao = totalClientes > 0 ? (clientesAtivos / totalClientes) * 100 : 0;
    const ticketMedioVIP = estatisticasSegmento.vip.count > 0
      ? estatisticasSegmento.vip.totalGasto / estatisticasSegmento.vip.count
      : 0;

    return {
      totalClientes,
      clientesAtivos,
      taxaRetencao,
      ticketMedioVIP,
      aniversariantes: aniversariantesMes.length,
      emRisco: clientesEmRisco.length,
      cuponsAtivos: cupons.filter(c => c.ativo).length
    };
  }, [clientes, segmentacaoClientes, estatisticasSegmento, aniversariantesMes, clientesEmRisco, cupons]);

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
  };

  const getSegmentoBadge = (segmento) => {
    const config = {
      vip: { label: 'VIP', className: 'bg-purple-100 text-purple-700' },
      frequente: { label: 'Frequente', className: 'bg-blue-100 text-blue-700' },
      ativo: { label: 'Ativo', className: 'bg-green-100 text-green-700' },
      ocasional: { label: 'Ocasional', className: 'bg-yellow-100 text-yellow-700' },
      novo: { label: 'Novo', className: 'bg-cyan-100 text-cyan-700' },
      inativo: { label: 'Inativo', className: 'bg-gray-100 text-gray-700' },
    };
    return config[segmento] || config.inativo;
  };

  if (loadingClientes || loadingVendas) {
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
          <h1 className="text-3xl font-bold text-gray-900">Marketing</h1>
          <p className="text-gray-500 mt-1">Gerencie campanhas, segmentacao e relacionamento com clientes</p>
        </div>
        <div className="flex gap-2">
          <Link to={createPageUrl("Aniversarios")}>
            <Button variant="outline">
              <Gift className="w-4 h-4 mr-2" />
              Aniversarios
            </Button>
          </Link>
          <Link to={createPageUrl("CuponsDesconto")}>
            <Button variant="outline">
              <Award className="w-4 h-4 mr-2" />
              Cupons
            </Button>
          </Link>
        </div>
      </div>

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total de Clientes</p>
                <p className="text-2xl font-bold">{kpis.totalClientes}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {kpis.clientesAtivos} ativos ({kpis.taxaRetencao.toFixed(1)}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Ticket Medio VIP</p>
                <p className="text-2xl font-bold">{formatarMoeda(kpis.ticketMedioVIP)}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Star className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {estatisticasSegmento.vip.count} clientes VIP
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Aniversariantes</p>
                <p className="text-2xl font-bold">{kpis.aniversariantes}</p>
              </div>
              <div className="p-3 bg-pink-100 rounded-full">
                <Gift className="w-6 h-6 text-pink-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Este mes</p>
          </CardContent>
        </Card>

        <Card className={kpis.emRisco > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Clientes em Risco</p>
                <p className="text-2xl font-bold">{kpis.emRisco}</p>
              </div>
              <div className={`p-3 rounded-full ${kpis.emRisco > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                <XCircle className={`w-6 h-6 ${kpis.emRisco > 0 ? 'text-red-600' : 'text-gray-600'}`} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">60-180 dias sem comprar</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="visao-geral">Visao Geral</TabsTrigger>
          <TabsTrigger value="segmentacao">Segmentacao</TabsTrigger>
          <TabsTrigger value="clientes">Lista de Clientes</TabsTrigger>
          <TabsTrigger value="em-risco">Em Risco</TabsTrigger>
        </TabsList>

        {/* Visao Geral */}
        <TabsContent value="visao-geral" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Segmentacao Visual */}
            <Card>
              <CardHeader>
                <CardTitle>Segmentacao de Clientes</CardTitle>
                <CardDescription>Distribuicao por perfil de compra</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(estatisticasSegmento).map(([key, stat]) => {
                    const percentual = clientes.length > 0
                      ? (stat.count / clientes.length) * 100
                      : 0;
                    const IconComponent = stat.icon;

                    return (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <IconComponent className="w-4 h-4" />
                            <span className="font-medium">{stat.label}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span>{stat.count} clientes</span>
                            <span className="text-gray-500">{formatarMoeda(stat.totalGasto)}</span>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${stat.color} transition-all`}
                            style={{ width: `${percentual}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Acoes Rapidas */}
            <Card>
              <CardHeader>
                <CardTitle>Acoes Rapidas</CardTitle>
                <CardDescription>Ferramentas de marketing disponíveis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to={createPageUrl("Aniversarios")} className="block">
                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-pink-100 rounded-lg">
                        <Gift className="w-5 h-5 text-pink-600" />
                      </div>
                      <div>
                        <p className="font-medium">Aniversariantes</p>
                        <p className="text-sm text-gray-500">{kpis.aniversariantes} clientes este mes</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </Link>

                <Link to={createPageUrl("CuponsDesconto")} className="block">
                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Award className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Cupons de Desconto</p>
                        <p className="text-sm text-gray-500">{kpis.cuponsAtivos} cupons ativos</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </Link>

                <Link to={createPageUrl("PosVenda")} className="block">
                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <MessageSquare className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Pos-Venda</p>
                        <p className="text-sm text-gray-500">Acompanhamento de clientes</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </Link>

                <Link to={createPageUrl("CRM")} className="block">
                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Target className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">CRM e Funil</p>
                        <p className="text-sm text-gray-500">Gestao de leads e oportunidades</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </Link>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Segmentacao */}
        <TabsContent value="segmentacao">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(estatisticasSegmento).map(([key, stat]) => {
              const IconComponent = stat.icon;
              return (
                <Card
                  key={key}
                  className="cursor-pointer hover:border-blue-300 transition-colors"
                  onClick={() => {
                    setFiltroSegmento(key);
                    setActiveTab('clientes');
                  }}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 ${stat.color} rounded-full`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{stat.label}</h3>
                        <p className="text-2xl font-bold">{stat.count}</p>
                        <p className="text-sm text-gray-500">
                          Total gasto: {formatarMoeda(stat.totalGasto)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Lista de Clientes */}
        <TabsContent value="clientes">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-4 justify-between">
                <div>
                  <CardTitle>Clientes por Segmento</CardTitle>
                  <CardDescription>
                    {clientesFiltrados.length} clientes encontrados
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Buscar cliente..."
                      value={buscaCliente}
                      onChange={(e) => setBuscaCliente(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                  <Select value={filtroSegmento} onValueChange={setFiltroSegmento}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Segmento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="frequente">Frequente</SelectItem>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="ocasional">Ocasional</SelectItem>
                      <SelectItem value="novo">Novo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Segmento</TableHead>
                    <TableHead>Compras</TableHead>
                    <TableHead>Total Gasto</TableHead>
                    <TableHead>Ultima Compra</TableHead>
                    <TableHead>Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesFiltrados.slice(0, 50).map((cliente) => {
                    const badge = getSegmentoBadge(cliente.segmento);
                    return (
                      <TableRow key={cliente.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{cliente.nome_completo}</p>
                            <p className="text-sm text-gray-500">{cliente.telefone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={badge.className}>{badge.label}</Badge>
                        </TableCell>
                        <TableCell>{cliente.totalCompras}</TableCell>
                        <TableCell>{formatarMoeda(cliente.totalGasto)}</TableCell>
                        <TableCell>
                          {cliente.ultimaCompra
                            ? format(cliente.ultimaCompra, 'dd/MM/yyyy', { locale: ptBR })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500"
                                style={{ width: `${cliente.score}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-500">{cliente.score}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clientes em Risco */}
        <TabsContent value="em-risco">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                Clientes em Risco de Churn
              </CardTitle>
              <CardDescription>
                Clientes que nao compram ha 60-180 dias e tinham historico de compras
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clientesEmRisco.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <p>Nenhum cliente em risco identificado!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Dias sem Comprar</TableHead>
                      <TableHead>Historico</TableHead>
                      <TableHead>Total Gasto</TableHead>
                      <TableHead>Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientesEmRisco.map((cliente) => (
                      <TableRow key={cliente.id}>
                        <TableCell>
                          <p className="font-medium">{cliente.nome_completo}</p>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{cliente.telefone}</p>
                            <p className="text-gray-500">{cliente.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            {cliente.diasSemCompra} dias
                          </Badge>
                        </TableCell>
                        <TableCell>{cliente.totalCompras} compras</TableCell>
                        <TableCell>{formatarMoeda(cliente.totalGasto)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <MessageSquare className="w-4 h-4 mr-1" />
                              Contatar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
