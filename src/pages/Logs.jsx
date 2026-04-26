import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useLoja } from "@/contexts/LojaContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Shield, DollarSign, X, RefreshCw, Lock, Package, Settings, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, isWithinInterval, parseISO, startOfMonth, startOfDay, endOfDay } from "date-fns";
import DateRangeFilter from "@/components/DateRangeFilter";

export default function Logs() {
  const { lojaFiltroId } = useLoja();
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

  // ── log_auditoria: busca SEM filtro loja_id (tabela não tem essa coluna)
  const { data: logs = [], refetch: refetchLogs } = useQuery({
    queryKey: ['logs-auditoria'],
    queryFn: async () => {
      try {
        return await base44.entities.LogAuditoria.list('-created_date', 500);
      } catch {
        return [];
      }
    },
    staleTime: 60 * 1000,
  });

  // ── Vendas
  const { data: vendas = [] } = useQuery({
    queryKey: ['vendas-logs', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.Venda.filter({ loja_id: lojaFiltroId }, { order: '-created_date', limit: 300 })
      : base44.entities.Venda.list('-created_date', 300),
    staleTime: 60 * 1000,
  });

  // ── Caixas
  const { data: caixas = [] } = useQuery({
    queryKey: ['caixas-logs', lojaFiltroId],
    queryFn: () => lojaFiltroId
      ? base44.entities.Caixa.filter({ loja_id: lojaFiltroId }, { order: '-created_date' })
      : base44.entities.Caixa.list('-created_date'),
    staleTime: 60 * 1000,
  });

  const numeroCaixaMap = React.useMemo(() => {
    const sorted = [...caixas].sort(
      (a, b) => new Date(a.created_date || a.data_abertura) - new Date(b.created_date || b.data_abertura)
    );
    const map = {};
    sorted.forEach((c, idx) => { map[c.id] = idx + 1; });
    return map;
  }, [caixas]);

  // ── Filtros por data ──────────────────────────────────────────────
  const dataRef = (log) => log.data_hora || log.created_date;

  const logsFiltrados    = logs.filter(log => filtrarPorData(dataRef(log)));
  const vendasFiltradas  = vendas.filter(v => v.status === 'finalizada' && filtrarPorData(v.data_venda || v.created_date));
  const canceladasFiltradas = vendas.filter(v => v.status === 'cancelada' && filtrarPorData(v.data_cancelamento || v.created_date));
  const logsCaixa        = caixas.filter(c => filtrarPorData(c.data_abertura));

  // Estoque: log_auditoria onde tabela='produto' e estoque mudou
  const movimentacoesEstoque = logsFiltrados.filter(l => {
    if (l.tabela !== 'produto') return false;
    const ant = l.dados_anteriores;
    const nov = l.dados_novos;
    if (!ant || !nov) return false;
    return ant.estoque !== undefined && nov.estoque !== undefined && ant.estoque !== nov.estoque;
  });

  // Descontos: log_auditoria com acao 'desconto' OU vendas com desconto > 0
  const logsDesconto = logsFiltrados.filter(l =>
    (l.acao || '').toLowerCase().includes('desconto') ||
    (l.tabela || '').toLowerCase().includes('desconto')
  );
  // Complementa com vendas que têm desconto
  const vendasComDesconto = vendasFiltradas.filter(v =>
    (parseFloat(v.desconto_percentual) > 0 || parseFloat(v.desconto_valor) > 0)
  );

  // Config: log_auditoria onde tabela='configuracao'
  const logsConfig = logsFiltrados.filter(l =>
    (l.tabela || '').toLowerCase().includes('configurac') ||
    (l.acao || '').toLowerCase().includes('config')
  );

  // ── Helpers de exibição ────────────────────────────────────────────
  const formatData = (d) => {
    try { return d ? format(new Date(d), 'dd/MM/yyyy HH:mm') : '—'; } catch { return '—'; }
  };

  const corAcao = (acao = '') => {
    const a = acao.toLowerCase();
    if (a.includes('delet') || a.includes('cancel') || a.includes('exclu')) return 'destructive';
    if (a.includes('creat') || a.includes('cria') || a.includes('insert')) return 'default';
    return 'secondary';
  };

  const labelAcao = (acao = '') => acao.replace(/_/g, ' ');

  const descricaoLog = (log) => {
    const nov = log.dados_novos;
    const ant = log.dados_anteriores;
    if (!nov && !ant) return '—';
    const campos = Object.keys(nov || ant || {})
      .filter(k => !['id','created_date','updated_date','created_by_id'].includes(k))
      .slice(0, 4)
      .map(k => {
        const vAnt = ant?.[k];
        const vNov = nov?.[k];
        if (vAnt !== undefined && vNov !== undefined && String(vAnt) !== String(vNov)) {
          return `${k}: ${String(vAnt).slice(0,20)} → ${String(vNov).slice(0,20)}`;
        }
        return `${k}: ${String(vNov ?? vAnt ?? '').slice(0,30)}`;
      });
    return campos.join(' | ') || '—';
  };

  const paginado = (arr, tab) => arr.slice((paginaTab[tab] - 1) * ITENS_POR_PAGINA, paginaTab[tab] * ITENS_POR_PAGINA);
  const totalPag = (arr) => Math.ceil(arr.length / ITENS_POR_PAGINA);

  const Paginacao = ({ arr, tab }) => totalPag(arr) <= 1 ? null : (
    <div className="flex items-center justify-between mt-4 pt-4 border-t">
      <span className="text-sm text-slate-500">
        {((paginaTab[tab] - 1) * ITENS_POR_PAGINA) + 1}–{Math.min(paginaTab[tab] * ITENS_POR_PAGINA, arr.length)} de {arr.length}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={paginaTab[tab] <= 1} onClick={() => setPaginaTab(p => ({ ...p, [tab]: p[tab] - 1 }))}><ChevronLeft className="w-4 h-4" /></Button>
        <span className="text-sm font-medium px-2">{paginaTab[tab]}/{totalPag(arr)}</span>
        <Button variant="outline" size="sm" disabled={paginaTab[tab] >= totalPag(arr)} onClick={() => setPaginaTab(p => ({ ...p, [tab]: p[tab] + 1 }))}><ChevronRight className="w-4 h-4" /></Button>
      </div>
    </div>
  );

  const Vazio = ({ cols, msg }) => (
    <TableRow>
      <TableCell colSpan={cols} className="text-center text-slate-500 py-8">{msg}</TableCell>
    </TableRow>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Logs do Sistema</h1>
          <p className="text-slate-500">Auditoria completa de operações</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchLogs()}>
          <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
        </Button>
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

        {/* ── GERAL ── */}
        <TabsContent value="auditoria">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" /> Auditoria Geral ({logsFiltrados.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Tabela</TableHead>
                    <TableHead>Alterações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginado(logsFiltrados, 'auditoria').map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs whitespace-nowrap">{formatData(dataRef(log))}</TableCell>
                      <TableCell className="font-medium">{log.created_by || 'Sistema'}</TableCell>
                      <TableCell><Badge variant={corAcao(log.acao)}>{labelAcao(log.acao)}</Badge></TableCell>
                      <TableCell className="text-sm text-slate-600">{log.tabela?.replace(/_/g,' ')}</TableCell>
                      <TableCell className="text-xs text-slate-500 max-w-xs truncate">{descricaoLog(log)}</TableCell>
                    </TableRow>
                  ))}
                  {logsFiltrados.length === 0 && <Vazio cols={5} msg="Nenhum log de auditoria neste período" />}
                </TableBody>
              </Table>
              <Paginacao arr={logsFiltrados} tab="auditoria" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── VENDAS ── */}
        <TabsContent value="vendas">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-green-600" /> Log de Vendas ({vendasFiltradas.length})
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
                  {paginado(vendasFiltradas, 'vendas').map((venda) => (
                    <TableRow key={venda.id}>
                      <TableCell className="font-mono text-xs">{venda.codigo_venda}</TableCell>
                      <TableCell className="text-xs">{formatData(venda.data_venda || venda.created_date)}</TableCell>
                      <TableCell className="text-sm">{venda.cliente_nome || 'N/A'}</TableCell>
                      <TableCell className="text-sm">{venda.vendedor_nome}</TableCell>
                      <TableCell className="font-semibold text-green-600">R$ {(parseFloat(venda.valor_total) || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-xs">
                        {venda.pagamentos?.map((p, i) => (
                          <Badge key={i} variant="outline" className="mr-1">{p.forma_pagamento}</Badge>
                        ))}
                      </TableCell>
                    </TableRow>
                  ))}
                  {vendasFiltradas.length === 0 && <Vazio cols={6} msg="Nenhuma venda registrada neste período" />}
                </TableBody>
              </Table>
              <Paginacao arr={vendasFiltradas} tab="vendas" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ESTOQUE ── */}
        <TabsContent value="estoque">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" /> Movimentações de Estoque ({movimentacoesEstoque.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Estoque Ant.</TableHead>
                    <TableHead>Estoque Novo</TableHead>
                    <TableHead>Diferença</TableHead>
                    <TableHead>Responsável</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginado(movimentacoesEstoque, 'estoque').map((log) => {
                    const ant = parseFloat(log.dados_anteriores?.estoque ?? 0);
                    const nov = parseFloat(log.dados_novos?.estoque ?? 0);
                    const diff = nov - ant;
                    const nomeProduto = log.dados_novos?.nome || log.dados_anteriores?.nome || log.registro_id;
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs">{formatData(dataRef(log))}</TableCell>
                        <TableCell className="text-sm font-medium">{nomeProduto}</TableCell>
                        <TableCell className="text-slate-600">{ant}</TableCell>
                        <TableCell className="font-bold">{nov}</TableCell>
                        <TableCell>
                          <span className={`font-bold ${diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {diff > 0 ? '+' : ''}{diff}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{log.created_by || 'Sistema'}</TableCell>
                      </TableRow>
                    );
                  })}
                  {movimentacoesEstoque.length === 0 && <Vazio cols={6} msg="Nenhuma movimentação de estoque neste período" />}
                </TableBody>
              </Table>
              <Paginacao arr={movimentacoesEstoque} tab="estoque" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CANCELAMENTOS ── */}
        <TabsContent value="cancelamentos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <X className="w-5 h-5 text-red-600" /> Vendas Canceladas ({canceladasFiltradas.length})
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
                  {paginado(canceladasFiltradas, 'cancelamentos').map((venda) => (
                    <TableRow key={venda.id}>
                      <TableCell className="font-mono">{venda.codigo_venda}</TableCell>
                      <TableCell className="text-xs">{formatData(venda.data_cancelamento || venda.created_date)}</TableCell>
                      <TableCell>{venda.cancelada_por || venda.vendedor_nome || '—'}</TableCell>
                      <TableCell className="font-semibold text-red-600">R$ {(parseFloat(venda.valor_total) || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-sm">{venda.motivo_cancelamento || '—'}</TableCell>
                    </TableRow>
                  ))}
                  {canceladasFiltradas.length === 0 && <Vazio cols={5} msg="Nenhuma venda cancelada neste período" />}
                </TableBody>
              </Table>
              <Paginacao arr={canceladasFiltradas} tab="cancelamentos" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── DESCONTOS ── */}
        <TabsContent value="descontos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-orange-500" />
                Descontos ({logsDesconto.length + vendasComDesconto.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logs de desconto do log_auditoria */}
              {logsDesconto.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-2">📋 Autorizações registradas no log</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead>Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logsDesconto.slice(0, 50).map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs">{formatData(dataRef(log))}</TableCell>
                          <TableCell>{log.created_by || 'Sistema'}</TableCell>
                          <TableCell><Badge variant="outline">{labelAcao(log.acao)}</Badge></TableCell>
                          <TableCell className="text-xs text-slate-500">{descricaoLog(log)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Vendas com desconto */}
              <div>
                <p className="text-sm font-medium text-slate-600 mb-2">💰 Vendas com desconto no período ({vendasComDesconto.length})</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Valor Original</TableHead>
                      <TableHead>Desconto</TableHead>
                      <TableHead>Valor Final</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginado(vendasComDesconto, 'descontos').map((v) => {
                      const descPerc = parseFloat(v.desconto_percentual) || 0;
                      const descVal  = parseFloat(v.desconto_valor) || 0;
                      const total    = parseFloat(v.valor_total) || 0;
                      return (
                        <TableRow key={v.id}>
                          <TableCell className="font-mono text-xs">{v.codigo_venda}</TableCell>
                          <TableCell className="text-xs">{formatData(v.data_venda || v.created_date)}</TableCell>
                          <TableCell>{v.vendedor_nome}</TableCell>
                          <TableCell className="text-slate-500">R$ {(total + descVal).toFixed(2)}</TableCell>
                          <TableCell>
                            <span className="font-bold text-orange-600">
                              {descPerc > 0 ? `${descPerc.toFixed(1)}%` : ''} {descVal > 0 ? `(R$ ${descVal.toFixed(2)})` : ''}
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold text-green-700">R$ {total.toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                    {vendasComDesconto.length === 0 && <Vazio cols={6} msg="Nenhuma venda com desconto neste período" />}
                  </TableBody>
                </Table>
                <Paginacao arr={vendasComDesconto} tab="descontos" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CAIXA ── */}
        <TabsContent value="caixa">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" /> Histórico de Caixas ({logsCaixa.length})
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
                  {paginado(logsCaixa, 'caixa').map((caixa) => (
                    <TableRow key={caixa.id}>
                      <TableCell className="font-bold">#{numeroCaixaMap[caixa.id] || caixa.numero_caixa}</TableCell>
                      <TableCell className="text-xs">{formatData(caixa.data_abertura)}</TableCell>
                      <TableCell>{caixa.usuario_abertura}</TableCell>
                      <TableCell className="text-xs">{caixa.data_fechamento ? formatData(caixa.data_fechamento) : '—'}</TableCell>
                      <TableCell>{caixa.usuario_fechamento || '—'}</TableCell>
                      <TableCell>
                        {caixa.diferenca != null && Number(caixa.diferenca) !== 0 ? (
                          <span className={`font-bold ${Number(caixa.diferenca) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            R$ {(parseFloat(caixa.diferenca)).toFixed(2)}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={caixa.status === 'aberto' ? 'default' : 'secondary'}>{caixa.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {logsCaixa.length === 0 && <Vazio cols={7} msg="Nenhum registro de caixa neste período" />}
                </TableBody>
              </Table>
              <Paginacao arr={logsCaixa} tab="caixa" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CONFIG ── */}
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-600" />
                Alterações de Configuração ({logsConfig.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Tabela</TableHead>
                    <TableHead>Alterações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginado(logsConfig, 'config').map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">{formatData(dataRef(log))}</TableCell>
                      <TableCell>{log.created_by || 'Sistema'}</TableCell>
                      <TableCell><Badge variant="outline">{labelAcao(log.acao)}</Badge></TableCell>
                      <TableCell className="text-sm text-slate-600">{log.tabela?.replace(/_/g,' ')}</TableCell>
                      <TableCell className="text-xs text-slate-500 max-w-xs truncate">{descricaoLog(log)}</TableCell>
                    </TableRow>
                  ))}
                  {logsConfig.length === 0 && <Vazio cols={5} msg="Nenhuma alteração de configuração neste período" />}
                </TableBody>
              </Table>
              <Paginacao arr={logsConfig} tab="config" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}