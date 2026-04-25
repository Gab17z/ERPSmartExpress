import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useLoja } from "@/contexts/LojaContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, isWithinInterval, parseISO, startOfMonth, startOfDay, endOfDay } from "date-fns";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { exportToPDF } from "@/utils/pdfExport";
import DateRangeFilter from "@/components/DateRangeFilter";

export default function RelatorioOS() {
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

  const { data: os = [] } = useQuery({
    queryKey: ['ordens-servico', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.OrdemServico.filter({ loja_id: lojaFiltroId })
      : lojaFiltroId ? base44.entities.OrdemServico.filter({ loja_id: lojaFiltroId }) : base44.entities.OrdemServico.list(),
  });

  const osFiltradas = os.filter(o => filtrarPorData(o.data_entrada));

  const osPorTecnico = osFiltradas.reduce((acc, ordem) => {
    const tecnico = ordem.tecnico_responsavel || "Sem técnico";
    if (!acc[tecnico]) acc[tecnico] = { total: 0, concluidas: 0, valor: 0 };
    acc[tecnico].total++;
    if (ordem.status === 'entregue') {
      acc[tecnico].concluidas++;
      acc[tecnico].valor += (parseFloat(ordem.orcamento?.valor_total) || 0);
    }
    return acc;
  }, {});

  const dadosTecnicos = Object.entries(osPorTecnico).map(([nome, dados]) => ({
    nome,
    total: dados.total,
    concluidas: dados.concluidas,
    valor: dados.valor
  }));

  const osAbertas = osFiltradas.filter(o => !['entregue', 'cancelado'].includes(o.status));
  const osAtrasadas = osAbertas.filter(o => o.data_prevista && new Date(o.data_prevista) < new Date());

  const tempoMedio = osFiltradas.filter(o => o.data_entrada && o.data_conclusao).reduce((sum, o) => {
    const dias = Math.floor((new Date(o.data_conclusao) - new Date(o.data_entrada)) / (1000 * 60 * 60 * 24));
    return sum + dias;
  }, 0) / osFiltradas.filter(o => o.data_conclusao).length || 0;

  const exportarPDF = () => {
    try {
      if (dadosTecnicos.length === 0) {
        toast.error('Não há dados para exportar');
        return;
      }

      const headers = ['Técnico', 'Total OS', 'Concluídas', 'Taxa Sucesso', 'Valor Total'];
      const data = dadosTecnicos.map(tec => [
        tec.nome,
        tec.total.toString(),
        tec.concluidas.toString(),
        `${tec.total > 0 ? ((tec.concluidas / tec.total) * 100).toFixed(0) : 0}%`,
        `R$ ${tec.valor.toFixed(2)}`
      ]);

      exportToPDF('Relatório de Ordens de Serviço', headers, data, 'relatorio-os.pdf');
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Relatório de Ordens de Serviço</h1>
          <p className="text-slate-500">Performance e análise de atendimentos</p>
        </div>
        <Button onClick={exportarPDF} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      <DateRangeFilter onFilterChange={setFiltro} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">OS Abertas</p>
            <p className="text-2xl font-bold">{osAbertas.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">OS Atrasadas</p>
            <p className="text-2xl font-bold text-red-600">{osAtrasadas.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">Tempo Médio</p>
            <p className="text-2xl font-bold">{tempoMedio.toFixed(1)} dias</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance por Técnico</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dadosTecnicos}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nome" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#3b82f6" name="Total" />
              <Bar dataKey="concluidas" fill="#10b981" name="Concluídas" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalhamento por Técnico</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Técnico</TableHead>
                <TableHead>Total OS</TableHead>
                <TableHead>Concluídas</TableHead>
                <TableHead>Taxa Sucesso</TableHead>
                <TableHead>Valor Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dadosTecnicos.map((tec, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{tec.nome}</TableCell>
                  <TableCell>{tec.total}</TableCell>
                  <TableCell>{tec.concluidas}</TableCell>
                  <TableCell>
                    <Badge variant={tec.total > 0 && (tec.concluidas/tec.total) > 0.8 ? "default" : "secondary"}>
                      {tec.total > 0 ? ((tec.concluidas/tec.total)*100).toFixed(0) : 0}%
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold text-green-600">R$ {tec.valor.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}