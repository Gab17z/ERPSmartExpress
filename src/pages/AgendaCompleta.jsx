import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, User, Package, Bell, Plus, Trash2, Edit, CheckCircle, Filter, Settings, ChevronsUpDown, Check } from "lucide-react";
import { toast } from "sonner";
import { format, isToday, isTomorrow, isAfter, startOfDay, addDays } from "date-fns";
import { useConfirm } from '@/contexts/ConfirmContext';

export default function AgendaCompleta() {
  const confirm = useConfirm();

  const [dialogEvento, setDialogEvento] = useState(false);
  const [eventoSelecionado, setEventoSelecionado] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [buscaTexto, setBuscaTexto] = useState("");
  const [formData, setFormData] = useState({
    titulo: "",
    tipo: "lembrete",
    descricao: "",
    data: format(new Date(), 'yyyy-MM-dd'),
    hora: "09:00"
  });

  // Estados para gerenciar tipos de evento
  const [dialogTipos, setDialogTipos] = useState(false);
  const [novoTipo, setNovoTipo] = useState({ nome: "", cor: "#3b82f6" });

  // Estados para o dropdown de tipo de evento com criação inline
  const [tipoEventoOpen, setTipoEventoOpen] = useState(false);
  const [buscaTipo, setBuscaTipo] = useState("");
  const [mostrarNovoTipoInline, setMostrarNovoTipoInline] = useState(false);
  const [novoTipoInline, setNovoTipoInline] = useState({ nome: "", cor: "#3b82f6" });

  // Estado para confirmação de exclusão de tipo
  const [tipoParaExcluir, setTipoParaExcluir] = useState(null);

  const queryClient = useQueryClient();

  const { data: eventos = [] } = useQuery({
    queryKey: ['eventos'],
    queryFn: async () => {
      try {
        return await base44.entities.Evento.list('-data_inicio');
      } catch {
        return [];
      }
    },
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('nome_completo'),
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios-sistema'],
    queryFn: async () => {
      try {
        return await base44.entities.UsuarioSistema.list();
      } catch {
        return [];
      }
    },
  });

  // CORREÇÃO: Buscar tipos de evento do banco
  const { data: tiposEvento = [] } = useQuery({
    queryKey: ['tipos-evento'],
    queryFn: async () => {
      try {
        return await base44.entities.TipoEvento.list('nome');
      } catch {
        return [
          { id: '1', nome: 'Técnico', icone: 'user', cor: '#3b82f6' },
          { id: '2', nome: 'Entrega', icone: 'package', cor: '#10b981' },
          { id: '3', nome: 'Compromisso', icone: 'calendar', cor: '#8b5cf6' },
          { id: '4', nome: 'Lembrete', icone: 'bell', cor: '#f59e0b' }
        ];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Evento.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
      toast.success("Evento criado!");
      setDialogEvento(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Evento.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
      toast.success("Evento atualizado!");
      setDialogEvento(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Evento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
      toast.success("Evento excluído!");
    },
  });

  // Mutations para tipos de evento
  const criarTipoMutation = useMutation({
    mutationFn: (data) => {
      // Remover _fromInline antes de enviar para o banco
      const { _fromInline, ...dadosBanco } = data;
      return base44.entities.TipoEvento.create(dadosBanco);
    },
    onSuccess: (novoTipoCriado, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tipos-evento'] });
      toast.success("Tipo de evento criado!");
      setNovoTipo({ nome: "", cor: "#3b82f6" });
      // Se foi criado pelo dropdown inline, selecionar automaticamente
      if (variables._fromInline) {
        const tipoKey = variables.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        setFormData({ ...formData, tipo: tipoKey });
        setMostrarNovoTipoInline(false);
        setNovoTipoInline({ nome: "", cor: "#3b82f6" });
        setTipoEventoOpen(false);
      }
    },
    onError: () => {
      toast.error("Erro ao criar tipo de evento");
    }
  });

  const deletarTipoMutation = useMutation({
    mutationFn: (id) => base44.entities.TipoEvento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-evento'] });
      toast.success("Tipo de evento excluido!");
    },
    onError: () => {
      toast.error("Erro ao excluir tipo de evento");
    }
  });

  const handleCriarTipo = () => {
    if (!novoTipo.nome.trim()) {
      toast.error("Digite o nome do tipo!");
      return;
    }
    criarTipoMutation.mutate({
      nome: novoTipo.nome.trim(),
      cor: novoTipo.cor,
      ativo: true
    });
  };

  const handleCriarTipoInline = () => {
    if (!novoTipoInline.nome.trim()) {
      toast.error("Digite o nome do tipo!");
      return;
    }
    criarTipoMutation.mutate({
      nome: novoTipoInline.nome.trim(),
      cor: novoTipoInline.cor,
      ativo: true,
      _fromInline: true
    });
  };

  const resetForm = () => {
    setFormData({
      titulo: "",
      tipo: "lembrete",
      descricao: "",
      data: format(new Date(), 'yyyy-MM-dd'),
      hora: "09:00"
    });
    setEventoSelecionado(null);
    // Reset estados do dropdown inline
    setTipoEventoOpen(false);
    setBuscaTipo("");
    setMostrarNovoTipoInline(false);
    setNovoTipoInline({ nome: "", cor: "#3b82f6" });
  };

  const handleSubmit = () => {
    // CRÍTICO: Validações completas
    if (!formData.titulo || !formData.titulo.trim()) {
      toast.error("Digite o título do evento!");
      return;
    }

    if (!formData.data || !formData.hora) {
      toast.error("Preencha data e hora!");
      return;
    }

    // Montar dados para enviar ao banco
    const dadosEvento = {
      titulo: formData.titulo,
      descricao: formData.descricao,
      tipo: formData.tipo,
      data_inicio: `${formData.data}T${formData.hora}:00`,
      cliente_id: formData.cliente_id || null,
      cliente_nome: formData.cliente_nome || null,
      usuario_id: formData.tecnico_id || null
    };

    if (eventoSelecionado) {
      updateMutation.mutate({ id: eventoSelecionado.id, data: dadosEvento });
    } else {
      createMutation.mutate(dadosEvento);
    }
  };

  const editarEvento = (evento) => {
    setEventoSelecionado(evento);
    // Converter data_inicio do banco para data + hora do formulário
    let data = format(new Date(), 'yyyy-MM-dd');
    let hora = "09:00";
    if (evento.data_inicio) {
      const dt = new Date(evento.data_inicio);
      data = format(dt, 'yyyy-MM-dd');
      hora = format(dt, 'HH:mm');
    }
    setFormData({
      ...evento,
      data,
      hora,
      tecnico_id: evento.usuario_id
    });
    setDialogEvento(true);
  };

  const marcarComoRealizado = (evento) => {
    // Nota: A tabela evento não tem campo status
    // Podemos usar o campo lembrete ou criar uma lógica diferente
    updateMutation.mutate({
      id: evento.id,
      data: { lembrete: false }
    });
    toast.info("Evento marcado como concluído");
  };

  // CORREÇÃO: Mapear ícones para componentes
  const iconMap = {
    user: User,
    package: Package,
    calendar: Calendar,
    bell: Bell,
    'users': User,
    'map-pin': Calendar
  };

  // Configuração de tipos de evento dinâmica
  const tipoConfig = tiposEvento.reduce((acc, tipo) => {
    const tipoKey = tipo.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    acc[tipoKey] = {
      icon: iconMap[tipo.icone] || Calendar,
      color: tipo.cor || '#3b82f6',
      label: tipo.nome
    };
    return acc;
  }, {
    // Fallback para tipos padrão
    tecnico: { icon: User, color: '#3b82f6', label: 'Técnico' },
    entrega: { icon: Package, color: '#10b981', label: 'Entrega' },
    compromisso: { icon: Calendar, color: '#8b5cf6', label: 'Compromisso' },
    lembrete: { icon: Bell, color: '#f59e0b', label: 'Lembrete' }
  });

  // Helper para extrair hora de data_inicio
  const getHora = (dataInicio) => {
    if (!dataInicio) return '';
    try {
      return format(new Date(dataInicio), 'HH:mm');
    } catch {
      return '';
    }
  };

  // Helper para verificar status baseado em lembrete
  const getStatus = (evento) => {
    return evento.lembrete === false ? 'realizado' : 'agendado';
  };

  // Aplicar filtros
  const eventosFiltrados = eventos.filter(e => {
    const matchTipo = filtroTipo === "todos" || e.tipo === filtroTipo;
    // Usar lembrete como indicador de status (lembrete=true = pendente, lembrete=false = concluído)
    const matchStatus = filtroStatus === "todos" ||
      (filtroStatus === "agendado" && e.lembrete !== false) ||
      (filtroStatus === "realizado" && e.lembrete === false);
    const matchBusca = !buscaTexto ||
      e.titulo?.toLowerCase().includes(buscaTexto.toLowerCase()) ||
      e.descricao?.toLowerCase().includes(buscaTexto.toLowerCase()) ||
      e.cliente_nome?.toLowerCase().includes(buscaTexto.toLowerCase());

    return matchTipo && matchStatus && matchBusca;
  });

  // CORREÇÃO: Usar data_inicio para comparações de datas
  const eventosHoje = eventosFiltrados.filter(e => {
    if (!e.data_inicio) return false;
    try {
      return isToday(new Date(e.data_inicio));
    } catch {
      return false;
    }
  });
  const eventosAmanha = eventosFiltrados.filter(e => {
    if (!e.data_inicio) return false;
    try {
      return isTomorrow(new Date(e.data_inicio));
    } catch {
      return false;
    }
  });
  const eventosFuturos = eventosFiltrados.filter(e => {
    if (!e.data_inicio) return false;
    try {
      const dataEvento = startOfDay(new Date(e.data_inicio));
      const hoje = startOfDay(new Date());
      return !isToday(dataEvento) && !isTomorrow(dataEvento) && isAfter(dataEvento, hoje);
    } catch {
      return false;
    }
  });
  const lembretes = eventosFiltrados.filter(e => e.tipo === 'lembrete');

  const filtrarPorTipo = (tipo) => {
    setFiltroTipo(tipo);
    setFiltroStatus("agendado"); // Mostrar apenas agendados quando filtrar por tipo específico
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Agenda da Loja</h1>
          <p className="text-slate-500">Gerencie compromissos, entregas e lembretes</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setDialogTipos(true)} variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Gerenciar Tipos
          </Button>
          <Button onClick={() => { resetForm(); setDialogEvento(true); }} className="bg-blue-600">
            <Plus className="w-4 h-4 mr-2" />
            Novo Evento
          </Button>
        </div>
      </div>

      {/* Cards Atalho Rápido */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          className="border-l-4 border-l-blue-500 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => filtrarPorTipo('tecnico')}
        >
          <CardContent className="p-4">
            <User className="w-8 h-8 text-blue-500 mb-2" />
            <p className="text-sm text-slate-500">Agenda Técnicos</p>
            <p className="text-2xl font-bold">{eventos.filter(e => e.tipo === 'tecnico' && e.lembrete !== false).length}</p>
          </CardContent>
        </Card>

        <Card
          className="border-l-4 border-l-green-500 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => filtrarPorTipo('entrega')}
        >
          <CardContent className="p-4">
            <Package className="w-8 h-8 text-green-500 mb-2" />
            <p className="text-sm text-slate-500">Entregas</p>
            <p className="text-2xl font-bold">{eventos.filter(e => e.tipo === 'entrega' && e.lembrete !== false).length}</p>
          </CardContent>
        </Card>

        <Card
          className="border-l-4 border-l-purple-500 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => filtrarPorTipo('compromisso')}
        >
          <CardContent className="p-4">
            <Calendar className="w-8 h-8 text-purple-500 mb-2" />
            <p className="text-sm text-slate-500">Compromissos</p>
            <p className="text-2xl font-bold">{eventos.filter(e => e.tipo === 'compromisso' && e.lembrete !== false).length}</p>
          </CardContent>
        </Card>

        <Card
          className="border-l-4 border-l-orange-500 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => filtrarPorTipo('lembrete')}
        >
          <CardContent className="p-4">
            <Bell className="w-8 h-8 text-orange-500 mb-2" />
            <p className="text-sm text-slate-500">Lembretes</p>
            <p className="text-2xl font-bold">{eventos.filter(e => e.tipo === 'lembrete' && e.lembrete !== false).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="w-5 h-5 text-slate-400" />

            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Buscar evento, cliente ou técnico..."
                value={buscaTexto}
                onChange={(e) => setBuscaTexto(e.target.value)}
              />
            </div>

            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Tipos</SelectItem>
                {tiposEvento.filter(t => t.ativo !== false).map(tipo => (
                  <SelectItem key={tipo.id} value={tipo.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}>
                    {tipo.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Status</SelectItem>
                <SelectItem value="agendado">Agendados</SelectItem>
                <SelectItem value="realizado">Realizados</SelectItem>
                <SelectItem value="cancelado">Cancelados</SelectItem>
              </SelectContent>
            </Select>

            {(filtroTipo !== "todos" || filtroStatus !== "todos" || buscaTexto) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFiltroTipo("todos");
                  setFiltroStatus("todos");
                  setBuscaTexto("");
                }}
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="hoje">
        <TabsList>
          <TabsTrigger value="hoje">Hoje ({eventosHoje.length})</TabsTrigger>
          <TabsTrigger value="amanha">Amanhã ({eventosAmanha.length})</TabsTrigger>
          <TabsTrigger value="futuros">Próximos ({eventosFuturos.length})</TabsTrigger>
          <TabsTrigger value="lembretes">Lembretes ({lembretes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="hoje">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Hoje - {format(new Date(), 'dd/MM/yyyy')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {eventosHoje.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Nenhum evento hoje</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {eventosHoje.map((evento) => {
                    const config = tipoConfig[evento.tipo];
                    const Icon = config.icon;

                    return (
                      <div key={evento.id} className={`p-4 border-l-4 border-l-${config.color}-500 bg-${config.color}-50 rounded-lg`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`w-10 h-10 bg-${config.color}-500 rounded-lg flex items-center justify-center flex-shrink-0`}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold">{evento.titulo}</p>
                                <Badge variant="outline" className="text-xs">{config.label}</Badge>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Clock className="w-4 h-4" />
                                <span>{getHora(evento.data_inicio)}</span>
                                {evento.cliente_nome && <span>• {evento.cliente_nome}</span>}
                              </div>
                              {evento.descricao && (
                                <p className="text-sm text-slate-600 mt-1">{evento.descricao}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant={getStatus(evento) === 'agendado' ? 'default' : 'secondary'}>
                              {getStatus(evento)}
                            </Badge>
                            {getStatus(evento) === 'agendado' && (
                              <Button size="sm" variant="outline" onClick={() => marcarComoRealizado(evento)}>
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => editarEvento(evento)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={async () => {
                              const resposta = await confirm({
                                title: "Excluir Evento",
                                description: "Excluir evento?",
                                confirmText: "Sim, Excluir",
                                cancelText: "Cancelar",
                                type: "confirm"
                              });

                              if (resposta) {
                                deleteMutation.mutate(evento.id);
                              }
                            }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="amanha">
          <Card>
            <CardHeader>
              {/* CORREÇÃO: Usar addDays em vez de milliseconds para evitar problemas de DST */}
              <CardTitle>Amanhã - {format(addDays(new Date(), 1), 'dd/MM/yyyy')}</CardTitle>
            </CardHeader>
            <CardContent>
              {eventosAmanha.length === 0 ? (
                <div className="text-center py-8 text-slate-500">Nenhum evento amanhã</div>
              ) : (
                <div className="space-y-2">
                  {eventosAmanha.map((evento) => {
                    const config = tipoConfig[evento.tipo];
                    const Icon = config.icon;

                    return (
                      <div key={evento.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                        <div className="flex items-center gap-3">
                          <Icon className={`w-5 h-5 text-${config.color}-500`} />
                          <div>
                            <p className="font-semibold text-sm">{evento.titulo}</p>
                            <p className="text-xs text-slate-500">{getHora(evento.data_inicio)} • {config.label}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => editarEvento(evento)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={async () => {
                            const resposta = await confirm({
                              title: "Excluir Evento",
                              description: "Tem certeza que deseja excluir este evento?",
                              confirmText: "Sim, Excluir",
                              cancelText: "Cancelar",
                              type: "confirm"
                            });
                            if (resposta) {
                              deleteMutation.mutate(evento.id);
                            }
                          }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="futuros">
          <Card>
            <CardHeader>
              <CardTitle>Próximos Eventos</CardTitle>
            </CardHeader>
            <CardContent>
              {eventosFuturos.length === 0 ? (
                <div className="text-center py-8 text-slate-500">Nenhum evento futuro</div>
              ) : (
                <div className="space-y-2">
                  {eventosFuturos.map((evento) => {
                    const config = tipoConfig[evento.tipo];
                    const Icon = config.icon;

                    return (
                      <div key={evento.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                        <div className="flex items-center gap-3">
                          <Icon className={`w-5 h-5 text-${config.color}-500`} />
                          <div>
                            <p className="font-semibold text-sm">{evento.titulo}</p>
                            <p className="text-xs text-slate-500">
                              {evento.data_inicio && format(new Date(evento.data_inicio), 'dd/MM/yyyy')} • {getHora(evento.data_inicio)} • {config.label}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => editarEvento(evento)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={async () => {
                            const resposta = await confirm({
                              title: "Excluir Evento",
                              description: "Tem certeza que deseja excluir este evento?",
                              confirmText: "Sim, Excluir",
                              cancelText: "Cancelar",
                              type: "confirm"
                            });
                            if (resposta) {
                              deleteMutation.mutate(evento.id);
                            }
                          }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lembretes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-orange-500" />
                Todos os Lembretes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lembretes.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Nenhum lembrete cadastrado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lembretes.map((evento) => (
                    <div key={evento.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-orange-500" />
                        <div>
                          <p className="font-semibold text-sm">{evento.titulo}</p>
                          <p className="text-xs text-slate-500">
                            {evento.data_inicio && format(new Date(evento.data_inicio), 'dd/MM/yyyy')} • {getHora(evento.data_inicio)}
                          </p>
                          {evento.descricao && <p className="text-xs text-slate-600 mt-1">{evento.descricao}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        <Badge variant={getStatus(evento) === 'agendado' ? 'default' : 'secondary'}>
                          {getStatus(evento)}
                        </Badge>
                        {getStatus(evento) === 'agendado' && (
                          <Button size="sm" variant="outline" onClick={() => marcarComoRealizado(evento)}>
                            <CheckCircle className="w-3 h-3" />
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => editarEvento(evento)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={async () => {
                          const resposta = await confirm({
                            title: "Excluir Evento",
                            description: "Tem certeza que deseja excluir este evento?",
                            confirmText: "Sim, Excluir",
                            cancelText: "Cancelar",
                            type: "confirm"
                          });
                          if (resposta) {
                            deleteMutation.mutate(evento.id);
                          }
                        }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Evento */}
      <Dialog open={dialogEvento} onOpenChange={setDialogEvento}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{eventoSelecionado ? "Editar Evento" : "Novo Evento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ex: Manutenção iPhone 12"
              />
            </div>

            <div>
              <Label>Tipo de Evento *</Label>
              <Popover open={tipoEventoOpen} onOpenChange={(open) => {
                setTipoEventoOpen(open);
                if (!open) {
                  setBuscaTipo("");
                  setMostrarNovoTipoInline(false);
                }
              }}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={tipoEventoOpen}
                    className="w-full justify-between font-normal"
                  >
                    {formData.tipo
                      ? tiposEvento.find(t => t.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === formData.tipo)?.nome || formData.tipo
                      : "Selecione o tipo..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[350px] p-0">
                  <Command>
                    <CommandInput
                      placeholder="Buscar tipo de evento..."
                      value={buscaTipo}
                      onValueChange={setBuscaTipo}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <div className="py-2 text-center">
                          <p className="text-sm text-slate-500">Nenhum tipo encontrado</p>
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {tiposEvento
                          .filter(t => t.ativo !== false)
                          .filter(t => !buscaTipo || t.nome.toLowerCase().includes(buscaTipo.toLowerCase()))
                          .map((tipo) => {
                            const tipoKey = tipo.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                            return (
                              <CommandItem
                                key={tipo.id}
                                value={tipo.nome}
                                onSelect={() => {
                                  setFormData({ ...formData, tipo: tipoKey });
                                  setTipoEventoOpen(false);
                                  setBuscaTipo("");
                                }}
                                className="flex items-center justify-between group"
                              >
                                <div className="flex items-center">
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.tipo === tipoKey ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div
                                    className="w-3 h-3 rounded-full mr-2"
                                    style={{ backgroundColor: tipo.cor || '#3b82f6' }}
                                  />
                                  {tipo.nome}
                                </div>
                                <button
                                  type="button"
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTipoParaExcluir(tipo);
                                  }}
                                >
                                  <Trash2 className="w-3 h-3 text-red-500" />
                                </button>
                              </CommandItem>
                            );
                          })}
                      </CommandGroup>
                    </CommandList>

                    {/* Seção para adicionar novo tipo */}
                    <div className="border-t p-2">
                      {!mostrarNovoTipoInline ? (
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => setMostrarNovoTipoInline(true)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar novo tipo
                        </Button>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Nome do tipo..."
                              value={novoTipoInline.nome}
                              onChange={(e) => setNovoTipoInline({ ...novoTipoInline, nome: e.target.value })}
                              className="flex-1 h-9"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleCriarTipoInline();
                                }
                              }}
                            />
                            <input
                              type="color"
                              value={novoTipoInline.cor}
                              onChange={(e) => setNovoTipoInline({ ...novoTipoInline, cor: e.target.value })}
                              className="w-9 h-9 rounded cursor-pointer border"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => {
                                setMostrarNovoTipoInline(false);
                                setNovoTipoInline({ nome: "", cor: "#3b82f6" });
                              }}
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1 bg-blue-600"
                              onClick={handleCriarTipoInline}
                              disabled={criarTipoMutation.isPending}
                            >
                              {criarTipoMutation.isPending ? "Criando..." : "Criar"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {formData.tipo === 'tecnico' && (
              <div>
                <Label>Técnico</Label>
                <Select
                  value={formData.tecnico_id}
                  onValueChange={(v) => {
                    const usuario = usuarios.find(u => u.id === v);
                    setFormData({ ...formData, tecnico_id: v, tecnico_nome: usuario?.user_nome });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o técnico" />
                  </SelectTrigger>
                  <SelectContent>
                    {usuarios.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.user_nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.tipo === 'entrega' && (
              <div>
                <Label>Cliente</Label>
                <Select
                  value={formData.cliente_id}
                  onValueChange={(v) => {
                    const cliente = clientes.find(c => c.id === v);
                    setFormData({ ...formData, cliente_id: v, cliente_nome: cliente?.nome_completo });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                />
              </div>
              <div>
                <Label>Hora *</Label>
                <Input
                  type="time"
                  value={formData.hora}
                  onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                rows={3}
                placeholder="Detalhes do evento..."
              />
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogEvento(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className="bg-blue-600">
              {eventoSelecionado ? "Atualizar" : "Criar"} Evento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Gerenciar Tipos de Evento */}
      <Dialog open={dialogTipos} onOpenChange={setDialogTipos}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              Gerenciar Tipos de Evento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Lista de tipos existentes */}
            <div className="space-y-2">
              <Label>Tipos Cadastrados</Label>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {tiposEvento.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">Nenhum tipo cadastrado</p>
                ) : (
                  tiposEvento.map((tipo) => (
                    <div key={tipo.id} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: tipo.cor || '#3b82f6' }}
                        />
                        <span className="font-medium">{tipo.nome}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setTipoParaExcluir(tipo)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Formulario para criar novo tipo */}
            <div className="border-t pt-4 space-y-3">
              <Label>Criar Novo Tipo</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Nome do tipo..."
                  value={novoTipo.nome}
                  onChange={(e) => setNovoTipo({ ...novoTipo, nome: e.target.value })}
                  className="flex-1"
                />
                <input
                  type="color"
                  value={novoTipo.cor}
                  onChange={(e) => setNovoTipo({ ...novoTipo, cor: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border"
                />
              </div>
              <Button
                onClick={handleCriarTipo}
                className="w-full bg-blue-600"
                disabled={criarTipoMutation.isPending}
              >
                <Plus className="w-4 h-4 mr-2" />
                {criarTipoMutation.isPending ? "Criando..." : "Criar Tipo"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogTipos(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão de Tipo */}
      <Dialog open={!!tipoParaExcluir} onOpenChange={(open) => !open && setTipoParaExcluir(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="sr-only">
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Excluir Tipo de Evento</h3>
              <p className="text-sm text-slate-500 mt-1">
                Tem certeza que deseja excluir o tipo
              </p>
              {tipoParaExcluir && (
                <div className="flex items-center justify-center gap-2 mt-3 p-2 bg-slate-50 rounded-lg">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: tipoParaExcluir.cor || '#3b82f6' }}
                  />
                  <span className="font-semibold">{tipoParaExcluir.nome}</span>
                </div>
              )}
              <p className="text-xs text-slate-400 mt-2">
                Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setTipoParaExcluir(null)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={() => {
                  if (tipoParaExcluir) {
                    deletarTipoMutation.mutate(tipoParaExcluir.id);
                    setTipoParaExcluir(null);
                  }
                }}
                disabled={deletarTipoMutation.isPending}
              >
                {deletarTipoMutation.isPending ? "Excluindo..." : "Excluir"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}