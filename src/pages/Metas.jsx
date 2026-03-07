import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Users, DollarSign, Target, Award } from "lucide-react";
import { format, isWithinInterval, parseISO, startOfMonth } from "date-fns";
import DateRangeFilter from "@/components/DateRangeFilter";

export default function Metas() {
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

  const { data: os = [] } = useQuery({
    queryKey: ['os'],
    queryFn: () => base44.entities.OrdemServico.list(),
    refetchInterval: 30000
  });

  const { data: usuariosSistema = [] } = useQuery({
    queryKey: ['usuarios-sistema'],
    queryFn: () => base44.entities.UsuarioSistema.list(),
  });

  const vendasPeriodo = vendas.filter(v => v.status === 'finalizada' && filtrarPorData(v.data_venda || v.created_date));
  const osPeriodo = os.filter(o => filtrarPorData(o.created_date));

  // CRÍTICO: Performance com validações
  const performancePorUsuario = usuariosSistema.map(usuario => {
    const vendasUsuario = vendasPeriodo.filter(v => v.vendedor_id === usuario.user_id || v.vendedor_nome === usuario.user_nome);
    const osUsuario = osPeriodo.filter(o => o.tecnico_id === usuario.user_id || o.atendente_abertura === usuario.user_nome);

    const totalVendido = vendasUsuario.reduce((sum, v) => sum + (parseFloat(v.valor_total) || 0), 0);
    const quantidadeVendas = vendasUsuario.length;
    const ticketMedio = quantidadeVendas > 0 ? totalVendido / quantidadeVendas : 0;
    const quantidadeOS = osUsuario.length;

    const meta = 10000;
    const percentualMeta = meta > 0 ? (totalVendido / meta) * 100 : 0;

    return {
      usuario_nome: usuario.user_nome,
      cargo: usuario.cargo_nome,
      total_vendido: totalVendido,
      quantidade_vendas: quantidadeVendas,
      ticket_medio: ticketMedio,
      quantidade_os: quantidadeOS,
      meta: meta,
      percentual_meta: percentualMeta,
      nivel_hierarquia: usuario.nivel_hierarquia
    };
  }).sort((a, b) => b.total_vendido - a.total_vendido);

  const totalGeral = vendasPeriodo.reduce((sum, v) => sum + v.valor_total, 0);
  const totalOS = osPeriodo.length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Target className="w-7 h-7 text-blue-600" />
          Metas e Performance por Usuário
        </h1>
        <p className="text-slate-500">Acompanhe o desempenho individual da equipe</p>
      </div>

      <DateRangeFilter onFilterChange={setFiltro} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Vendido</p>
                <p className="text-2xl font-bold text-green-600">R$ {totalGeral.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Vendas</p>
                <p className="text-2xl font-bold text-blue-600">{vendasPeriodo.length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total OS</p>
                <p className="text-2xl font-bold text-purple-600">{totalOS}</p>
              </div>
              <Target className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Vendedores Ativos</p>
                <p className="text-2xl font-bold text-orange-600">{usuariosSistema.length}</p>
              </div>
              <Users className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ranking de Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Posição</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead className="text-right">Vendas</TableHead>
                <TableHead className="text-right">Total Vendido</TableHead>
                <TableHead className="text-right">Ticket Médio</TableHead>
                <TableHead className="text-right">OS Criadas</TableHead>
                <TableHead>Meta (R$ 10.000)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {performancePorUsuario.map((perf, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    {idx === 0 && <Award className="w-5 h-5 text-yellow-500 inline mr-2" />}
                    #{idx + 1}
                  </TableCell>
                  <TableCell className="font-semibold">{perf.usuario_nome}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{perf.cargo || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{perf.quantidade_vendas}</TableCell>
                  <TableCell className="text-right font-bold text-green-600">
                    R$ {perf.total_vendido.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    R$ {perf.ticket_medio.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">{perf.quantidade_os}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Progress value={Math.min(100, perf.percentual_meta)} className="h-2" />
                      <p className="text-xs text-slate-600">
                        {perf.percentual_meta.toFixed(0)}%
                        {perf.percentual_meta >= 100 && <span className="text-green-600 font-bold ml-2">✓ META ATINGIDA!</span>}
                      </p>
                    </div>
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