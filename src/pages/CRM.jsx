import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Phone, Mail, Calendar, TrendingUp, Users, Target, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const CORES_STATUS = {
  novo: "bg-blue-100 text-blue-700 border-blue-300",
  contato_inicial: "bg-yellow-100 text-yellow-700 border-yellow-300",
  qualificado: "bg-purple-100 text-purple-700 border-purple-300",
  proposta: "bg-indigo-100 text-indigo-700 border-indigo-300",
  negociacao: "bg-orange-100 text-orange-700 border-orange-300",
  ganho: "bg-green-100 text-green-700 border-green-300",
  perdido: "bg-red-100 text-red-700 border-red-300"
};

const LABELS_STATUS = {
  novo: "Novo Lead",
  contato_inicial: "Contato Inicial",
  qualificado: "Qualificado",
  proposta: "Proposta Enviada",
  negociacao: "Em Negociação",
  ganho: "Fechado/Ganho",
  perdido: "Perdido"
};

export default function CRM() {
  const [dialogLead, setDialogLead] = useState(false);
  const [dialogDetalhes, setDialogDetalhes] = useState(false);
  const [leadSelecionado, setLeadSelecionado] = useState(null);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    empresa: "",
    cargo: "",
    origem: "site",
    status_funil: "novo",
    valor_potencial: 0,
    probabilidade: 20,
    notas: "",
    tags: []
  });

  const queryClient = useQueryClient();

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.LeadCRM.list('-created_date'),
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LeadCRM.create({
      ...data,
      data_primeiro_contato: new Date().toISOString(),
      responsavel: user?.full_name,
      responsavel_id: user?.id,
      historico: [{
        data: new Date().toISOString(),
        acao: "criacao",
        descricao: "Lead criado no sistema",
        usuario: user?.full_name
      }]
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success("Lead cadastrado!");
      setDialogLead(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LeadCRM.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success("Lead atualizado!");
    }
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      email: "",
      telefone: "",
      empresa: "",
      cargo: "",
      origem: "site",
      status_funil: "novo",
      valor_potencial: 0,
      probabilidade: 20,
      notas: "",
      tags: []
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const moverLead = (lead, novoStatus) => {
    const probabilidades = {
      novo: 10,
      contato_inicial: 20,
      qualificado: 40,
      proposta: 60,
      negociacao: 80,
      ganho: 100,
      perdido: 0
    };

    // CORREÇÃO: Garantir que historico é um array válido antes de spread
    const historicoAtual = Array.isArray(lead.historico) ? lead.historico : [];

    updateMutation.mutate({
      id: lead.id,
      data: {
        ...lead,
        status_funil: novoStatus,
        probabilidade: probabilidades[novoStatus],
        historico: [
          ...historicoAtual,
          {
            data: new Date().toISOString(),
            acao: "mudanca_status",
            descricao: `Status alterado para: ${LABELS_STATUS[novoStatus]}`,
            usuario: user?.full_name || "Sistema"
          }
        ]
      }
    });
  };

  const leadsAtivos = leads.filter(l => !['ganho', 'perdido'].includes(l.status_funil));
  const leadsFechados = leads.filter(l => l.status_funil === 'ganho');
  const leadsPerdidos = leads.filter(l => l.status_funil === 'perdido');

  // CRÍTICO: Cálculo com parse seguro
  const valorPipeline = leadsAtivos.reduce((sum, l) => sum + (parseFloat(l.valor_potencial) || 0), 0);
  const valorPonderado = leadsAtivos.reduce((sum, l) => sum + ((parseFloat(l.valor_potencial) || 0) * (parseInt(l.probabilidade) || 0) / 100), 0);
  const taxaConversao = leads.length > 0 ? (leadsFechados.length / leads.length) * 100 : 0;

  const agruparPorStatus = (status) => {
    return leads.filter(l => l.status_funil === status);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6" />
            CRM & Funil de Vendas
          </h1>
          <p className="text-slate-500">Gerencie seus leads e oportunidades</p>
        </div>
        <Button onClick={() => setDialogLead(true)} className="bg-blue-600">
          <Plus className="w-4 h-4 mr-2" />
          Novo Lead
        </Button>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h3 className="font-semibold text-blue-900 mb-2">📊 Como funciona o Funil de Vendas:</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="font-semibold text-blue-800">1. Novo Lead</p>
              <p className="text-blue-600 text-xs">Lead acabou de entrar (10% chance)</p>
            </div>
            <div>
              <p className="font-semibold text-yellow-800">2. Contato Inicial</p>
              <p className="text-yellow-600 text-xs">Primeiro contato feito (20%)</p>
            </div>
            <div>
              <p className="font-semibold text-purple-800">3. Qualificado</p>
              <p className="text-purple-600 text-xs">Lead tem potencial (40%)</p>
            </div>
            <div>
              <p className="font-semibold text-indigo-800">4. Proposta</p>
              <p className="text-indigo-600 text-xs">Orçamento enviado (60%)</p>
            </div>
            <div>
              <p className="font-semibold text-orange-800">5. Negociação</p>
              <p className="text-orange-600 text-xs">Negociando valores (80%)</p>
            </div>
            <div>
              <p className="font-semibold text-green-800">6. Ganho ✅</p>
              <p className="text-green-600 text-xs">Venda fechada! (100%)</p>
            </div>
            <div>
              <p className="font-semibold text-red-800">7. Perdido ❌</p>
              <p className="text-red-600 text-xs">Não converteu (0%)</p>
            </div>
            <div className="col-span-full border-t border-blue-300 pt-2 mt-1">
              <p className="text-xs text-blue-700">
                💡 <strong>Dica:</strong> Clique em um card de lead para ver detalhes e mover entre as etapas do funil
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Leads Ativos</p>
                <p className="text-2xl font-bold">{leadsAtivos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Pipeline</p>
                <p className="text-2xl font-bold">R$ {valorPipeline.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Fechados</p>
                <p className="text-2xl font-bold">{leadsFechados.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Taxa Conversão</p>
                <p className="text-2xl font-bold">{taxaConversao.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {Object.keys(LABELS_STATUS).map(status => {
          const leadsStatus = agruparPorStatus(status);
          // CORREÇÃO: Usar parseFloat para evitar NaN em valores string
          const valorTotal = leadsStatus.reduce((sum, l) => sum + (parseFloat(l.valor_potencial) || 0), 0);
          
          return (
            <Card key={status} className={`${CORES_STATUS[status]} border-2`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  {LABELS_STATUS[status]}
                </CardTitle>
                <div className="flex items-center justify-between mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {leadsStatus.length}
                  </Badge>
                  <span className="text-xs font-semibold">
                    R$ {valorTotal.toFixed(0)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {leadsStatus.map(lead => (
                  <Card 
                    key={lead.id} 
                    className="p-3 cursor-pointer hover:shadow-md transition-all bg-white"
                    onClick={() => {
                      setLeadSelecionado(lead);
                      setDialogDetalhes(true);
                    }}
                  >
                    <h4 className="font-semibold text-sm mb-1">{lead.nome}</h4>
                    <p className="text-xs text-slate-500 mb-2">{lead.empresa}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-green-600">
                        R$ {(parseFloat(lead.valor_potencial) || 0).toFixed(0)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {lead.probabilidade}%
                      </Badge>
                    </div>
                  </Card>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogLead} onOpenChange={setDialogLead}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome Completo *</Label>
                <Input 
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label>Telefone *</Label>
                <Input 
                  value={formData.telefone}
                  onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <Label>Empresa</Label>
                <Input 
                  value={formData.empresa}
                  onChange={(e) => setFormData({...formData, empresa: e.target.value})}
                />
              </div>
              <div>
                <Label>Cargo</Label>
                <Input 
                  value={formData.cargo}
                  onChange={(e) => setFormData({...formData, cargo: e.target.value})}
                />
              </div>
              <div>
                <Label>Origem</Label>
                <Select value={formData.origem} onValueChange={(v) => setFormData({...formData, origem: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="site">Site</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="indicacao">Indicação</SelectItem>
                    <SelectItem value="evento">Evento</SelectItem>
                    <SelectItem value="cold_call">Cold Call</SelectItem>
                    <SelectItem value="redes_sociais">Redes Sociais</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor Potencial</Label>
                <Input 
                  type="number"
                  value={formData.valor_potencial}
                  onChange={(e) => setFormData({...formData, valor_potencial: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label>Probabilidade (%)</Label>
                <Input 
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probabilidade}
                  onChange={(e) => setFormData({...formData, probabilidade: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="col-span-2">
                <Label>Notas</Label>
                <Textarea 
                  value={formData.notas}
                  onChange={(e) => setFormData({...formData, notas: e.target.value})}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogLead(false)}>
                Cancelar
              </Button>
              <Button type="submit">Cadastrar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogDetalhes} onOpenChange={setDialogDetalhes}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{leadSelecionado?.nome}</DialogTitle>
          </DialogHeader>
          {leadSelecionado && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-500">Telefone</Label>
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {leadSelecionado.telefone}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Email</Label>
                  <p className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {leadSelecionado.email || '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Empresa</Label>
                  <p>{leadSelecionado.empresa || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Cargo</Label>
                  <p>{leadSelecionado.cargo || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Valor Potencial</Label>
                  <p className="font-bold text-green-600">R$ {(leadSelecionado.valor_potencial || 0).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Probabilidade</Label>
                  <p>{leadSelecionado.probabilidade}%</p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-slate-500 mb-2 block">Mover para:</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(LABELS_STATUS).map(status => (
                    <Button
                      key={status}
                      size="sm"
                      variant={leadSelecionado.status_funil === status ? "default" : "outline"}
                      onClick={() => moverLead(leadSelecionado, status)}
                    >
                      {LABELS_STATUS[status]}
                    </Button>
                  ))}
                </div>
              </div>

              {leadSelecionado.historico && leadSelecionado.historico.length > 0 && (
                <div>
                  <Label className="text-xs text-slate-500 mb-2 block">Histórico</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {leadSelecionado.historico.map((h, idx) => (
                      <div key={idx} className="border-l-2 border-blue-500 pl-3 py-1">
                        <p className="text-sm font-semibold">{h.descricao}</p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(h.data), 'dd/MM/yyyy HH:mm')} • {h.usuario}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}