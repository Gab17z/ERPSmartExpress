import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, isWithinInterval, parseISO, startOfMonth, startOfDay, endOfDay } from "date-fns";
import DateRangeFilter from "@/components/DateRangeFilter";

export default function RelatorioComissoes() {
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

  // Usar dados REAIS da entidade Comissao (não taxas hardcoded)
  const comissoesPeriodo = comissoes.filter(c =>
    filtrarPorData(c.data_pagamento || c.created_date)
  );

  // Agrupar por vendedor
  const comissaoVendedores = comissoesPeriodo.reduce((acc, c) => {
    const vendedor = c.vendedor_nome || "Sem vendedor";
    if (!acc[vendedor]) acc[vendedor] = { vendas: 0, valor: 0, comissao: 0, pendente: 0 };
    acc[vendedor].vendas++;
    acc[vendedor].valor += parseFloat(c.valor_venda) || 0;
    acc[vendedor].comissao += c.status === 'pago' ? (parseFloat(c.valor_comissao) || 0) : 0;
    acc[vendedor].pendente += c.status !== 'pago' && c.status !== 'cancelada' ? (parseFloat(c.valor_comissao) || 0) : 0;
    return acc;
  }, {});

  const dadosVendedores = Object.entries(comissaoVendedores).map(([nome, dados]) => ({ nome, ...dados }))
    .sort((a, b) => (b.comissao + b.pendente) - (a.comissao + a.pendente));

  const totalComissaoPaga = dadosVendedores.reduce((sum, v) => sum + v.comissao, 0);
  const totalComissaoPendente = dadosVendedores.reduce((sum, v) => sum + v.pendente, 0);
  const totalComissaoVendedores = totalComissaoPaga + totalComissaoPendente;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatório de Comissões</h1>
        <p className="text-slate-500">Comissões de vendedores e técnicos</p>
      </div>

      <DateRangeFilter onFilterChange={setFiltro} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">Total Pago</p>
            <p className="text-2xl font-bold text-green-600">R$ {totalComissaoPaga.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">Total Pendente</p>
            <p className="text-2xl font-bold text-orange-500">R$ {totalComissaoPendente.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">Total Geral</p>
            <p className="text-2xl font-bold text-blue-600">R$ {totalComissaoVendedores.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comissões por Vendedor</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendedor</TableHead>
                <TableHead>Registros</TableHead>
                <TableHead>Valor Vendas</TableHead>
                <TableHead>Comissão Paga</TableHead>
                <TableHead>Comissão Pendente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dadosVendedores.map((vendedor, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{vendedor.nome}</TableCell>
                  <TableCell>{vendedor.vendas}</TableCell>
                  <TableCell>R$ {vendedor.valor.toFixed(2)}</TableCell>
                  <TableCell className="font-bold text-green-600">R$ {vendedor.comissao.toFixed(2)}</TableCell>
                  <TableCell className="font-bold text-orange-500">R$ {vendedor.pendente.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              {dadosVendedores.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500">Nenhuma comissão no período</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}