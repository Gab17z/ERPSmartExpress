import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  const { data: vendas = [] } = useQuery({
    queryKey: ['vendas'],
    queryFn: () => base44.entities.Venda.list(),
  });

  const { data: os = [] } = useQuery({
    queryKey: ['ordens-servico'],
    queryFn: () => base44.entities.OrdemServico.list(),
  });

  const comissaoVendedores = vendas
    .filter(v => v.status === 'finalizada' && filtrarPorData(v.data_venda || v.created_date))
    .reduce((acc, venda) => {
      const vendedor = venda.vendedor_nome || "Sem vendedor";
      if (!acc[vendedor]) acc[vendedor] = { vendas: 0, valor: 0, comissao: 0 };
      
      acc[vendedor].vendas++;
      acc[vendedor].valor += venda.valor_total;
      acc[vendedor].comissao += venda.valor_total * 0.03; // 3% comissão
      
      return acc;
    }, {});

  const comissaoTecnicos = os
    .filter(o => o.status === 'entregue' && filtrarPorData(o.data_entrada || o.created_date))
    .reduce((acc, ordem) => {
      const tecnico = ordem.tecnico_responsavel || "Sem técnico";
      if (!acc[tecnico]) acc[tecnico] = { os: 0, valor: 0, comissao: 0 };
      
      acc[tecnico].os++;
      acc[tecnico].valor += ordem.orcamento?.valor_total || 0;
      acc[tecnico].comissao += (ordem.orcamento?.valor_total || 0) * 0.1; // 10% comissão
      
      return acc;
    }, {});

  const dadosVendedores = Object.entries(comissaoVendedores).map(([nome, dados]) => ({ nome, ...dados }));
  const dadosTecnicos = Object.entries(comissaoTecnicos).map(([nome, dados]) => ({ nome, ...dados }));

  const totalComissaoVendedores = dadosVendedores.reduce((sum, v) => sum + v.comissao, 0);
  const totalComissaoTecnicos = dadosTecnicos.reduce((sum, t) => sum + t.comissao, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatório de Comissões</h1>
        <p className="text-slate-500">Comissões de vendedores e técnicos</p>
      </div>

      <DateRangeFilter onFilterChange={setFiltro} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">Total Comissão Vendedores</p>
            <p className="text-2xl font-bold text-blue-600">R$ {totalComissaoVendedores.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">Total Comissão Técnicos</p>
            <p className="text-2xl font-bold text-green-600">R$ {totalComissaoTecnicos.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="vendedores">
        <TabsList>
          <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
          <TabsTrigger value="tecnicos">Técnicos</TabsTrigger>
        </TabsList>

        <TabsContent value="vendedores">
          <Card>
            <CardHeader>
              <CardTitle>Comissões de Vendedores (3% sobre vendas)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Vendas</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Comissão (3%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosVendedores.sort((a, b) => b.comissao - a.comissao).map((vendedor, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{vendedor.nome}</TableCell>
                      <TableCell>{vendedor.vendas}</TableCell>
                      <TableCell>R$ {vendedor.valor.toFixed(2)}</TableCell>
                      <TableCell className="font-bold text-blue-600">R$ {vendedor.comissao.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tecnicos">
          <Card>
            <CardHeader>
              <CardTitle>Comissões de Técnicos (10% sobre OS)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Técnico</TableHead>
                    <TableHead>OS Concluídas</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Comissão (10%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosTecnicos.sort((a, b) => b.comissao - a.comissao).map((tecnico, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{tecnico.nome}</TableCell>
                      <TableCell>{tecnico.os}</TableCell>
                      <TableCell>R$ {tecnico.valor.toFixed(2)}</TableCell>
                      <TableCell className="font-bold text-green-600">R$ {tecnico.comissao.toFixed(2)}</TableCell>
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