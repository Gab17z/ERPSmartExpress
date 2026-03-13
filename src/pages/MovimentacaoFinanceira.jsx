import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { format, isWithinInterval, parseISO, startOfMonth, startOfDay, endOfDay } from "date-fns";
import DateRangeFilter from "@/components/DateRangeFilter";

export default function MovimentacaoFinanceira() {
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
    queryFn: () => base44.entities.Venda.list('-created_date', 200),
  });

  const { data: contasPagar = [] } = useQuery({
    queryKey: ['contas-pagar'],
    queryFn: async () => {
      try {
        return await base44.entities.ContaPagar.list('-created_date', 200);
      } catch {
        return [];
      }
    },
  });

  const { data: comissoes = [] } = useQuery({
    queryKey: ['comissoes'],
    queryFn: async () => {
      try {
        return await base44.entities.Comissao.list('-data_pagamento', 200);
      } catch {
        return [];
      }
    },
  });

  const { data: movimentacoesCaixa = [] } = useQuery({
    queryKey: ['movimentacoes-caixa'],
    queryFn: async () => {
      try {
        return await base44.entities.MovimentacaoCaixa.list('-created_date', 500);
      } catch {
        return [];
      }
    },
  });

  // CRÍTICO: Validação de valores
  const entradasVendas = vendas
    .filter(v => v.status === 'finalizada' && filtrarPorData(v.created_date))
    .map(v => {
      const itens = v.itens || [];
      const pagamentos = v.pagamentos || [];
      const formasPagamento = pagamentos.map(p => p.forma_pagamento).filter(Boolean).join(', ') || '-';
      const produtos = itens.map(i => `${i.quantidade}x ${i.produto_nome}`).join(', ') || '-';

      return {
        id: v.id,
        tipo: 'entrada',
        valor: parseFloat(v.valor_total) || 0,
        descricao: `Venda ${v.codigo_venda}`,
        categoria: 'venda',
        data: v.created_date,
        cliente: v.cliente_nome || 'Não identificado',
        vendedor: v.vendedor_nome || '-',
        formaPagamento: formasPagamento,
        produtos: produtos,
        codigoVenda: v.codigo_venda
      };
    });

  // CRÍTICO: Incluir Suprimentos de Caixa como Entradas (Dinheiro injetado no Caixa que não veio de Venda)
  const entradasSuprimentos = movimentacoesCaixa
    .filter(m => m.tipo === 'suprimento' && filtrarPorData(m.data_hora || m.created_date))
    .map(m => ({
      id: 'sup-' + m.id,
      tipo: 'entrada',
      valor: parseFloat(m.valor) || 0,
      descricao: m.descricao || 'Suprimento de Caixa',
      categoria: 'suprimento',
      data: m.data_hora || m.created_date,
      cliente: '-',
      vendedor: m.usuario_nome || m.usuario || '-',
      formaPagamento: 'dinheiro',
      produtos: '-'
    }));

  const entradas = [...entradasVendas, ...entradasSuprimentos];

  // CRÍTICO: Validação de valores e datas - Contas a Pagar
  const saidasContasPagar = contasPagar
    .filter(c => c.situacao === 'pago' && c.data_pagamento && filtrarPorData(c.data_pagamento))
    .map(c => ({
      id: 'cp-' + c.id,
      tipo: 'saida',
      valor: parseFloat(c.valor_total) || 0,
      descricao: c.descricao,
      categoria: c.categoria || 'despesa',
      data: c.data_pagamento,
      cliente: c.fornecedor_nome || '-',
      vendedor: '-',
      formaPagamento: '-',
      produtos: '-'
    }));

  // CRÍTICO: Incluir comissões pagas como saídas no financeiro
  const saidasComissoes = comissoes
    .filter(c => c.status === 'pago' && c.data_pagamento && filtrarPorData(c.data_pagamento))
    .map(c => ({
      id: 'com-' + c.id,
      tipo: 'saida',
      valor: parseFloat(c.valor_comissao) || 0,
      descricao: `Comissão - ${c.vendedor_nome}`,
      categoria: 'comissao',
      data: c.data_pagamento,
      cliente: '-',
      vendedor: c.vendedor_nome || '-',
      formaPagamento: '-',
      produtos: '-'
    }));

  // CRÍTICO: Incluir Sangrias de Caixa como Saídas (Dinheiro transferido para fora ou usado como despesa)
  const saidasSangrias = movimentacoesCaixa
    .filter(m => m.tipo === 'sangria' && filtrarPorData(m.data_hora || m.created_date))
    .map(m => ({
      id: 'san-' + m.id,
      tipo: 'saida',
      valor: parseFloat(m.valor) || 0,
      descricao: m.descricao || 'Sangria de Caixa',
      categoria: 'sangria',
      data: m.data_hora || m.created_date,
      cliente: '-',
      vendedor: m.usuario_nome || m.usuario || '-',
      formaPagamento: 'dinheiro',
      produtos: '-'
    }));

  const saidas = [...saidasContasPagar, ...saidasComissoes, ...saidasSangrias];

  const movimentacoes = [...entradas, ...saidas].sort((a, b) => new Date(b.data) - new Date(a.data));

  const totalEntradas = movimentacoes.filter(m => m.tipo === 'entrada').reduce((sum, m) => sum + m.valor, 0);
  const totalSaidas = movimentacoes.filter(m => m.tipo === 'saida').reduce((sum, m) => sum + m.valor, 0);
  const saldo = totalEntradas - totalSaidas;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Movimentação Financeira</h1>
          <p className="text-slate-500">Entradas e saídas financeiras</p>
        </div>
      </div>

      <DateRangeFilter onFilterChange={setFiltro} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Entradas</p>
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
                <p className="text-sm text-slate-500">Total Saídas</p>
                <p className="text-2xl font-bold text-red-600">R$ {totalSaidas.toFixed(2)}</p>
              </div>
              <ArrowDownCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-slate-500">Saldo</p>
              <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                R$ {saldo.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Movimentações</CardTitle>
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
                    <TableCell className="whitespace-nowrap">{format(new Date(mov.data), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>
                      {mov.tipo === 'entrada' ? (
                        <span className="flex items-center gap-2 text-green-600">
                          <ArrowUpCircle className="w-4 h-4" />
                          Entrada
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 text-red-600">
                          <ArrowDownCircle className="w-4 h-4" />
                          Saída
                        </span>
                      )}
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