import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Shield, DollarSign, X, RefreshCw, CreditCard, Lock, Unlock, Database, Package, Settings, ShoppingCart } from "lucide-react";
import { format, isWithinInterval, parseISO, startOfMonth, startOfDay, endOfDay } from "date-fns";
import DateRangeFilter from "@/components/DateRangeFilter";

export default function Logs() {
  const hoje = new Date();
  const [filtro, setFiltro] = useState({
    dataInicio: format(startOfMonth(hoje), 'yyyy-MM-dd'),
    dataFim: format(hoje, 'yyyy-MM-dd')
  });

  const filtrarPorData = (data) => {
    try {
      if (!data) return false;
      const dataObj = typeof data === 'string' ? parseISO(data) : new Date(data);
      return isWithinInterval(dataObj, {
        start: startOfDay(parseISO(filtro.dataInicio)),
        end: endOfDay(parseISO(filtro.dataFim))
      });
    } catch {
      return false;
    }
  };

  const { data: logs = [] } = useQuery({
    queryKey: ['logs'],
    queryFn: async () => {
      try {
        return await base44.entities.LogAuditoria.list('-data_hora', 200);
      } catch {
        return [];
      }
    },
  });

  const { data: vendas = [] } = useQuery({
    queryKey: ['vendas'],
    queryFn: () => base44.entities.Venda.list('-created_date', 200),
  });

  const { data: caixas = [] } = useQuery({
    queryKey: ['caixas'],
    queryFn: () => base44.entities.Caixa.list('-created_date', 100),
  });

  const logsFiltrados = logs.filter(log => filtrarPorData(log.data_hora));

  // Auditoria Financeira
  const logsFinanceiros = logsFiltrados.filter(l => 
    ['criar', 'editar', 'excluir'].includes(l.acao) && 
    ['ContaReceber', 'ContaPagar', 'Venda'].includes(l.recurso)
  );

  // Alterações de Valores
  const alteracoesValores = logsFiltrados.filter(l => 
    l.acao === 'editar' && l.recurso === 'Venda' && 
    l.dados_antes?.valor_total !== l.dados_depois?.valor_total
  );

  // Cancelamentos
  const vendasCanceladas = vendas.filter(v => v.status === 'cancelada' && filtrarPorData(v.data_cancelamento));

  // Caixas Abertos/Fechados
  const logsCaixa = caixas.filter(c => filtrarPorData(c.data_abertura));

  const { data: logsDesconto = [] } = useQuery({
    queryKey: ['logs-desconto'],
    queryFn: async () => {
      try {
        return await base44.entities.LogDesconto.list('-data_hora', 200);
      } catch {
        return [];
      }
    },
  });

  const { data: movimentacoesEstoque = [] } = useQuery({
    queryKey: ['movimentacoes-estoque'],
    queryFn: async () => {
      try {
        return await base44.entities.MovimentacaoEstoque.list('-data_movimentacao', 200);
      } catch {
        return [];
      }
    },
  });

  const descontosFiltrados = logsDesconto.filter(log => filtrarPorData(log.data_hora));
  const movimentacoesFiltradas = movimentacoesEstoque.filter(mov => filtrarPorData(mov.data_movimentacao));
  const vendasFiltradas = vendas.filter(v => v.status === 'finalizada' && filtrarPorData(v.data_venda));
  const logsConfiguracao = logsFiltrados.filter(l => l.recurso === 'Configuracao' || l.acao?.includes('config'));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Logs do Sistema</h1>
        <p className="text-slate-500">Auditoria completa de operações</p>
      </div>

      <DateRangeFilter onFilterChange={setFiltro} />

      <Tabs defaultValue="auditoria">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="auditoria">Geral</TabsTrigger>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="estoque">Estoque</TabsTrigger>
          <TabsTrigger value="cancelamentos">Cancel.</TabsTrigger>
          <TabsTrigger value="descontos">Desc.</TabsTrigger>
          <TabsTrigger value="caixa">Caixa</TabsTrigger>
          <TabsTrigger value="config">Config.</TabsTrigger>
        </TabsList>

        <TabsContent value="auditoria">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Auditoria Geral ({logsFiltrados.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Recurso</TableHead>
                    <TableHead>Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsFiltrados.slice(0, 100).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">{format(new Date(log.data_hora), 'dd/MM/yyyy HH:mm')}</TableCell>
                      <TableCell>{log.usuario_nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.acao}</Badge>
                      </TableCell>
                      <TableCell>{log.recurso}</TableCell>
                      <TableCell className="text-sm">{log.descricao}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendas">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-green-600" />
                Log de Vendas ({vendasFiltradas.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Pagamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendasFiltradas.filter(v => v.status === 'finalizada').map((venda) => (
                    <TableRow key={venda.id}>
                      <TableCell className="font-mono text-xs">{venda.codigo_venda}</TableCell>
                      <TableCell className="text-xs">{venda.data_venda ? format(new Date(venda.data_venda), 'dd/MM/yyyy HH:mm') : format(new Date(venda.created_date), 'dd/MM/yyyy HH:mm')}</TableCell>
                      <TableCell className="text-sm">{venda.cliente_nome || 'N/A'}</TableCell>
                      <TableCell className="text-sm">{venda.vendedor_nome}</TableCell>
                      <TableCell className="font-semibold text-green-600">R$ {venda.valor_total?.toFixed(2)}</TableCell>
                      <TableCell className="text-xs">
                        {venda.pagamentos?.map((p, i) => (
                          <Badge key={i} variant="outline" className="mr-1">
                            {p.forma_pagamento}
                          </Badge>
                        ))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="estoque">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Movimentações de Estoque ({movimentacoesEstoque.filter(mov => filtrarPorData(mov.data_movimentacao)).length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Estoque Ant.</TableHead>
                    <TableHead>Estoque Novo</TableHead>
                    <TableHead>Responsável</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimentacoesEstoque.filter(mov => filtrarPorData(mov.data_movimentacao)).map((mov) => (
                    <TableRow key={mov.id}>
                      <TableCell className="text-xs">{format(new Date(mov.data_movimentacao), 'dd/MM/yyyy HH:mm')}</TableCell>
                      <TableCell>
                        <Badge variant={mov.tipo === 'entrada' ? 'default' : mov.tipo === 'saida' ? 'destructive' : 'secondary'}>
                          {mov.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{mov.produto_nome}</TableCell>
                      <TableCell className="font-semibold">{mov.quantidade}</TableCell>
                      <TableCell className="text-slate-600">{mov.estoque_anterior}</TableCell>
                      <TableCell className="font-bold">{mov.estoque_novo}</TableCell>
                      <TableCell className="text-sm">{mov.usuario_responsavel}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-600" />
                Alterações de Configuração ({logsFiltrados.filter(l => l.recurso === 'Configuracao' || l.descricao?.includes('configurações')).length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsFiltrados.filter(l => l.recurso === 'Configuracao' || l.descricao?.includes('configurações') || l.acao?.includes('config')).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">{format(new Date(log.data_hora), 'dd/MM/yyyy HH:mm')}</TableCell>
                      <TableCell>{log.usuario_nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.acao}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{log.descricao}</TableCell>
                    </TableRow>
                  ))}
                  {logsFiltrados.filter(l => l.recurso === 'Configuracao' || l.descricao?.includes('configurações') || l.acao?.includes('config')).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-500 py-8">
                        Nenhuma alteração de configuração registrada neste período
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>



        <TabsContent value="cancelamentos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <X className="w-5 h-5 text-red-600" />
                Vendas Canceladas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código Venda</TableHead>
                    <TableHead>Data Cancelamento</TableHead>
                    <TableHead>Cancelado Por</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendasCanceladas.map((venda) => (
                    <TableRow key={venda.id}>
                      <TableCell className="font-mono">{venda.codigo_venda}</TableCell>
                      <TableCell className="text-xs">{format(new Date(venda.data_cancelamento), 'dd/MM/yyyy HH:mm')}</TableCell>
                      <TableCell>{venda.cancelada_por}</TableCell>
                      <TableCell className="font-semibold text-red-600">R$ {venda.valor_total.toFixed(2)}</TableCell>
                      <TableCell className="text-sm">{venda.motivo_cancelamento}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="descontos">
          <Card>
            <CardHeader>
              <CardTitle>Autorizações de Desconto ({logsDesconto.filter(log => filtrarPorData(log.data_hora)).length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Venda</TableHead>
                    <TableHead>Desconto</TableHead>
                    <TableHead>Autorizado Por</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsDesconto.filter(log => filtrarPorData(log.data_hora)).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">{format(new Date(log.data_hora), 'dd/MM/yyyy HH:mm')}</TableCell>
                      <TableCell>{log.vendedor_nome}</TableCell>
                      <TableCell className="font-mono">{log.codigo_venda || 'N/A'}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-orange-600">R$ {log.valor_desconto?.toFixed(2)}</p>
                          <p className="text-xs text-slate-500">{log.percentual_desconto?.toFixed(1)}%</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{log.autorizado_por}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="caixa">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Histórico de Caixas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Caixa</TableHead>
                    <TableHead>Abertura</TableHead>
                    <TableHead>Usuário Abertura</TableHead>
                    <TableHead>Fechamento</TableHead>
                    <TableHead>Usuário Fechamento</TableHead>
                    <TableHead>Diferença</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsCaixa.map((caixa) => (
                    <TableRow key={caixa.id}>
                      <TableCell className="font-bold">#{caixa.numero_caixa}</TableCell>
                      <TableCell className="text-xs">{format(new Date(caixa.data_abertura), 'dd/MM/yyyy HH:mm')}</TableCell>
                      <TableCell>{caixa.usuario_abertura}</TableCell>
                      <TableCell className="text-xs">{caixa.data_fechamento ? format(new Date(caixa.data_fechamento), 'dd/MM/yyyy HH:mm') : '-'}</TableCell>
                      <TableCell>{caixa.usuario_fechamento || '-'}</TableCell>
                      <TableCell>
                        {caixa.diferenca !== undefined && caixa.diferenca !== 0 ? (
                          <span className={`font-bold ${caixa.diferenca > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            R$ {caixa.diferenca?.toFixed(2)}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={caixa.status === 'aberto' ? 'default' : 'secondary'}>
                          {caixa.status}
                        </Badge>
                      </TableCell>
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