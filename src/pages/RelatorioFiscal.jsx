import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useLoja } from "@/contexts/LojaContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, TrendingUp, DollarSign } from "lucide-react";
import { format, isWithinInterval, parseISO, startOfMonth } from "date-fns";
import DateRangeFilter from "@/components/DateRangeFilter";

export default function RelatorioFiscal() {
  const { lojaFiltroId } = useLoja();
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
    queryKey: ['vendas', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.Venda.filter({ loja_id: lojaFiltroId })
      : lojaFiltroId ? base44.entities.Venda.filter({ loja_id: lojaFiltroId }, { order: '-data_venda' }) : base44.entities.Venda.list('-data_venda'),
  });

  const vendasFinalizadas = vendas.filter(v => v.status === 'finalizada' && filtrarPorData(v.created_date));
  const totalNotas = vendasFinalizadas.length;
  const valorTotal = vendasFinalizadas.reduce((sum, v) => sum + (parseFloat(v.valor_total) || 0), 0);

  // Itens mais vendidos
  const itensMaisVendidos = {};
  vendasFinalizadas.forEach(venda => {
    venda.itens?.forEach(item => {
      if (!itensMaisVendidos[item.produto_nome]) {
        itensMaisVendidos[item.produto_nome] = {
          nome: item.produto_nome,
          quantidade: 0,
          valor: 0
        };
      }
      itensMaisVendidos[item.produto_nome].quantidade += item.quantidade;
      itensMaisVendidos[item.produto_nome].valor += item.subtotal;
    });
  });

  const topItens = Object.values(itensMaisVendidos)
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 10);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatório Fiscal</h1>
        <p className="text-slate-500">Notas emitidas, itens vendidos e tributos</p>
      </div>

      <DateRangeFilter onFilterChange={setFiltro} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total de Notas</p>
                <p className="text-2xl font-bold text-blue-600">{totalNotas}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Valor Total</p>
                <p className="text-2xl font-bold text-green-600">R$ {valorTotal.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Ticket Médio</p>
                <p className="text-2xl font-bold text-purple-600">
                  R$ {totalNotas > 0 ? (valorTotal / totalNotas).toFixed(2) : '0.00'}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top 10 Itens Mais Vendidos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topItens.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{item.nome}</TableCell>
                  <TableCell>{item.quantidade} un</TableCell>
                  <TableCell className="text-right font-semibold">R$ {item.valor.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notas Emitidas (Últimas 50)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendasFinalizadas.slice(0, 50).map((venda) => (
                <TableRow key={venda.id}>
                  <TableCell>{new Date(venda.data_venda).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="font-mono">{venda.codigo_venda}</TableCell>
                  <TableCell>{venda.cliente_nome || 'Cliente Avulso'}</TableCell>
                  <TableCell className="text-right font-semibold">R$ {(parseFloat(venda.valor_total) || 0).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}