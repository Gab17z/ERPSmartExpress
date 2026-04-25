import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useLoja } from "@/contexts/LojaContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Smartphone, TrendingUp, DollarSign } from "lucide-react";
import { format, isWithinInterval, parseISO, startOfMonth, startOfDay, endOfDay } from "date-fns";
import DateRangeFilter from "@/components/DateRangeFilter";

export default function RelatorioSeminovos() {
  const { lojaFiltroId } = useLoja();
  const hoje = new Date();
  const [filtro, setFiltro] = useState({
    dataInicio: format(startOfMonth(hoje), 'yyyy-MM-dd'),
    dataFim: format(hoje, 'yyyy-MM-dd')
  });

  const filtrarPorData = (data) => {
    try {
      return isWithinInterval(parseISO(data), {
        start: startOfDay(parseISO(filtro.dataInicio)),
        end: endOfDay(parseISO(filtro.dataFim))
      });
    } catch {
      return false;
    }
  };

  const { data: avaliacoes = [] } = useQuery({
    queryKey: ['avaliacoes', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.AvaliacaoSeminovo.filter({ loja_id: lojaFiltroId })
      : lojaFiltroId ? base44.entities.AvaliacaoSeminovo.filter({ loja_id: lojaFiltroId }, { order: '-data_avaliacao' }) : base44.entities.AvaliacaoSeminovo.list('-data_avaliacao'),
  });

  const avaliacoesFiltradas = avaliacoes.filter(a => filtrarPorData(a.data_avaliacao || a.created_date));
  const entradas = avaliacoesFiltradas.filter(a => a.status === 'aceita');
  // CRÍTICO: Valores de seminovos com validação
  const totalEntradas = entradas.length;
  const valorTotalOferecido = entradas.reduce((sum, a) => sum + (parseFloat(a.valor_oferecido) || 0), 0);
  const valorMedioOferta = totalEntradas > 0 ? valorTotalOferecido / totalEntradas : 0;
  const margemMedia = entradas.reduce((sum, a) => {
    const valorMerc = parseFloat(a.valor_mercado) || 0;
    const valorOfer = parseFloat(a.valor_oferecido) || 0;
    const margem = valorMerc > 0 ? ((valorMerc - valorOfer) / valorMerc) * 100 : 0;
    return sum + margem;
  }, 0) / (totalEntradas || 1);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatório de Seminovos</h1>
        <p className="text-slate-500">Análise de entradas, saídas e margem</p>
      </div>

      <DateRangeFilter onFilterChange={setFiltro} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total de Entradas</p>
                <p className="text-2xl font-bold text-blue-600">{totalEntradas}</p>
              </div>
              <Smartphone className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Valor Médio Oferta</p>
                <p className="text-2xl font-bold text-green-600">R$ {valorMedioOferta.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Margem Média</p>
                <p className="text-2xl font-bold text-purple-600">{margemMedia.toFixed(1)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seminovos Aceitos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Aparelho</TableHead>
                <TableHead>Valor Mercado</TableHead>
                <TableHead>Valor Oferta</TableHead>
                <TableHead>Margem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entradas.map((aval) => {
                const valorMercado = parseFloat(aval.valor_mercado) || 0;
                const valorOferecido = parseFloat(aval.valor_oferecido) || 0;
                const margem = valorMercado > 0 ? ((valorMercado - valorOferecido) / valorMercado) * 100 : 0;
                return (
                  <TableRow key={aval.id}>
                    <TableCell>{new Date(aval.data_avaliacao).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{aval.cliente_nome}</TableCell>
                    <TableCell>{aval.aparelho?.marca} {aval.aparelho?.modelo}</TableCell>
                    <TableCell>R$ {valorMercado.toFixed(2)}</TableCell>
                    <TableCell>R$ {valorOferecido.toFixed(2)}</TableCell>
                    <TableCell className="font-semibold text-green-600">{margem.toFixed(1)}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}