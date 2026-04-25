import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useLoja } from "@/contexts/LojaContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpCircle, ArrowDownCircle, DollarSign } from "lucide-react";
import { format, isWithinInterval, parseISO, startOfMonth, startOfDay, endOfDay } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import DateRangeFilter from "@/components/DateRangeFilter";

export default function FluxoCaixa() {
  const { lojaFiltroId } = useLoja();
  const hoje = new Date();
  const [filtro, setFiltro] = useState({
    dataInicio: format(startOfMonth(hoje), 'yyyy-MM-dd'),
    dataFim: format(hoje, 'yyyy-MM-dd')
  });

  // CORREÇÃO: Remover limites para não cortar dados importantes
  // Usar filtro de data no cliente para performance
  const { data: vendas = [], isLoading: loadingVendas } = useQuery({
    queryKey: ['vendas-fluxo', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.Venda.filter({ loja_id: lojaFiltroId }, { order: '-created_date' })
      : base44.entities.Venda.list('-created_date'),
  });

  const { data: contasPagar = [], isLoading: loadingContas } = useQuery({
    queryKey: ['contas-pagar-fluxo', lojaFiltroId],
    queryFn: async () => {
      try {
        return lojaFiltroId
          ? await base44.entities.ContaPagar.filter({ loja_id: lojaFiltroId }, { order: '-created_date' })
          : await base44.entities.ContaPagar.list('-created_date');
      } catch {
        return [];
      }
    },
  });

  const { data: comissoes = [], isLoading: loadingComissoes } = useQuery({
    queryKey: ['comissoes-fluxo', lojaFiltroId],
    queryFn: async () => {
      try {
        return lojaFiltroId
          ? await base44.entities.Comissao.filter({ loja_id: lojaFiltroId }, { order: '-data_pagamento' })
          : await base44.entities.Comissao.list('-data_pagamento');
      } catch {
        return [];
      }
    },
  });

  const isLoading = loadingVendas || loadingContas || loadingComissoes;

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

  // CORREÇÃO: Função auxiliar para parsear valores monetários com segurança
  const parseValor = (valor) => {
    if (valor === null || valor === undefined) return 0;
    const parsed = parseFloat(valor);
    return isNaN(parsed) ? 0 : parsed;
  };

  // CRÍTICO: Validação de valores - Entradas (Vendas)
  const entradas = vendas
    .filter(v => v.status === 'finalizada' && v.created_date && filtrarPorData(v.created_date))
    .map(v => {
      const itens = v.itens || [];
      const pagamentos = v.pagamentos || [];
      const formasPagamento = pagamentos.map(p => p.forma_pagamento).filter(Boolean).join(', ') || '-';
      const produtos = itens.map(i => `${i.quantidade}x ${i.produto_nome}`).join(', ') || '-';

      return {
        id: v.id,
        data: v.created_date,
        tipo: 'entrada',
        descricao: `Venda ${v.codigo_venda || 'S/N'}`,
        valor: parseValor(v.valor_total),
        cliente: v.cliente_nome || 'Não identificado',
        vendedor: v.vendedor_nome || '-',
        formaPagamento: formasPagamento,
        produtos: produtos,
        categoria: 'venda'
      };
    });

  // CRÍTICO: Validação de valores e datas - Contas a Pagar
  const saidasContasPagar = contasPagar
    .filter(c => c.status === 'pago' && c.data_pagamento && filtrarPorData(c.data_pagamento))
    .map(c => ({
      id: 'cp-' + c.id,
      data: c.data_pagamento,
      tipo: 'saida',
      descricao: c.descricao || 'Pagamento',
      valor: parseValor(c.valor),
      cliente: c.fornecedor_nome || '-',
      vendedor: '-',
      formaPagamento: '-',
      produtos: '-',
      categoria: c.categoria || 'despesa'
    }));

  // CRÍTICO: Incluir comissões pagas como saídas
  const saidasComissoes = comissoes
    .filter(c => c.status === 'pago' && c.data_pagamento && filtrarPorData(c.data_pagamento))
    .map(c => ({
      id: 'com-' + c.id,
      data: c.data_pagamento,
      tipo: 'saida',
      descricao: `Comissão - ${c.vendedor_nome || 'Vendedor'}`,
      valor: parseValor(c.valor_comissao),
      cliente: '-',
      vendedor: c.vendedor_nome || '-',
      formaPagamento: '-',
      produtos: '-',
      categoria: 'comissao'
    }));

  const saidas = [...saidasContasPagar, ...saidasComissoes];

  const movimentacoes = [...entradas, ...saidas].sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, 50);

  // CORREÇÃO: Usar matemática de centavos para evitar erros de precisão
  const totalEntradasCentavos = entradas.reduce((sum, e) => sum + Math.round(e.valor * 100), 0);
  const totalSaidasCentavos = saidas.reduce((sum, s) => sum + Math.round(s.valor * 100), 0);
  const saldoCentavos = totalEntradasCentavos - totalSaidasCentavos;

  const totalEntradas = totalEntradasCentavos / 100;
  const totalSaidas = totalSaidasCentavos / 100;
  const saldo = saldoCentavos / 100;

  const dadosGrafico = movimentacoes.slice(0, 30).reverse().map((mov, idx) => ({
    data: format(new Date(mov.data), 'dd/MM'),
    valor: mov.tipo === 'entrada' ? mov.valor : -mov.valor
  }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fluxo de Caixa</h1>
        <p className="text-slate-500">Entradas e saídas financeiras</p>
      </div>

      <DateRangeFilter onFilterChange={setFiltro} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Entradas</p>
                <p className="text-2xl font-bold text-green-600">R$ {totalEntradas.toFixed(2)}</p>
              </div>
              <ArrowUpCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Saídas</p>
                <p className="text-2xl font-bold text-red-600">R$ {totalSaidas.toFixed(2)}</p>
              </div>
              <ArrowDownCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Saldo</p>
                <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>R$ {saldo.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fluxo de Caixa (Últimos 30 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="data" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="valor" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimentações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Cliente/Fornecedor</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Produtos</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimentacoes.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell className="whitespace-nowrap">{format(new Date(mov.data), 'dd/MM/yyyy HH:mm')}</TableCell>
                    <TableCell>
                      <Badge variant={mov.tipo === 'entrada' ? 'default' : 'destructive'}>
                        {mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{mov.descricao}</TableCell>
                    <TableCell>{mov.cliente}</TableCell>
                    <TableCell>{mov.vendedor}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={mov.produtos}>{mov.produtos}</TableCell>
                    <TableCell className="capitalize">{mov.formaPagamento}</TableCell>
                    <TableCell className="capitalize">{mov.categoria}</TableCell>
                    <TableCell className={`text-right font-semibold whitespace-nowrap ${mov.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                      {mov.tipo === 'entrada' ? '+' : '-'} R$ {mov.valor.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}