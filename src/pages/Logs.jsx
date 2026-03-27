import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Shield, DollarSign, X, RefreshCw, CreditCard, Lock, Unlock, Database, Package, Settings, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, isWithinInterval, parseISO, startOfMonth, startOfDay, endOfDay } from "date-fns";
import DateRangeFilter from "@/components/DateRangeFilter";

export default function Logs() {
  const hoje = new Date();
  const [filtro, setFiltro] = useState({
    dataInicio: format(startOfMonth(hoje), 'yyyy-MM-dd'),
    dataFim: format(hoje, 'yyyy-MM-dd')
  });
  const [paginaTab, setPaginaTab] = useState({ auditoria: 1, vendas: 1, estoque: 1, cancelamentos: 1, descontos: 1, caixa: 1, config: 1 });
  const ITENS_POR_PAGINA = 20;

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
        return await base44.entities.LogDesconto.list('-created_date', 200);
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

  const descontosFiltrados = logsDesconto.filter(log => filtrarPorData(log.created_date));
  const movimentacoesFiltradas = movimentacoesEstoque.filter(mov => filtrarPorData(mov.data_movimentacao));
  const vendasFiltradas = vendas.filter(v => v.status === 'finalizada' && filtrarPorData(v.data_venda || v.created_date));
  const logsConfiguracao = logsFiltrados.filter(l => l.recurso === 'Configuracao' || l.acao?.includes('config'));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Logs do Sistema</h1>
        <p className="text-slate-500">Auditoria completa de operações</p>
      </div>

      <DateRangeFilter onFilterChange={(f) => { setFiltro(f); setPaginaTab({ auditoria: 1, vendas: 1, estoque: 1, cancelamentos: 1, descontos: 1, caixa: 1, config: 1 }); }} />

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
                  {logsFiltrados.slice((paginaTab.auditoria - 1) * ITENS_POR_PAGINA, paginaTab.auditoria * ITENS_POR_PAGINA).map((log) => (
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
                  {logsFiltrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                        Nenhum log de auditoria neste período
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {Math.ceil(logsFiltrados.length / ITENS_POR_PAGINA) > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-sm text-slate-500">Mostrando {((paginaTab.auditoria - 1) * ITENS_POR_PAGINA) + 1}-{Math.min(paginaTab.auditoria * ITENS_POR_PAGINA, logsFiltrados.length)} de {logsFiltrados.length}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={paginaTab.auditoria <= 1} onClick={() => setPaginaTab(p => ({ ...p, auditoria: p.auditoria - 1 }))}><ChevronLeft className="w-4 h-4" /></Button>
                    <span className="text-sm font-medium px-2">{paginaTab.auditoria} / {Math.ceil(logsFiltrados.length / ITENS_POR_PAGINA)}</span>
                    <Button variant="outline" size="sm" disabled={paginaTab.auditoria >= Math.ceil(logsFiltrados.length / ITENS_POR_PAGINA)} onClick={() => setPaginaTab(p => ({ ...p, auditoria: p.auditoria + 1 }))}><ChevronRight className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}
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
                  {vendasFiltradas.filter(v => v.status === 'finalizada').slice((paginaTab.vendas - 1) * ITENS_POR_PAGINA, paginaTab.vendas * ITENS_POR_PAGINA).map((venda) => (
                    <TableRow key={venda.id}>
                      <TableCell className="font-mono text-xs">{venda.codigo_venda}</TableCell>
                      <TableCell className="text-xs">{venda.data_venda ? format(new Date(venda.data_venda), 'dd/MM/yyyy HH:mm') : format(new Date(venda.created_date), 'dd/MM/yyyy HH:mm')}</TableCell>
                      <TableCell className="text-sm">{venda.cliente_nome || 'N/A'}</TableCell>
                      <TableCell className="text-sm">{venda.vendedor_nome}</TableCell>
                      <TableCell className="font-semibold text-green-600">R$ {(parseFloat(venda.valor_total) || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-xs">
                        {venda.pagamentos?.map((p, i) => (
                          <Badge key={i} variant="outline" className="mr-1">
                            {p.forma_pagamento}
                          </Badge>
                        ))}
                      </TableCell>
                    </TableRow>
                  ))}
                  {vendasFiltradas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                        Nenhuma venda registrada neste período
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {Math.ceil(vendasFiltradas.filter(v => v.status === 'finalizada').length / ITENS_POR_PAGINA) > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-sm text-slate-500">Mostrando {((paginaTab.vendas - 1) * ITENS_POR_PAGINA) + 1}-{Math.min(paginaTab.vendas * ITENS_POR_PAGINA, vendasFiltradas.length)} de {vendasFiltradas.filter(v => v.status === 'finalizada').length}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={paginaTab.vendas <= 1} onClick={() => setPaginaTab(p => ({ ...p, vendas: p.vendas - 1 }))}><ChevronLeft className="w-4 h-4" /></Button>
                    <span className="text-sm font-medium px-2">{paginaTab.vendas} / {Math.ceil(vendasFiltradas.filter(v => v.status === 'finalizada').length / ITENS_POR_PAGINA)}</span>
                    <Button variant="outline" size="sm" disabled={paginaTab.vendas >= Math.ceil(vendasFiltradas.filter(v => v.status === 'finalizada').length / ITENS_POR_PAGINA)} onClick={() => setPaginaTab(p => ({ ...p, vendas: p.vendas + 1 }))}><ChevronRight className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}
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
                  {movimentacoesFiltradas.slice((paginaTab.estoque - 1) * ITENS_POR_PAGINA, paginaTab.estoque * ITENS_POR_PAGINA).map((mov) => (
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
                  {movimentacoesFiltradas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                        Nenhuma movimentação de estoque neste período
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {Math.ceil(movimentacoesFiltradas.length / ITENS_POR_PAGINA) > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-sm text-slate-500">Mostrando {((paginaTab.estoque - 1) * ITENS_POR_PAGINA) + 1}-{Math.min(paginaTab.estoque * ITENS_POR_PAGINA, movimentacoesFiltradas.length)} de {movimentacoesFiltradas.length}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={paginaTab.estoque <= 1} onClick={() => setPaginaTab(p => ({ ...p, estoque: p.estoque - 1 }))}><ChevronLeft className="w-4 h-4" /></Button>
                    <span className="text-sm font-medium px-2">{paginaTab.estoque} / {Math.ceil(movimentacoesFiltradas.length / ITENS_POR_PAGINA)}</span>
                    <Button variant="outline" size="sm" disabled={paginaTab.estoque >= Math.ceil(movimentacoesFiltradas.length / ITENS_POR_PAGINA)} onClick={() => setPaginaTab(p => ({ ...p, estoque: p.estoque + 1 }))}><ChevronRight className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}
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
                  {logsFiltrados.filter(l => l.recurso === 'Configuracao' || l.descricao?.includes('configurações') || l.acao?.includes('config')).slice((paginaTab.config - 1) * ITENS_POR_PAGINA, paginaTab.config * ITENS_POR_PAGINA).map((log) => (
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
                  {vendasCanceladas.slice((paginaTab.cancelamentos - 1) * ITENS_POR_PAGINA, paginaTab.cancelamentos * ITENS_POR_PAGINA).map((venda) => (
                    <TableRow key={venda.id}>
                      <TableCell className="font-mono">{venda.codigo_venda}</TableCell>
                      <TableCell className="text-xs">{format(new Date(venda.data_cancelamento), 'dd/MM/yyyy HH:mm')}</TableCell>
                      <TableCell>{venda.cancelada_por}</TableCell>
                      <TableCell className="font-semibold text-red-600">R$ {(parseFloat(venda.valor_total) || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-sm">{venda.motivo_cancelamento}</TableCell>
                    </TableRow>
                  ))}
                  {vendasCanceladas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                        Nenhuma venda cancelada neste período
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {Math.ceil(vendasCanceladas.length / ITENS_POR_PAGINA) > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-sm text-slate-500">Mostrando {((paginaTab.cancelamentos - 1) * ITENS_POR_PAGINA) + 1}-{Math.min(paginaTab.cancelamentos * ITENS_POR_PAGINA, vendasCanceladas.length)} de {vendasCanceladas.length}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={paginaTab.cancelamentos <= 1} onClick={() => setPaginaTab(p => ({ ...p, cancelamentos: p.cancelamentos - 1 }))}><ChevronLeft className="w-4 h-4" /></Button>
                    <span className="text-sm font-medium px-2">{paginaTab.cancelamentos} / {Math.ceil(vendasCanceladas.length / ITENS_POR_PAGINA)}</span>
                    <Button variant="outline" size="sm" disabled={paginaTab.cancelamentos >= Math.ceil(vendasCanceladas.length / ITENS_POR_PAGINA)} onClick={() => setPaginaTab(p => ({ ...p, cancelamentos: p.cancelamentos + 1 }))}><ChevronRight className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="descontos">
          <Card>
            <CardHeader>
              <CardTitle>Descontos Aplicados ({descontosFiltrados.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Venda</TableHead>
                    <TableHead>Desconto</TableHead>
                    <TableHead>Aprovador</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {descontosFiltrados.slice((paginaTab.descontos - 1) * ITENS_POR_PAGINA, paginaTab.descontos * ITENS_POR_PAGINA).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">{format(new Date(log.created_date), 'dd/MM/yyyy HH:mm')}</TableCell>
                      <TableCell>{log.usuario_nome}</TableCell>
                      <TableCell className="font-mono">{log.venda_id || 'N/A'}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-orange-600">R$ {(parseFloat(log.valor_desconto) || 0).toFixed(2)}</p>
                          <p className="text-xs text-slate-500">{(parseFloat(log.percentual_desconto) || 0).toFixed(1)}%</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.motivo?.includes('dentro do limite') ? (
                          <Badge variant="outline" className="text-xs">Dentro do limite</Badge>
                        ) : (
                          <span className="text-orange-600">{log.aprovador_nome}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {descontosFiltrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                        Nenhuma autorização de desconto registrada neste período
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {Math.ceil(descontosFiltrados.length / ITENS_POR_PAGINA) > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-sm text-slate-500">Mostrando {((paginaTab.descontos - 1) * ITENS_POR_PAGINA) + 1}-{Math.min(paginaTab.descontos * ITENS_POR_PAGINA, descontosFiltrados.length)} de {descontosFiltrados.length}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={paginaTab.descontos <= 1} onClick={() => setPaginaTab(p => ({ ...p, descontos: p.descontos - 1 }))}><ChevronLeft className="w-4 h-4" /></Button>
                    <span className="text-sm font-medium px-2">{paginaTab.descontos} / {Math.ceil(descontosFiltrados.length / ITENS_POR_PAGINA)}</span>
                    <Button variant="outline" size="sm" disabled={paginaTab.descontos >= Math.ceil(descontosFiltrados.length / ITENS_POR_PAGINA)} onClick={() => setPaginaTab(p => ({ ...p, descontos: p.descontos + 1 }))}><ChevronRight className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}
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
                  {logsCaixa.slice((paginaTab.caixa - 1) * ITENS_POR_PAGINA, paginaTab.caixa * ITENS_POR_PAGINA).map((caixa) => (
                    <TableRow key={caixa.id}>
                      <TableCell className="font-bold">#{caixa.numero_caixa}</TableCell>
                      <TableCell className="text-xs">{format(new Date(caixa.data_abertura), 'dd/MM/yyyy HH:mm')}</TableCell>
                      <TableCell>{caixa.usuario_abertura}</TableCell>
                      <TableCell className="text-xs">{caixa.data_fechamento ? format(new Date(caixa.data_fechamento), 'dd/MM/yyyy HH:mm') : '-'}</TableCell>
                      <TableCell>{caixa.usuario_fechamento || '-'}</TableCell>
                      <TableCell>
                        {caixa.diferenca !== undefined && caixa.diferenca !== null && Number(caixa.diferenca) !== 0 ? (
                          <span className={`font-bold ${Number(caixa.diferenca) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            R$ {(parseFloat(caixa.diferenca) || 0).toFixed(2)}
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
                  {logsCaixa.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                        Nenhum registro de caixa neste período
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {Math.ceil(logsCaixa.length / ITENS_POR_PAGINA) > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-sm text-slate-500">Mostrando {((paginaTab.caixa - 1) * ITENS_POR_PAGINA) + 1}-{Math.min(paginaTab.caixa * ITENS_POR_PAGINA, logsCaixa.length)} de {logsCaixa.length}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={paginaTab.caixa <= 1} onClick={() => setPaginaTab(p => ({ ...p, caixa: p.caixa - 1 }))}><ChevronLeft className="w-4 h-4" /></Button>
                    <span className="text-sm font-medium px-2">{paginaTab.caixa} / {Math.ceil(logsCaixa.length / ITENS_POR_PAGINA)}</span>
                    <Button variant="outline" size="sm" disabled={paginaTab.caixa >= Math.ceil(logsCaixa.length / ITENS_POR_PAGINA)} onClick={() => setPaginaTab(p => ({ ...p, caixa: p.caixa + 1 }))}><ChevronRight className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>
    </div>
  );
}