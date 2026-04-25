import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useLoja } from "@/contexts/LojaContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, isWithinInterval, parseISO, startOfMonth } from "date-fns";
import DateRangeFilter from "@/components/DateRangeFilter";

export default function DRE() {
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
      : base44.entities.Venda.list(),
    refetchInterval: 30000
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.Produto.filter({ loja_id: lojaFiltroId })
      : base44.entities.Produto.list(),
    refetchInterval: 30000
  });

  const { data: contasPagar = [] } = useQuery({
    queryKey: ['contas-pagar', lojaFiltroId],
    queryFn: async () => {
      try {
        return lojaFiltroId
          ? await base44.entities.ContaPagar.filter({ loja_id: lojaFiltroId })
          : await base44.entities.ContaPagar.list();
      } catch {
        return [];
      }
    },
    refetchInterval: 30000
  });

  const { data: contasReceber = [] } = useQuery({
    queryKey: ['contas-receber', lojaFiltroId],
    queryFn: async () => {
      try {
        return lojaFiltroId
          ? await base44.entities.ContaReceber.filter({ loja_id: lojaFiltroId })
          : await base44.entities.ContaReceber.list();
      } catch {
        return [];
      }
    },
    refetchInterval: 30000
  });

  const { data: devolucoes = [] } = useQuery({
    queryKey: ['devolucoes', lojaFiltroId],
    queryFn: async () => {
      try {
        return lojaFiltroId
          ? await base44.entities.Devolucao.filter({ loja_id: lojaFiltroId })
          : await base44.entities.Devolucao.list();
      } catch {
        return [];
      }
    },
    refetchInterval: 30000
  });

  // Mapa de devoluções aprovadas por venda
  const devolucoesPorVenda = React.useMemo(() => {
    const mapa = {};
    devolucoes.filter(d => d.status === 'aprovada').forEach(d => {
      if (!mapa[d.venda_id]) mapa[d.venda_id] = 0;
      mapa[d.venda_id] += parseFloat(d.valor_total) || 0;
    });
    return mapa;
  }, [devolucoes]);

  const { data: comissoes = [] } = useQuery({
    queryKey: ['comissoes', lojaFiltroId],
    queryFn: async () => {
      try {
        return lojaFiltroId
          ? await base44.entities.Comissao.filter({ loja_id: lojaFiltroId })
          : await base44.entities.Comissao.list();
      } catch {
        return [];
      }
    },
    refetchInterval: 30000
  });

  // CRÍTICO: DRE com validações financeiras
  const vendasFinalizadas = vendas.filter(v => v.status === 'finalizada' && filtrarPorData(v.data_venda || v.created_date));
  
  // Receita de vendas com dedução de devoluções aprovadas
  const receitaVendas = vendasFinalizadas.reduce((sum, v) =>
    sum + Math.max(0, (parseFloat(v.valor_total) || 0) - (devolucoesPorVenda[v.id] || 0)), 0);

  const receitasRecebidas = contasReceber.filter(c => c.status === 'pago' && c.data_pagamento && filtrarPorData(c.data_pagamento)).reduce((sum, c) => sum + (parseFloat(c.valor_pago) || 0), 0);

  const receitaTotal = receitaVendas + receitasRecebidas;

  // Custo: priorizar custo congelado no item; fallback para cadastro atual
  const custoMercadorias = vendasFinalizadas.reduce((sum, venda) => {
    const valorOriginal = parseFloat(venda.valor_total) || 0;
    const valorDevolvido = devolucoesPorVenda[venda.id] || 0;
    const percentualRetido = valorOriginal > 0 ? Math.max(0, (valorOriginal - valorDevolvido) / valorOriginal) : 1;
    const custoVenda = (venda.itens?.reduce((itemSum, item) => {
      const custoCongelado = item.preco_custo ?? item.custo_unitario;
      const custoProduto = custoCongelado != null ? custoCongelado : (produtos.find(p => p.id === item.produto_id)?.preco_custo ?? 0);
      return itemSum + ((parseFloat(custoProduto) || 0) * (parseInt(item.quantidade) || 0));
    }, 0) || 0) * percentualRetido;
    return sum + custoVenda;
  }, 0);

  const lucroBruto = receitaTotal - custoMercadorias;
  const margemBruta = receitaTotal > 0 ? (lucroBruto / receitaTotal) * 100 : 0;

  // CRÍTICO: Despesas = Contas Pagas + Comissões Pagas
  const despesasContasPagar = contasPagar.filter(c => c.status === 'pago' && c.data_pagamento && filtrarPorData(c.data_pagamento)).reduce((sum, c) => sum + (parseFloat(c.valor) || 0), 0);
  
  const despesasComissoes = comissoes.filter(c => c.status === 'pago' && c.data_pagamento && filtrarPorData(c.data_pagamento)).reduce((sum, c) => sum + (parseFloat(c.valor_comissao) || 0), 0);
  
  const despesasOperacionais = despesasContasPagar + despesasComissoes;
  
  const lucroLiquido = lucroBruto - despesasOperacionais;
  const margemLiquida = receitaTotal > 0 ? (lucroLiquido / receitaTotal) * 100 : 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">DRE - Demonstração do Resultado</h1>
        <p className="text-slate-500">Análise simplificada de resultados</p>
      </div>

      <DateRangeFilter onFilterChange={setFiltro} />

      <Card>
        <CardHeader>
          <CardTitle>Demonstrativo Financeiro</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-green-50">
                <TableCell className="font-bold">Receita Total</TableCell>
                <TableCell className="text-right font-bold text-green-600">R$ {receitaTotal.toFixed(2)}</TableCell>
                <TableCell className="text-right">100%</TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell className="pl-12 text-xs text-slate-600">Vendas</TableCell>
                <TableCell className="text-right text-green-700">R$ {receitaVendas.toFixed(2)}</TableCell>
                <TableCell className="text-right text-xs">{receitaTotal > 0 ? ((receitaVendas/receitaTotal)*100).toFixed(1) : 0}%</TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell className="pl-12 text-xs text-slate-600">Contas Recebidas</TableCell>
                <TableCell className="text-right text-green-700">R$ {receitasRecebidas.toFixed(2)}</TableCell>
                <TableCell className="text-right text-xs">{receitaTotal > 0 ? ((receitasRecebidas/receitaTotal)*100).toFixed(1) : 0}%</TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell className="pl-8">(-) Custo das Mercadorias</TableCell>
                <TableCell className="text-right text-red-600">R$ {custoMercadorias.toFixed(2)}</TableCell>
                <TableCell className="text-right">{receitaTotal > 0 ? ((custoMercadorias/receitaTotal)*100).toFixed(1) : 0}%</TableCell>
              </TableRow>

              <TableRow className="bg-blue-50">
                <TableCell className="font-bold">(=) Lucro Bruto</TableCell>
                <TableCell className="text-right font-bold text-blue-600">R$ {lucroBruto.toFixed(2)}</TableCell>
                <TableCell className="text-right font-bold">{margemBruta.toFixed(1)}%</TableCell>
              </TableRow>

              <TableRow>
                <TableCell className="pl-8">(-) Despesas Operacionais</TableCell>
                <TableCell className="text-right text-red-600">R$ {despesasOperacionais.toFixed(2)}</TableCell>
                <TableCell className="text-right">{receitaTotal > 0 ? ((despesasOperacionais/receitaTotal)*100).toFixed(1) : 0}%</TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell className="pl-12 text-xs text-slate-600">Contas Pagas</TableCell>
                <TableCell className="text-right text-red-700">R$ {despesasContasPagar.toFixed(2)}</TableCell>
                <TableCell className="text-right text-xs">{receitaTotal > 0 ? ((despesasContasPagar/receitaTotal)*100).toFixed(1) : 0}%</TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell className="pl-12 text-xs text-slate-600">Comissões Pagas</TableCell>
                <TableCell className="text-right text-red-700">R$ {despesasComissoes.toFixed(2)}</TableCell>
                <TableCell className="text-right text-xs">{receitaTotal > 0 ? ((despesasComissoes/receitaTotal)*100).toFixed(1) : 0}%</TableCell>
              </TableRow>

              <TableRow className="bg-slate-100 border-t-2">
                <TableCell className="font-bold text-lg">(=) Lucro Líquido</TableCell>
                <TableCell className={`text-right font-bold text-lg ${lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  R$ {lucroLiquido.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-bold">{margemLiquida.toFixed(1)}%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500 mb-2">Receita Total</p>
            <p className="text-2xl font-bold text-green-600">R$ {receitaTotal.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500 mb-2">Lucro Bruto</p>
            <p className="text-2xl font-bold text-blue-600">R$ {lucroBruto.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500 mb-2">Despesas</p>
            <p className="text-2xl font-bold text-red-600">R$ {despesasOperacionais.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500 mb-2">Lucro Líquido</p>
            <p className={`text-2xl font-bold ${lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              R$ {lucroLiquido.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}