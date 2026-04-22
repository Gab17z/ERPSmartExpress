import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Target, Search, Plus, Trash2, UserCircle, Award, TrendingUp, Star, Zap, Medal, Smartphone } from "lucide-react";
import { format } from "date-fns";
import DateRangeFilter from "@/components/DateRangeFilter";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import MetasAprimorado from "./MetasAprimorado";

export default function Metas() {
  const { user } = useAuth();
  const isAdmin = user?.cargo?.nome?.toLowerCase() === 'administrador' || 
                 (typeof user?.cargo === 'string' && user?.cargo?.toLowerCase() === 'administrador') || 
                 user?.permissoes?.administrador_sistema === true;
  const [dialogMetas, setDialogMetas] = useState(false);
  const [buscaProduto, setBuscaProduto] = useState("");
  const [vendedorAudit, setVendedorAudit] = useState("todos");
  
  const [metasConfig, setMetasConfig] = useState({
    vendas_loja: 50000,
    os_loja: 100,
    ticket_medio: 500,
    novos_clientes: 20,
    iphone_novo: 5,
    iphone_seminovo: 10,
    android: 15,
    metas_extra: [],
    recompensas: {
      vendas_loja: 200,
      os_loja: 150,
      ticket_medio: 100,
      novos_clientes: 50,
      iphone_novo: 100,
      iphone_seminovo: 80,
      android: 60,
      pelicula_hidro: 20
    },
    individuais: {}
  });

  React.useEffect(() => {
    try {
      const metasSalvas = localStorage.getItem('metas_sistema');
      if (metasSalvas) {
        const parsed = JSON.parse(metasSalvas);
        setMetasConfig({
          vendas_loja: Math.max(1, parsed.vendas_loja || 50000),
          os_loja: Math.max(1, parsed.os_loja || 100),
          ticket_medio: Math.max(1, parsed.ticket_medio || 500),
          novos_clientes: Math.max(1, parsed.novos_clientes || 20),
          iphone_novo: Math.max(0, parsed.iphone_novo || 5),
          iphone_seminovo: Math.max(0, parsed.iphone_seminovo || 10),
          android: Math.max(0, parsed.android || 15),
          metas_extra: parsed.metas_extra || [],
          recompensas: {
            vendas_loja: parseFloat(parsed.recompensas?.vendas_loja) || 0,
            os_loja: parseFloat(parsed.recompensas?.os_loja) || 0,
            ticket_medio: parseFloat(parsed.recompensas?.ticket_medio) || 0,
            novos_clientes: parseFloat(parsed.recompensas?.novos_clientes) || 0,
            iphone_novo: parseFloat(parsed.recompensas?.iphone_novo) || 0,
            iphone_seminovo: parseFloat(parsed.recompensas?.iphone_seminovo) || 0,
            android: parseFloat(parsed.recompensas?.android) || 0,
            pelicula_hidro: parseFloat(parsed.recompensas?.pelicula_hidro) || 0
          },
          individuais: parsed.individuais || {}
        });
      }
    } catch (error) {
      console.error("Erro ao carregar metas:", error);
    }
  }, [dialogMetas]);

  const { data: usuariosSistema = [] } = useQuery({
    queryKey: ['usuarios-sistema'],
    queryFn: () => base44.entities.UsuarioSistema.list(),
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos-metas'],
    queryFn: () => base44.entities.Produto.list('nome'),
  });

  const salvarMetas = () => {
    localStorage.setItem('metas_sistema', JSON.stringify(metasConfig));
    toast.success("Metas atualizadas!");
    setDialogMetas(false);
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };
  
  const hoje = new Date();
  const [filtro, setFiltro] = useState({
    dataInicio: format(hoje, 'yyyy-MM-dd'),
    dataFim: format(hoje, 'yyyy-MM-dd')
  });

  const adicionarMetaExtra = () => {
    const novaMeta = {
      id: crypto.randomUUID(),
      nome: "Nova Meta",
      objetivo: 10,
      recompensa: 20,
      produto_ids: []
    };
    setMetasConfig(prev => ({
      ...prev,
      metas_extra: [...(prev.metas_extra || []), novaMeta]
    }));
  };

  const removerMetaExtra = (id) => {
    setMetasConfig(prev => ({
      ...prev,
      metas_extra: prev.metas_extra.filter(m => m.id !== id)
    }));
  };

  const atualizarMetaExtra = (id, campo, valor) => {
    setMetasConfig(prev => ({
      ...prev,
      metas_extra: prev.metas_extra.map(m => m.id === id ? { ...m, [campo]: valor } : m)
    }));
  };

  return (
    <div className="p-4 space-y-6 bg-slate-50 min-h-screen">
      {/* Header com Filtros de Auditoria */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Performance & Metas</h1>
          <p className="text-slate-500 text-sm">Visualize e gerencie a performance do mês atual</p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 text-slate-600">
              <UserCircle className="w-5 h-5 text-blue-600" />
              <Label className="text-xs font-bold uppercase tracking-wider">Auditar Funcionário:</Label>
            </div>
            <Select value={vendedorAudit} onValueChange={setVendedorAudit}>
              <SelectTrigger className="w-[200px] h-9 bg-white border-slate-300">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos (Visão Loja)</SelectItem>
                <Separator className="my-1" />
                {usuariosSistema.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome} ({u.cargo?.nome || 'Vendedor'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-2">
          <DateRangeFilter
            onFilterChange={setFiltro}
          />
          {isAdmin && (
            <Button onClick={() => setDialogMetas(true)} className="bg-blue-600 hover:bg-blue-700">
              <Target className="w-4 h-4 mr-2" />
              Configurar Metas
            </Button>
          )}
        </div>
      </div>

      <MetasAprimorado 
        vendedorOverride={vendedorAudit === 'todos' ? null : vendedorAudit} 
        filtro={filtro}
      />

      {/* Dialogs */}
      <Dialog open={dialogMetas} onOpenChange={setDialogMetas}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">
          <DialogHeader className="p-6 bg-slate-900 text-white rounded-t-xl">
            <DialogTitle className="text-xl flex items-center gap-2">
               <Target className="w-6 h-6 text-blue-400" />
               Configurações de Metas e Premiações
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="gerais" className="w-full flex-1 flex flex-col overflow-hidden">
            <div className="px-6 py-2 bg-slate-900 border-t border-slate-800">
              <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 p-1 text-slate-400">
                <TabsTrigger value="gerais" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">Gerais</TabsTrigger>
                <TabsTrigger value="aparelhos" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">Aparelhos</TabsTrigger>
                <TabsTrigger value="extra" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">Extras</TabsTrigger>
                <TabsTrigger value="recompensas" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">Bônus</TabsTrigger>
              </TabsList>
            </div>
            
            <ScrollArea className="flex-1 p-6">
              <TabsContent value="gerais" className="mt-0 space-y-8 pb-4">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" /> Metas Globais da Loja
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-600">Faturamento Alvo (R$)</Label>
                      <Input
                        type="number"
                        className="bg-white border-slate-200"
                        value={metasConfig.vendas_loja}
                        onChange={(e) => setMetasConfig({...metasConfig, vendas_loja: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-600">Volume de OS (Qtd)</Label>
                      <Input
                        type="number"
                        className="bg-white border-slate-200"
                        value={metasConfig.os_loja}
                        onChange={(e) => setMetasConfig({...metasConfig, os_loja: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-600">Ticket Médio (R$)</Label>
                      <Input
                        type="number"
                        className="bg-white border-slate-200"
                        value={metasConfig.ticket_medio}
                        onChange={(e) => setMetasConfig({...metasConfig, ticket_medio: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-600">Novos Clientes (Qtd)</Label>
                      <Input
                        type="number"
                        className="bg-white border-slate-200"
                        value={metasConfig.novos_clientes}
                        onChange={(e) => setMetasConfig({...metasConfig, novos_clientes: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                </div>
                
                {usuariosSistema && usuariosSistema.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-600" /> Metas Individuais (Vendedores)
                    </h3>
                    <div className="space-y-3">
                      {usuariosSistema.map(u => (
                        <div key={u.user_id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:border-blue-200 transition-colors">
                          <div className="md:col-span-5">
                            <p className="font-bold text-slate-900">{u.user_nome || u.nome || u.id}</p>
                            <p className="text-[10px] text-blue-600 font-semibold uppercase">{u.cargo_nome}</p>
                          </div>
                          <div className="md:col-span-4 flex items-center gap-2">
                            <Label className="text-[10px] whitespace-nowrap text-slate-500 w-12 text-right">Vendas R$</Label>
                            <Input 
                              type="number"
                              className="h-8 text-xs border-slate-200"
                              value={metasConfig.individuais?.[u.user_id]?.vendas || ''}
                              onChange={(e) => setMetasConfig({
                                ...metasConfig,
                                individuais: {
                                  ...(metasConfig.individuais || {}),
                                  [u.user_id]: { ...(metasConfig.individuais?.[u.user_id] || {}), vendas: parseFloat(e.target.value) || 0 }
                                }
                              })}
                            />
                          </div>
                          <div className="md:col-span-3 flex items-center gap-2">
                            <Label className="text-[10px] whitespace-nowrap text-slate-500 w-10 text-right">OS Qtd</Label>
                            <Input 
                              type="number"
                              className="h-8 text-xs border-slate-200"
                              value={metasConfig.individuais?.[u.user_id]?.os || ''}
                              onChange={(e) => setMetasConfig({
                                ...metasConfig,
                                individuais: {
                                  ...(metasConfig.individuais || {}),
                                  [u.user_id]: { ...(metasConfig.individuais?.[u.user_id] || {}), os: parseInt(e.target.value) || 0 }
                                }
                              })}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="aparelhos" className="mt-0 space-y-6 pb-4">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-3">
                   <Smartphone className="w-8 h-8 text-blue-600" />
                   <div>
                     <h3 className="font-bold text-blue-900">Metas de Dispositivos</h3>
                     <p className="text-xs text-blue-700">Defina a quantidade de aparelhos que cada vendedor deve atingir no mês.</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3 p-4 border rounded-xl bg-white shadow-sm">
                    <Label className="text-xs font-bold text-slate-800">iPhones Novos</Label>
                    <Input
                      type="number"
                      value={metasConfig.iphone_novo}
                      onChange={(e) => setMetasConfig({...metasConfig, iphone_novo: parseInt(e.target.value) || 0})}
                      className="border-slate-200"
                    />
                  </div>
                  <div className="space-y-3 p-4 border rounded-xl bg-white shadow-sm">
                    <Label className="text-xs font-bold text-slate-800">iPhones Seminovo</Label>
                    <Input
                      type="number"
                      value={metasConfig.iphone_seminovo}
                      onChange={(e) => setMetasConfig({...metasConfig, iphone_seminovo: parseInt(e.target.value) || 0})}
                      className="border-slate-200"
                    />
                  </div>
                  <div className="space-y-3 p-4 border rounded-xl bg-white shadow-sm">
                    <Label className="text-xs font-bold text-slate-800">Androids</Label>
                    <Input
                      type="number"
                      value={metasConfig.android}
                      onChange={(e) => setMetasConfig({...metasConfig, android: parseInt(e.target.value) || 0})}
                      className="border-slate-200"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="extra" className="mt-0 space-y-6 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-orange-500" />
                    <h3 className="font-bold text-slate-800 uppercase tracking-wider text-sm">Metas de Produtos Específicos</h3>
                  </div>
                  <Button size="sm" onClick={adicionarMetaExtra} className="bg-slate-900 hover:bg-slate-800 h-8 gap-2">
                     <Plus className="w-4 h-4" /> Nova Meta
                  </Button>
                </div>

                <div className="space-y-4">
                  {(metasConfig.metas_extra || []).map((meta) => (
                    <div key={meta.id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm relative group hover:border-orange-200 transition-all">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-4 right-4 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full h-8 w-8"
                        onClick={() => removerMetaExtra(meta.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-700">Nome da Campanha</Label>
                            <Input 
                              value={meta.nome} 
                              onChange={(e) => atualizarMetaExtra(meta.id, 'nome', e.target.value)}
                              placeholder="Ex: Meta Peliculas Hidro"
                              className="font-semibold"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-bold text-slate-700">Objetivo (Qtd)</Label>
                              <Input 
                                type="number" 
                                value={meta.objetivo} 
                                onChange={(e) => atualizarMetaExtra(meta.id, 'objetivo', parseInt(e.target.value) || 0)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold text-slate-700">Prêmio (R$)</Label>
                              <Input 
                                type="number" 
                                value={meta.recompensa} 
                                onChange={(e) => atualizarMetaExtra(meta.id, 'recompensa', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                             <span>Vincular Produtos</span>
                             <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{meta.produto_ids?.length || 0} selecionados</span>
                          </Label>
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-3 w-3 text-slate-400" />
                            <Input 
                              placeholder="Pesquisar catálogo..." 
                              className="h-8 pl-7 text-[10px]" 
                              onChange={(e) => setBuscaProduto(e.target.value)}
                            />
                          </div>
                          <div className="h-32 bg-slate-50 border rounded-xl p-3 overflow-y-auto overflow-x-hidden scrollbar-thin">
                            <div className="grid grid-cols-1 gap-1">
                              {produtos
                                .filter(p => !buscaProduto || p.nome.toLowerCase().includes(buscaProduto.toLowerCase()) || p.sku?.includes(buscaProduto))
                                .map(p => (
                                <div key={p.id} className="flex items-center gap-2 p-1.5 hover:bg-white hover:shadow-sm transition-all rounded-lg border border-transparent hover:border-slate-100">
                                  <Checkbox 
                                    id={`check-${meta.id}-${p.id}`}
                                    checked={meta.produto_ids?.includes(p.id)}
                                    onCheckedChange={(checked) => {
                                      const ids = meta.produto_ids || [];
                                      const novosIds = checked ? [...ids, p.id] : ids.filter(id => id !== p.id);
                                      atualizarMetaExtra(meta.id, 'produto_ids', novosIds);
                                    }}
                                  />
                                  <label htmlFor={`check-${meta.id}-${p.id}`} className="text-[10px] font-medium text-slate-700 truncate cursor-pointer flex-1">
                                    {p.nome}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {metasConfig.metas_extra?.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-3xl border-slate-200 bg-slate-50/50">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                         <Zap className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-slate-500 font-medium">Nenhuma meta dinâmica cadastrada.</p>
                      <Button variant="ghost" size="sm" onClick={adicionarMetaExtra} className="mt-2 text-blue-600 hover:text-blue-700">
                        Crie sua primeira meta extra agora
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="recompensas" className="mt-0 space-y-8 pb-4">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Medal className="w-4 h-4 text-green-600" /> Premiações Globais (Bônus Fixo)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Qtd Vendas Batida (R$)</Label>
                      <Input type="number" className="h-9" value={metasConfig.recompensas?.vendas_loja || 0} onChange={(e) => setMetasConfig({...metasConfig, recompensas: {...metasConfig.recompensas, vendas_loja: parseFloat(e.target.value)}})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Qtd OS Batida (R$)</Label>
                      <Input type="number" className="h-9" value={metasConfig.recompensas?.os_loja || 0} onChange={(e) => setMetasConfig({...metasConfig, recompensas: {...metasConfig.recompensas, os_loja: parseFloat(e.target.value)}})} />
                    </div>
                    <div className="space-y-2 border-t pt-4">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Ticket Médio Alto (R$)</Label>
                      <Input type="number" className="h-9" value={metasConfig.recompensas?.ticket_medio || 0} onChange={(e) => setMetasConfig({...metasConfig, recompensas: {...metasConfig.recompensas, ticket_medio: parseFloat(e.target.value)}})} />
                    </div>
                    <div className="space-y-2 border-t pt-4">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Novos Clientes (R$)</Label>
                      <Input type="number" className="h-9" value={metasConfig.recompensas?.novos_clientes || 0} onChange={(e) => setMetasConfig({...metasConfig, recompensas: {...metasConfig.recompensas, novos_clientes: parseFloat(e.target.value)}})} />
                    </div>
                    <div className="space-y-2 border-t pt-4">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">iPhones Novos (R$)</Label>
                      <Input type="number" className="h-9" value={metasConfig.recompensas?.iphone_novo || 0} onChange={(e) => setMetasConfig({...metasConfig, recompensas: {...metasConfig.recompensas, iphone_novo: parseFloat(e.target.value)}})} />
                    </div>
                    <div className="space-y-2 border-t pt-4">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">iPhones Seminovos (R$)</Label>
                      <Input type="number" className="h-9" value={metasConfig.recompensas?.iphone_seminovo || 0} onChange={(e) => setMetasConfig({...metasConfig, recompensas: {...metasConfig.recompensas, iphone_seminovo: parseFloat(e.target.value)}})} />
                    </div>
                    <div className="md:col-span-2 space-y-2 border-t pt-4">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Celulares Android (R$)</Label>
                      <Input type="number" className="h-9" value={metasConfig.recompensas?.android || 0} onChange={(e) => setMetasConfig({...metasConfig, recompensas: {...metasConfig.recompensas, android: parseFloat(e.target.value)}})} />
                    </div>
                  </div>
                </div>

                {metasConfig.metas_extra?.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                       <Award className="w-4 h-4 text-orange-500" /> Bônus de Campanhas Dinâmicas
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {metasConfig.metas_extra.map(meta => (
                        <div key={meta.id} className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100 flex items-center justify-between shadow-sm">
                           <div>
                             <p className="text-xs font-bold text-slate-700">{meta.nome}</p>
                             <p className="text-[10px] text-orange-600 font-semibold">PRÊMIO DA META</p>
                           </div>
                           <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400 font-bold">R$</span>
                              <Input 
                                type="number" 
                                className="w-24 h-8 bg-white border-orange-200"
                                value={meta.recompensa} 
                                onChange={(e) => atualizarMetaExtra(meta.id, 'recompensa', parseFloat(e.target.value) || 0)} 
                              />
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>

            <div className="p-6 bg-slate-50 border-t flex justify-end gap-3 rounded-b-xl">
              <Button type="button" variant="outline" onClick={() => setDialogMetas(false)}>
                Cancelar
              </Button>
              <Button type="button" className="bg-blue-600 hover:bg-blue-700 min-w-[120px]" onClick={salvarMetas}>
                Salvar Alterações
              </Button>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}